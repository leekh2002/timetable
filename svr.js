const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const static = require('serve-static');
const dbconfig = require('./config/dbconfig.json');
const { time } = require('console');

const pool = mysql.createPool({
  connectionLimit: 10,
  host: dbconfig.host,
  user: dbconfig.user,
  password: dbconfig.password,
  database: dbconfig.database,
  multipleStatements: true,
  debug: false,
});
    
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', static(path.join(__dirname, 'public')));
let distances;
let distance = {};
app.get('/categoryanddeptfromdb', async (req, res) => {
  console.log('categoryanddeptfromdb호출');

  const queryDatabase = () => {
    return new Promise((resolve, reject) => {
      pool.getConnection((err, conn) => {
        if (err) {
          reject(err);
        }
        const exec = conn.query(
          `select a.name as start, b.name as end ,distance.time
          from distance, (select distinct bid, name from lectroom) as a, (select distinct bid, name from lectroom) as b
          where a.bid=distance.start and b.bid=distance.end
          order by a.name;`,
          (err, rows) => {
            conn.release();
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
          }
        );
      });
    });
  };
  try {
    distances = await queryDatabase();
    for (let i = 0; i < distances.length; ) {
      let end_dict = {};
      let j;
      for (j = i; j < distances.length; j++) {
        end_dict[distances[j].end] = distances[j].time;
        if (
          j == distances.length - 1 ||
          distances[j].start != distances[j + 1].start
        ) {
          break;
        }
      }
      distance[distances[i].start] = end_dict;
      i += j - i + 1;
    }
  } catch (err) {
    console.log('SQL 실행시 오류발생');
    console.dir(err);
  }
  pool.getConnection((err, conn) => {
    if (err) {
      conn.release();
      console.log('Mysql getConnection error. aborted');
      res.json('<h1>db server 연결실패</h1>');
      return;
    }

    console.log('데이터베이스 연결');

    const sql1 = `
    DROP TEMPORARY TABLE IF EXISTS temp_major;
    DROP TEMPORARY TABLE IF EXISTS temp_major2;
    DROP TEMPORARY TABLE IF EXISTS temp_major3;
    create temporary table temp_major
    select es.major1
    from
    (
      select distinct substring_index(substring_index(major, " ", numbers.n), " " , 10) as major1
          from(
              select 1 as n union all
              select 2 union all
              select 3 union all
              select 4 union all
              select 5 union all
              select 6 union all
              select 7 union all
              select 8 union all
              select 9 union all
              select 10) as numbers
              right outer join lecture
              on char_length(major) - char_length(replace(major, " ", "")) >= numbers.n - 1
              order by major1
    ) as es;
    `;
    const sql2 =
      'create temporary table temp_major2 as select * from temp_major;';
    const sql3 =
      'create temporary table temp_major3 as select * from temp_major; ';
    const sql4 = `call majorloop(); `;
    const sql5 = `delete from temp_major3 where major1='마이크로디그리과정 마이크로디그리과정 디지털'; `;
    const sql6 = `select * from temp_major3; `;

    const exec = conn.query(
      sql1 + sql2 + sql3 + sql4 + sql5 + sql6,
      (err, rows) => {
        conn.release();
        console.log('실행된 SQL: ' + exec.sql);
        if (err) {
          console.log('SQL 실행시 오류발생');
          console.dir(err);
          res.json('<h1>SQL query 실행실패</h1>');
          return;
        } else {
          res.json(rows[8]);
        }
      }
    );
  });

  //res.json('asgesafe');
});

app.get('/process/search', (req, res) => {
  const inst_method = req.query.inst_method;
  const course_class = req.query.course_class;
  const prof_name = req.query.prof_name;
  const major = req.query.major;
  const name = req.query.name;
  let where =
    'where ' +
    (course_class == '전체' ? '' : 'course_class = ? and ') +
    (prof_name == '' ? '' : 'prof_name = ? and ') +
    (major == '' || major == '전체' ? '' : 'major like ? and ') +
    (name == ''
      ? ''
      : name.charAt(4) == '-' && name.charAt(9) == '-'
      ? 'a.sid = ? and a.class = ? and'
      : 'name like ? and ') +
    (inst_method == '전체'
      ? '(inst_method=' + '"원격수업"' + ' or ' + 'inst_method is null)'
      : inst_method == '원격수업'
      ? 'inst_method=' + '"원격수업"'
      : 'inst_method is null');

  let params = [];
  if (course_class != '전체') params.push(course_class);

  if (prof_name != '') {
    params.push(prof_name);
  }

  if (major != '' && major != '전체') params.push(major + '%');

  if (name != '') {
    if (name.charAt(4) == '-' && name.charAt(9) == '-') {
      params.push(name.substring(0, 9));
      params.push(name.substring(10));
    } else params.push('%' + name + '%');
  }

  pool.getConnection((err, conn) => {
    if (err) {
      conn.release();
      console.log('Mysql getConnection error. aborted');
      res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' });
      res.write('<h1>db server 연결실패</h1>');
      res.end();
      return;
    }

    console.log('데이터베이스 연결');
    const exec = conn.query(
      `select a.major, a.grade, a.sid, a.class, b.name, b.credit, a.course_class, a.prof_name, c.time, a.inst_method
      from lecture as a
      left join subject as b on a.sid=b.sid
      left join (select sid, class, group_concat(concat(day,time,'(',place,')') separator ', ') as time
      from time_info
      group by sid,class) as c on a.sid=c.sid and a.class=c.class ` +
        where +
        ';',
      params,
      (err, rows) => {
        conn.release();
        console.log('실행된 SQL: ' + exec.sql);

        if (err) {
          console.log('SQL 실행시 오류발생');
          console.dir(err);
          res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' });
          res.write('<h1>SQL query 실행실패</h1>');
          res.end();
          return;
        } else {
          res.json(rows);
        }
      }
    );
  });
});

app.get(`/process/getTime`, (req, res) => {
  const sid = req.query.sid;
  const lect_class = req.query.class;
  pool.getConnection((err, conn) => {
    const exec = conn.query(
      `select day, time, place from time_info where sid=? and class=?`,
      [sid, lect_class],
      (err, rows) => {
        conn.release();
        console.log('실행된 SQL: ' + exec.sql);

        if (err) {
          console.log('SQL 실행시 오류발생');
          console.dir(err);
          res.writeHead('200', { 'Content-Type': 'text/html; charset=utf8' });
          res.write('<h1>SQL query 실행실패</h1>');
          res.end();
          return;
        } else {
          res.json(rows);
        }
      }
    );
  });
});

app.get('/process/filter', async (req, res) => {
  let today = new Date();
  let minutes, seconds, millisec;
  console.log(req.query);
  let freedays = req.query.freeday;
  if (freedays !== undefined && freedays.length == 1) {
    freedays = [];
    freedays.push(req.query.freeday);
  }

  const mingap = req.query.mingap;
  const maxgap = req.query.maxgap;
  const gotime =
    Number(req.query.gotime.split(':')[0]) * 60 +
    Number(req.query.gotime.split(':')[1]);
  const leavetime =
    Number(req.query.leavetime.split(':')[0]) * 60 +
    Number(req.query.leavetime.split(':')[1]);
  const btbMaxtime = req.query.btbMaxtime;
  const btbMaxcount = req.query.btbMaxcount;
  const btbecpt = req.query.btbecpt;
  const group = req.query.group;
  const subject_info = [];
  let test_times = [];
  let group_tree_idx = [];
  let timetables = [];

  for (const element of group) {
    subject_info.push([]);
    for (const el of element) {
      const queryDatabase = (element) => {
        return new Promise((resolve, reject) => {
          pool.getConnection((err, conn) => {
            if (err) {
              reject(err);
            }
            const exec = conn.query(
              `SELECT a.sid, a.class, b.prof_name, a.day, a.time, a.place, c.name
                FROM time_info a
                JOIN lecture b ON a.sid = b.sid AND a.class = b.class
                JOIN subject c ON a.sid = c.sid
                WHERE a.sid = ? AND a.class = ?;
                `,
              [element.substring(0, 9), element.substring(10)],
              (err, rows) => {
                conn.release();
                if (err) {
                  reject(err);
                } else {
                  resolve(rows);
                }
              }
            );
          });
        });
      };
      try {
        const times = await queryDatabase(el);
        console.log('times: ', times);
        subject_info[subject_info.length - 1].push(times);
      } catch (err) {}
    }
  }

  let i = 0;
  group_tree_idx.push({
    begin_idx: 0,
    end_idx: 0,
  });
  let k = 1;
  for (i = 0; i < group.length; i++) {
    group_tree_idx.push({
      begin_idx: group_tree_idx[i].end_idx + 1,
    });
    group_tree_idx[i + 1].end_idx =
      group_tree_idx[i + 1].begin_idx + group[i].length * k - 1;
    k *= group[i].length;
  }
  console.log('idx: ', group_tree_idx);

  const { Worker, workerData } = require('worker_threads');
  const threadCount = Math.ceil(
    (group_tree_idx[group.length].end_idx -
      group_tree_idx[group.length].begin_idx) /
      13500
  );
  //const threadCount=1;
  const threads = new Set();
  const range = Math.ceil(
    (group_tree_idx[group.length].end_idx -
      group_tree_idx[group.length].begin_idx) /
      threadCount
  );
  let start = group_tree_idx[group.length].begin_idx;
  console.log(
    'group_tree_idx[group.length].end_idx:',
    group_tree_idx[group.length].end_idx
  );
  for (let i = 0; i < threadCount - 1; i++) {
    threads.add(
      new Worker('./processGroupWorker.js', {
        workerData: {
          start: start,
          end: start + range,
          freedays: freedays,
          subject_info: subject_info,
          distance: distance,
          mingap: mingap,
          maxgap: maxgap,
          gotime: gotime,
          leavetime: leavetime,
          btbMaxtime: btbMaxtime,
          btbMaxcount: btbMaxcount,
          btbecpt: btbecpt,
          group: group,
          group_tree_idx: group_tree_idx,
        },
      })
    );
    start += range + 1;
  }

  threads.add(
    new Worker('./processGroupWorker.js', {
      workerData: {
        start: start,
        end: group_tree_idx[group.length].end_idx,
        freedays: freedays,
        subject_info: subject_info,
        distance: distance,
        mingap: mingap,
        maxgap: maxgap,
        gotime: gotime,
        leavetime: leavetime,
        btbMaxtime: btbMaxtime,
        btbMaxcount: btbMaxcount,
        btbecpt: btbecpt,
        group: group,
        group_tree_idx: group_tree_idx,
      },
    })
  );

  for (let worker of threads) {
    worker.on('message', (value) => {
      //timetables.push(value);
      Array.prototype.push.apply(timetables, value);
      //console.log('results: ', value);
    });

    worker.on('exit', (value) => {
      threads.delete(worker); // set에서 쓰레드 삭제
      if (threads.size === 0) {
        console.log('워커 끝~');
        res.json(timetables);
      }
    });
  }

  //console.log('timetables23231: ', timetables.length);
  let sum = 0;
  test_times.forEach((n) => {
    sum += n;
  });
  //console.log('test_times: ', sum);
  //console.log('timetables: ', timetables);
  //res.json(timetables);
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});
