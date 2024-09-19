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
  //const inserted_subject_list = [];
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
              `SELECT b.prof_name, a.day, a.time, a.place, c.name
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
        subject_info[subject_info.length - 1].push(times);
      } catch (err) {}
    }
  }


  //(시작 건물, 도착 건물) : 시간 배열 생성해야함.  
  const queryDatabase = (element) => {
    return new Promise((resolve, reject) => {
      pool.getConnection((err, conn) => {
        if (err) {
          reject(err);
        }
        const exec = conn.query(
          `SELECT b.prof_name, a.day, a.time, a.place, c.name
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
    subject_info[subject_info.length - 1].push(times);
  } catch (err) {}


  console.log('subject_info: ', subject_info);
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
  async function selectTimetables() {
    const promises = [];

    for (
      i = group_tree_idx[group.length].begin_idx;
      i <= group_tree_idx[group.length].end_idx;
      i++
    ) {
      test_times.push([]);
      await processGroup(
        i,
        group.length,
        [],
        i - group_tree_idx[group.length].begin_idx
      );
      // promises.push(
      //   processGroup(
      //     i,
      //     group.length,
      //     [],
      //     i - group_tree_idx[group.length].begin_idx
      //   )
      // );
    }
    //await Promise.all(promises);
    console.log('asefasegesafsaegsafsef');
  }

  async function processGroup(idx, groupNum, inserted_subject_list, test_idx) {
    const param3_list = inserted_subject_list;
    const next_idx = Math.floor(
      (idx - group_tree_idx[groupNum].begin_idx) / group[groupNum - 1].length +
        group_tree_idx[groupNum - 1].begin_idx
    );

    while (idx != 0) {
      param3_list.push(
        group[groupNum - 1][
          (idx - group_tree_idx[groupNum].begin_idx) %
            group[groupNum - 1].length
        ]
      );
      idx = Math.floor(
        (idx - group_tree_idx[groupNum].begin_idx) /
          group[groupNum - 1].length +
          group_tree_idx[groupNum - 1].begin_idx
      );
      groupNum--;
    }
    let current_timetable = [[], [], [], [], [], [], []];
    const index_of_day = {};
    index_of_day['월'] = 0;
    index_of_day['화'] = 1;
    index_of_day['수'] = 2;
    index_of_day['목'] = 3;
    index_of_day['금'] = 4;
    index_of_day['토'] = 5;
    index_of_day['일'] = 6;
    let flag = 0;
    
    await Promise.all(
      param3_list.map(async (element) => {
        let times = [];
        const queryDatabase = (element) => {
          return new Promise((resolve, reject) => {
            pool.getConnection((err, conn) => {
              if (err) {
                reject(err);
              }
              const exec = conn.query(
                `SELECT b.prof_name, a.day, a.time, a.place, c.name
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
          
          const test_begin = new Date();
          const start_time =
          test_begin.getMinutes * 60000 +
          test_begin.getSeconds * 1000 +
          test_begin.getMilliseconds;
          //const times = await queryDatabase(element);
          let times = [];
          times.push({
            prof_name: 'asefs',
            day: '월',
            time: '12:00~15:00',
            place: '공5411',
            name: 'asefsa',
          });
          times.push({
            prof_name: 'asefs',
            day: '월',
            time: '17:00~18:00',
            place: '공5411',
            name: 'asefsa',
          });
          // console.log('times: ', times);
          times.forEach((time) => {
            //console.log('time: ',time)
            const begin =
              Number(time.time.split('~')[0].split(':')[0]) * 60 +
              Number(time.time.split('~')[0].split(':')[1]);
            const end =
              Number(time.time.split('~')[1].split(':')[0]) * 60 +
              Number(time.time.split('~')[1].split(':')[1]);

            //요일공강 필터링 조건에 만족하는지 확인
            if (freedays !== undefined) {
              // console.log('freedays: ', freedays);
              freedays.forEach((freeday) => {
                //   console.log('freeday: ', freeday);
                if (freeday == time.day) {
                  flag = 1;
                  return;
                }
              });
            }

            //등하교시간 필터링 조건에 만족하는지 확인
            if (begin < gotime || end > leavetime) {
              flag = 1;
              return;
            }

            //현재 시간표에서 time.day요일에 포함되어있는 과목 요소들 탐색
            current_timetable[index_of_day[time.day]].forEach(
              async (subject) => {
                const sub_begin =
                  Number(subject.time.split('~')[0].split(':')[0]) * 60 +
                  Number(subject.time.split('~')[0].split(':')[1]);
                const sub_end =
                  Number(subject.time.split('~')[1].split(':')[0]) * 60 +
                  Number(subject.time.split('~')[1].split(':')[1]);

                //과목코드 겹치는지 여부확인
                if (element == subject.sid) {
                  flag = 1;
                  return;
                }

                //시간이 겹치는 과목이 있는지 확인
                if (
                  (begin <= sub_begin && end > sub_begin) ||
                  (begin >= sub_begin && begin < sub_end)
                ) {
                  flag = 1;
                  return;
                }

                //연강필터링 조건 확인
                if (begin == sub_end || end == sub_begin) {
                  //이전 연강
                  let temp_begin = begin;
                  let temp_end = end;
                  let count = 1,
                    time_sum = end - begin;
                  while (true) {
                    let flag = 0;
                    current_timetable[index_of_day[time.day]].forEach(
                      (element) => {
                        const element_begin =
                          Number(element.time.split('~')[0].split(':')[0]) *
                            60 +
                          Number(element.time.split('~')[0].split(':')[1]);
                        const element_end =
                          Number(element.time.split('~')[1].split(':')[0]) *
                            60 +
                          Number(element.time.split('~')[1].split(':')[1]);
                        if (temp_begin == element_end) {
                          count++;
                          time_sum += element_end - element_begin;
                          temp_begin = element_begin;
                          flag = 1;
                          return;
                        }
                      }
                    );
                    if (flag == 0) break;
                  }

                  //이후 연강
                  while (true) {
                    let flag = 0;
                    current_timetable[index_of_day[time.day]].forEach(
                      (element) => {
                        const element_begin =
                          Number(element.time.split('~')[0].split(':')[0]) *
                            60 +
                          Number(element.time.split('~')[0].split(':')[1]);
                        const element_end =
                          Number(element.time.split('~')[1].split(':')[0]) *
                            60 +
                          Number(element.time.split('~')[1].split(':')[1]);
                        if (temp_end == element_begin) {
                          count++;
                          time_sum += element_end - element_begin;
                          temp_end = element_end;
                          flag = 1;
                          return;
                        }
                      }
                    );
                    if (flag == 0) break;
                  }
                  if (count > btbMaxcount || time_sum > btbMaxtime) {
                    flag = 1;
                    return;
                  }

                  //연강 가능여부
                  if (btbecpt == 'true') {
                    const element_place = time.place;
                    const queryDatabase = (place1, place2) => {
                      return new Promise((resolve, reject) => {
                        pool.getConnection((err, conn) => {
                          if (err) reject(err);
                          const exec = conn.query(
                            `select time from (select bid from lectroom where name=?) as a,
                                              (select bid from lectroom where name=?) as b,
                                              distance c
                                        where c.start=a.bid and c.end=b.bid`,
                            [element_place, place2],
                            (err, rows) => {
                              conn.release();

                              resolve(rows[0].time);
                            }
                          );
                        });
                      });
                    };

                    try {
                      const walk_time = await queryDatabase(
                        element_place,
                        element.place
                      );
                      if (walk_time > 600) {
                        flag = 1;
                        return;
                      }
                    } catch (err) {}
                  }
                }
              }
            );
          });

          //현재 과목을 current_timetable에 추가
          times.forEach((time) => {
            current_timetable[index_of_day[time.day]].push({
              sid: element,
              name: time.name,
              time: time.time,
              place: time.place,
              prof_name: time.prof_name,
            });
          });
          const test_end = new Date();
          const end_time =
          test_end.getMinutes * 60000 +
          test_end.getSeconds * 1000 +
          test_end.getMilliseconds;
          test_times[test_idx] = test_end - test_begin;
          if (flag == 1) return;
        } catch (err) {
          console.log('SQL 실행 시 오류 발생');
          console.dir(err);
        }
      })
    );
    
    
    //강의간 시간간격 체크
    current_timetable.forEach((day) => {
      day.sort((a, b) => a.time.localeCompare(b.time));

      for (let i = 1; i < day.length; i++) {
        if (day[i].sid == day[i - 1].sid) continue;
        const now_begin =
          Number(day[i].time.split('~')[0].split(':')[0]) * 60 +
          Number(day[i].time.split('~')[0].split(':')[1]);
        const now_end =
          Number(day[i].time.split('~')[1].split(':')[0]) * 60 +
          Number(day[i].time.split('~')[1].split(':')[1]);
        const bef_begin =
          Number(day[i - 1].time.split('~')[0].split(':')[0]) * 60 +
          Number(day[i - 1].time.split('~')[0].split(':')[1]);
        const bef_end =
          Number(day[i - 1].time.split('~')[1].split(':')[0]) * 60 +
          Number(day[i - 1].time.split('~')[1].split(':')[1]);

        if (now_begin - bef_end < mingap || now_begin - bef_end > maxgap) {
          flag = 1;
          return;
        }
      }
    });

    if (flag == 1) return;

    timetables.push(current_timetable);
    //console.log('params: ', timetables);
    return;
  }

  await selectTimetables();

  //console.log('timetables23231: ', timetables.length);
  let sum = 0;
  test_times.forEach((n) => {
    sum += n;
  });
  console.log('test_times: ', sum);
  console.log('timetables: ', timetables);
  res.json(timetables);
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});
