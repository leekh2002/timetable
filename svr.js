const express = require('express');
const mysql = require('mysql');
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

app.get('/categoryanddeptfromdb', (req, res) => {
  console.log('categoryanddeptfromdb호출');

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
  console.log(req.query);

  const freedays = req.query.freeday;
  const mingap = req.query.mingap;
  const maxgap = req.query.maxgap;
  const gotime =
    Number(req.query.gotime.split(':')[0]) * 60 +
    Number(req.query.gotime.split(':')[1]);
  const leavetime =
    Number(req.query.leavetime.split(':')[0]) * 60 +
    Number(req.query.leavetime.split(':')[1]);
  const btbMintime = Number(req.query.btbMintime);
  const btbMaxtime = Number(req.query.btbMaxtime);
  const btbMincount = req.query.btbMincount;
  const btbMaxcount = req.query.btbMaxcount;
  const btbecpt = req.query.btbecpt;
  const group = req.query.group;
  const inserted_subject_list = [];
  let timetables = [];

  async function selectTimetables(group, group_id) {
    for (const element of group[group_id]) {
      //inserted_subject_list.push(element);
      let times = [];
      const queryDatabase = (element) => {
        return new Promise((resolve, reject) => {
          pool.getConnection((err, conn) => {
            if (err) {
              reject(err);
            }
            const exec = conn.query(
              `select day, time, place from time_info where sid=? and class=?`,
              [element.substring(0, 9), element.substring(10)],
              (err, rows) => {
                conn.release();
                //console.log('실행된 SQL: ' + exec.sql);

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
        const day = await queryDatabase(element);
        times.push(day);
        times = times[0];
        inserted_subject_list.push({
          sid: element,
          times: times
        });

        let current_timetable=[[],[],[],[],[],[],[]];
        const index_of_day = {};
        index_of_day['월'] = 0;
        index_of_day['화'] = 1;
        index_of_day['수'] = 2;
        index_of_day['목'] = 3;
        index_of_day['금'] = 4;
        index_of_day['토'] = 5;
        index_of_day['일'] = 6;

        for(let j = 0; j < inserted_subject_list.length - 1; j++){
          inserted_subject_list[j].times.forEach(element => {
            current_timetable[index_of_day[element.day]].push({
              sid: inserted_subject_list[j].sid,
              time_and_place: element
            });
          });
        }

        for (let i = 0; i < times.length; i++) {
          const begin =
            Number(times[i].time.split('~')[0].split(':')[0]) * 60 +
            Number(times[i].time.split('~')[0].split(':')[1]);
          const end =
            Number(times[i].time.split('~')[1].split(':')[0]) * 60 +
            Number(times[i].time.split('~')[1].split(':')[1]);

          if (
            (freedays !== undefined && freedays.indexOf(times[i].day) >= 0) ||
            begin < gotime ||
            end > leavetime
          ) {
            console.log(inserted_subject_list);
            console.log('요일공강 조건 안맞음');
            inserted_subject_list.pop();
            return;
          }

          let flag=0

          //현재시간표에서 times[i].day요일의 요소들 탐색
          current_timetable[index_of_day[times[i].day]].forEach(element=>{
            const element_begin=element.time_and_place.time.split('~')[0].split[':'][0]*60+element.time_and_place.time.split('~')[0].split[':'][1];
            const element_end=element.time_and_place.time.split('~')[1].split[':'][0]*60+element.time_and_place.time.split('~')[1].split[':'][1];

            //추가하려는 시간이 현재 등록되어 있는 시간과 겹칠때
            if((begin<=element_begin && end>element_begin) || (begin>=element_begin && begin<element_end))
            {
              flag=1;
              return;
            }

            //연강, 강의간 시간간격 고려하는 코드 작성
            
          })
         
        }

        if (group.length - 1 != group_id) {
          await selectTimetables(group, group_id + 1);
        }
        inserted_subject_list.pop();
      } catch (err) {
        console.log('SQL 실행 시 오류 발생');
        console.dir(err);
      }
    }
  }

  await selectTimetables(group, 0);
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});
