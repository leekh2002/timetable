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
  const btbMaxtime = req.query.btbMaxtime;
  const btbMaxcount = req.query.btbMaxcount;
  const btbecpt = req.query.btbecpt;
  const group = req.query.group;
  //const inserted_subject_list = [];
  let timetables = [];

  // async function selectTimetables(group, group_id) {
  //   await Promise.all(group[group_id].map(async (element) => {
  //     //inserted_subject_list.push(element);
  //     console.log('element: ', element);
  //     let times = [];
  //     const queryDatabase = (element) => {
  //       return new Promise((resolve, reject) => {
  //         pool.getConnection((err, conn) => {
  //           if (err) {
  //             reject(err);
  //           }
  //           const exec = conn.query(
  //             `SELECT b.prof_name, a.day, a.time, a.place, c.name
  //             FROM time_info a
  //             JOIN lecture b ON a.sid = b.sid AND a.class = b.class
  //             JOIN subject c ON a.sid = c.sid
  //             WHERE a.sid = ? AND a.class = ?;
  //             `,
  //             [element.substring(0, 9), element.substring(10)],
  //             (err, rows) => {
  //               conn.release();
  //               if (err) {
  //                 reject(err);
  //               } else {
  //                 resolve(rows);
  //               }
  //             }
  //           );
  //         });
  //       });
  //     };

  //     try {
  //       const day = await queryDatabase(element);
  //       times.push(day);
  //       times = times[0];
  //       const name = times[0].name;
  //       times.forEach((element) => {
  //         delete element.name;
  //       });
  //       inserted_subject_list.push({
  //         sid: element,
  //         name: name,
  //         times: times,
  //       });

  //       let current_timetable = [[], [], [], [], [], [], []];
  //       const index_of_day = {};
  //       index_of_day['월'] = 0;
  //       index_of_day['화'] = 1;
  //       index_of_day['수'] = 2;
  //       index_of_day['목'] = 3;
  //       index_of_day['금'] = 4;
  //       index_of_day['토'] = 5;
  //       index_of_day['일'] = 6;
  //       let j;

  //       //현재 삽입된 과목리스트를 시간표에 추가, 과목코드가 같은과목이 있는지 여부 파악
  //       for (j = 0; j < inserted_subject_list.length - 1; j++) {
  //         inserted_subject_list[j].times.forEach((element) => {
  //           current_timetable[index_of_day[element.day]].push({
  //             sid: inserted_subject_list[j].sid,
  //             time_and_place: element,
  //           });
  //         });
  //         if (
  //           inserted_subject_list[j].sid.substring(0, 9) ==
  //           element.substring(0, 9)
  //         ) {
  //           break;
  //         }
  //       }
  //       if (j < inserted_subject_list.length - 1) {
  //         inserted_subject_list.pop();
  //         return;
  //       }
  //       let i;

  //       //현재 과목 시간별 탐색
  //       for (i = 0; i < times.length; i++) {
  //         const begin =
  //           Number(times[i].time.split('~')[0].split(':')[0]) * 60 +
  //           Number(times[i].time.split('~')[0].split(':')[1]);
  //         const end =
  //           Number(times[i].time.split('~')[1].split(':')[0]) * 60 +
  //           Number(times[i].time.split('~')[1].split(':')[1]);
  //         if (
  //           (freedays !== undefined && freedays.indexOf(times[i].day) >= 0) ||
  //           begin < gotime ||
  //           end > leavetime
  //         ) {
  //           break;
  //         }

  //         let flag = 0;

  //         //현재시간표에서 times[i].day요일의 요소들 탐색
  //         await current_timetable[index_of_day[times[i].day]].forEach(
  //           async (element) => {
  //             const element_begin =
  //               Number(
  //                 element.time_and_place.time.split('~')[0].split(':')[0]
  //               ) *
  //                 60 +
  //               Number(element.time_and_place.time.split('~')[0].split(':')[1]);
  //             const element_end =
  //               Number(
  //                 element.time_and_place.time.split('~')[1].split(':')[0]
  //               ) *
  //                 60 +
  //               Number(element.time_and_place.time.split('~')[1].split(':')[1]);

  //             //추가하려는 시간이 현재 등록되어 있는 시간과 겹칠때
  //             if (
  //               (begin <= element_begin && end > element_begin) ||
  //               (begin >= element_begin && begin < element_end)
  //             ) {
  //               flag = 1;
  //               return;
  //             }

  //             //연강 체크
  //             if (begin == element_end || end == element_begin) {
  //               //이전 연강
  //               let temp_begin = begin;
  //               let temp_end = end;
  //               let count = 1,
  //                 time = end - begin;
  //               while (true) {
  //                 let flag = 0;
  //                 current_timetable[index_of_day[times[i].day]].forEach(
  //                   (element) => {
  //                     const element_begin =
  //                       Number(
  //                         element.time_and_place.time
  //                           .split('~')[0]
  //                           .split(':')[0]
  //                       ) *
  //                         60 +
  //                       Number(
  //                         element.time_and_place.time
  //                           .split('~')[0]
  //                           .split(':')[1]
  //                       );
  //                     const element_end =
  //                       Number(
  //                         element.time_and_place.time
  //                           .split('~')[1]
  //                           .split(':')[0]
  //                       ) *
  //                         60 +
  //                       Number(
  //                         element.time_and_place.time
  //                           .split('~')[1]
  //                           .split(':')[1]
  //                       );
  //                     if (temp_begin == element_end) {
  //                       count++;
  //                       time += element_end - element_begin;
  //                       temp_begin = element_begin;
  //                       flag = 1;
  //                       return;
  //                     }
  //                   }
  //                 );
  //                 if (flag == 0) break;
  //               }

  //               //이후 연강
  //               while (true) {
  //                 let flag = 0;
  //                 current_timetable[index_of_day[times[i].day]].forEach(
  //                   (element) => {
  //                     const element_begin =
  //                       Number(
  //                         element.time_and_place.time
  //                           .split('~')[0]
  //                           .split(':')[0]
  //                       ) *
  //                         60 +
  //                       Number(
  //                         element.time_and_place.time
  //                           .split('~')[0]
  //                           .split(':')[1]
  //                       );
  //                     const element_end =
  //                       Number(
  //                         element.time_and_place.time
  //                           .split('~')[1]
  //                           .split(':')[0]
  //                       ) *
  //                         60 +
  //                       Number(
  //                         element.time_and_place.time
  //                           .split('~')[1]
  //                           .split(':')[1]
  //                       );
  //                     if (temp_end == element_begin) {
  //                       count++;
  //                       time += element_end - element_begin;
  //                       temp_end = element_end;
  //                       flag = 1;
  //                       return;
  //                     }
  //                   }
  //                 );
  //                 if (flag == 0) break;
  //               }
  //               if (count > btbMaxcount || time > btbMaxtime) {
  //                 flag = 1;
  //                 return;
  //               }

  //               //연강 가능여부
  //               if (btbecpt == 'true') {
  //                 const element_place = element.time_and_place.place;
  //                 const queryDatabase = (place1, place2) => {
  //                   return new Promise((resolve, reject) => {
  //                     pool.getConnection((err, conn) => {
  //                       if (err) reject(err);
  //                       const exec = conn.query(
  //                         `select time from (select bid from lectroom where name=?) as a,
  //                                         (select bid from lectroom where name=?) as b,
  //                                         distance c
  //                                   where c.start=a.bid and c.end=b.bid`,
  //                         [element_place, place2],
  //                         (err, rows) => {
  //                           conn.release();

  //                           resolve(rows[0].time);
  //                         }
  //                       );
  //                     });
  //                   });
  //                 };

  //                 try {
  //                   const time = await queryDatabase(
  //                     element_place,
  //                     times[i].place
  //                   );
  //                   console.log(time);
  //                   if (time > 600) {
  //                     flag = 1;
  //                     return;
  //                   }
  //                 } catch (err) {}
  //               }
  //             }
  //           }
  //         );
  //         if (flag == 1) {
  //           break;
  //         }
  //       }
  //       if (i < times.length) {
  //         inserted_subject_list.pop();
  //         return;
  //       }

  //       if (group.length - 1 != group_id) {
  //         await selectTimetables(group, group_id + 1);
  //       } else {
  //         //마지막 그룹에 있는과목을 current_timetable에 추가
  //         inserted_subject_list[inserted_subject_list.length - 1].times.forEach(
  //           (element) => {
  //             current_timetable[index_of_day[element.day]].push({
  //               sid: inserted_subject_list[inserted_subject_list.length - 1]
  //                 .sid,
  //               time_and_place: element,
  //             });
  //           }
  //         );

  //         //강의간 시간간격 체크
  //         current_timetable.forEach((element) => {
  //           element.sort((a, b) =>
  //             a.time_and_place.time.localeCompare(b.time_and_place.time)
  //           );
  //           for (let i = 1; i < element.length; i++) {
  //             const before_end =
  //               Number(
  //                 element[i - 1].time_and_place.time.split('~')[1].split(':')[0]
  //               ) *
  //                 60 +
  //               Number(
  //                 element[i - 1].time_and_place.time.split('~')[1].split(':')[1]
  //               );

  //             const now_begin =
  //               Number(
  //                 element[i].time_and_place.time.split('~')[0].split(':')[0]
  //               ) *
  //                 60 +
  //               Number(
  //                 element[i].time_and_place.time.split('~')[0].split(':')[1]
  //               );

  //             if (
  //               now_begin - before_end < mingap ||
  //               now_begin - before_end > maxgap
  //             ) {
  //               //밑 if문의 조건에 충족하지 않도록 리스트의 요소 제거
  //               inserted_subject_list.pop();
  //               console.log('시간 간격 안맞음');
  //             }
  //           }
  //         });

  //         console.log('inserted: ', inserted_subject_list);
  //         if (inserted_subject_list.length == group.length) {
  //           timetables.push([]);
  //           inserted_subject_list.forEach((element) => {
  //             timetables[timetables.length - 1].push(element);
  //           });
  //           console.log('timetables: ',timetables);
  //         }
  //       }
  //       inserted_subject_list.pop();
  //     } catch (err) {
  //       console.log('SQL 실행 시 오류 발생');
  //       console.dir(err);
  //     }
  //   }));
  //   // for (const element of group[group_id]) {
  //   //   //inserted_subject_list.push(element);
  //   //   let times = [];
  //   //   const queryDatabase = (element) => {
  //   //     return new Promise((resolve, reject) => {
  //   //       pool.getConnection((err, conn) => {
  //   //         if (err) {
  //   //           reject(err);
  //   //         }
  //   //         const exec = conn.query(
  //   //           `SELECT b.prof_name, a.day, a.time, a.place, c.name
  //   //           FROM time_info a
  //   //           JOIN lecture b ON a.sid = b.sid AND a.class = b.class
  //   //           JOIN subject c ON a.sid = c.sid
  //   //           WHERE a.sid = ? AND a.class = ?;
  //   //           `,
  //   //           [element.substring(0, 9), element.substring(10)],
  //   //           (err, rows) => {
  //   //             conn.release();
  //   //             if (err) {
  //   //               reject(err);
  //   //             } else {
  //   //               resolve(rows);
  //   //             }
  //   //           }
  //   //         );
  //   //       });
  //   //     });
  //   //   };

  //   //   try {
  //   //     const day = await queryDatabase(element);
  //   //     times.push(day);
  //   //     times = times[0];
  //   //     const name=times[0].name;
  //   //     times.forEach((element)=>{
  //   //       delete element.name;
  //   //     })
  //   //     inserted_subject_list.push({
  //   //       sid: element,
  //   //       name: name,
  //   //       times: times,
  //   //     });

  //   //     let current_timetable = [[], [], [], [], [], [], []];
  //   //     const index_of_day = {};
  //   //     index_of_day['월'] = 0;
  //   //     index_of_day['화'] = 1;
  //   //     index_of_day['수'] = 2;
  //   //     index_of_day['목'] = 3;
  //   //     index_of_day['금'] = 4;
  //   //     index_of_day['토'] = 5;
  //   //     index_of_day['일'] = 6;
  //   //     let j;

  //   //     //현재 삽입된 과목리스트를 시간표에 추가, 과목코드가 같은과목이 있는지 여부 파악
  //   //     for (j = 0; j < inserted_subject_list.length - 1; j++) {
  //   //       inserted_subject_list[j].times.forEach((element) => {
  //   //         current_timetable[index_of_day[element.day]].push({
  //   //           sid: inserted_subject_list[j].sid,
  //   //           time_and_place: element,
  //   //         });
  //   //       });
  //   //       if (
  //   //         inserted_subject_list[j].sid.substring(0, 9) ==
  //   //         element.substring(0, 9)
  //   //       ) {
  //   //         break;
  //   //       }
  //   //     }
  //   //     if (j < inserted_subject_list.length - 1) {
  //   //       inserted_subject_list.pop();
  //   //       continue;
  //   //     }
  //   //     let i;

  //   //     //현재 과목 시간별 탐색
  //   //     for (i = 0; i < times.length; i++) {
  //   //       const begin =
  //   //         Number(times[i].time.split('~')[0].split(':')[0]) * 60 +
  //   //         Number(times[i].time.split('~')[0].split(':')[1]);
  //   //       const end =
  //   //         Number(times[i].time.split('~')[1].split(':')[0]) * 60 +
  //   //         Number(times[i].time.split('~')[1].split(':')[1]);
  //   //       if (
  //   //         (freedays !== undefined && freedays.indexOf(times[i].day) >= 0) ||
  //   //         begin < gotime ||
  //   //         end > leavetime
  //   //       ) {
  //   //         break;
  //   //       }

  //   //       let flag = 0;

  //   //       //현재시간표에서 times[i].day요일의 요소들 탐색
  //   //       await current_timetable[index_of_day[times[i].day]].forEach(
  //   //         async (element) => {
  //   //           const element_begin =
  //   //             Number(
  //   //               element.time_and_place.time.split('~')[0].split(':')[0]
  //   //             ) *
  //   //               60 +
  //   //             Number(element.time_and_place.time.split('~')[0].split(':')[1]);
  //   //           const element_end =
  //   //             Number(
  //   //               element.time_and_place.time.split('~')[1].split(':')[0]
  //   //             ) *
  //   //               60 +
  //   //             Number(element.time_and_place.time.split('~')[1].split(':')[1]);

  //   //           //추가하려는 시간이 현재 등록되어 있는 시간과 겹칠때
  //   //           if (
  //   //             (begin <= element_begin && end > element_begin) ||
  //   //             (begin >= element_begin && begin < element_end)
  //   //           ) {
  //   //             flag = 1;
  //   //             return;
  //   //           }

  //   //           //연강 체크
  //   //           if (begin == element_end || end == element_begin) {
  //   //             //이전 연강
  //   //             let temp_begin = begin;
  //   //             let temp_end = end;
  //   //             let count = 1,
  //   //               time = end - begin;
  //   //             while (true) {
  //   //               let flag = 0;
  //   //               current_timetable[index_of_day[times[i].day]].forEach(
  //   //                 (element) => {
  //   //                   const element_begin =
  //   //                     Number(
  //   //                       element.time_and_place.time
  //   //                         .split('~')[0]
  //   //                         .split(':')[0]
  //   //                     ) *
  //   //                       60 +
  //   //                     Number(
  //   //                       element.time_and_place.time
  //   //                         .split('~')[0]
  //   //                         .split(':')[1]
  //   //                     );
  //   //                   const element_end =
  //   //                     Number(
  //   //                       element.time_and_place.time
  //   //                         .split('~')[1]
  //   //                         .split(':')[0]
  //   //                     ) *
  //   //                       60 +
  //   //                     Number(
  //   //                       element.time_and_place.time
  //   //                         .split('~')[1]
  //   //                         .split(':')[1]
  //   //                     );
  //   //                   if (temp_begin == element_end) {
  //   //                     count++;
  //   //                     time += element_end - element_begin;
  //   //                     temp_begin = element_begin;
  //   //                     flag = 1;
  //   //                     return;
  //   //                   }
  //   //                 }
  //   //               );
  //   //               if (flag == 0) break;
  //   //             }

  //   //             //이후 연강
  //   //             while (true) {
  //   //               let flag = 0;
  //   //               current_timetable[index_of_day[times[i].day]].forEach(
  //   //                 (element) => {
  //   //                   const element_begin =
  //   //                     Number(
  //   //                       element.time_and_place.time
  //   //                         .split('~')[0]
  //   //                         .split(':')[0]
  //   //                     ) *
  //   //                       60 +
  //   //                     Number(
  //   //                       element.time_and_place.time
  //   //                         .split('~')[0]
  //   //                         .split(':')[1]
  //   //                     );
  //   //                   const element_end =
  //   //                     Number(
  //   //                       element.time_and_place.time
  //   //                         .split('~')[1]
  //   //                         .split(':')[0]
  //   //                     ) *
  //   //                       60 +
  //   //                     Number(
  //   //                       element.time_and_place.time
  //   //                         .split('~')[1]
  //   //                         .split(':')[1]
  //   //                     );
  //   //                   if (temp_end == element_begin) {
  //   //                     count++;
  //   //                     time += element_end - element_begin;
  //   //                     temp_end = element_end;
  //   //                     flag = 1;
  //   //                     return;
  //   //                   }
  //   //                 }
  //   //               );
  //   //               if (flag == 0) break;
  //   //             }
  //   //             if (count > btbMaxcount || time > btbMaxtime) {
  //   //               flag = 1;
  //   //               return;
  //   //             }

  //   //             //연강 가능여부
  //   //             if (btbecpt == 'true') {
  //   //               const element_place = element.time_and_place.place;
  //   //               const queryDatabase = (place1, place2) => {
  //   //                 return new Promise((resolve, reject) => {
  //   //                   pool.getConnection((err, conn) => {
  //   //                     if (err) reject(err);
  //   //                     const exec = conn.query(
  //   //                       `select time from (select bid from lectroom where name=?) as a,
  //   //                                       (select bid from lectroom where name=?) as b,
  //   //                                       distance c
  //   //                                 where c.start=a.bid and c.end=b.bid`,
  //   //                       [element_place, place2],
  //   //                       (err, rows) => {
  //   //                         conn.release();

  //   //                         resolve(rows[0].time);
  //   //                       }
  //   //                     );
  //   //                   });
  //   //                 });
  //   //               };

  //   //               try {
  //   //                 const time = await queryDatabase(
  //   //                   element_place,
  //   //                   times[i].place
  //   //                 );
  //   //                 console.log(time);
  //   //                 if (time > 600) {
  //   //                   flag = 1;
  //   //                   return;
  //   //                 }
  //   //               } catch (err) {}
  //   //             }
  //   //           }
  //   //         }
  //   //       );
  //   //       if (flag == 1) {
  //   //         break;
  //   //       }
  //   //     }
  //   //     if (i < times.length) {
  //   //       inserted_subject_list.pop();
  //   //       continue;
  //   //     }

  //   //     if (group.length - 1 != group_id) {
  //   //       await selectTimetables(group, group_id + 1);
  //   //     } else {
  //   //       //마지막 그룹에 있는과목을 current_timetable에 추가
  //   //       inserted_subject_list[inserted_subject_list.length-1].times.forEach((element)=>{
  //   //         current_timetable[index_of_day[element.day]].push({
  //   //           sid:inserted_subject_list[inserted_subject_list.length-1].sid,
  //   //           time_and_place: element
  //   //         })
  //   //       })

  //   //       //강의간 시간간격 체크
  //   //       current_timetable.forEach((element)=>{
  //   //         element.sort((a,b)=> a.time_and_place.time.localeCompare(b.time_and_place.time));
  //   //         for(let i=1;i<element.length;i++){
  //   //           const before_end=Number(element[i-1].time_and_place.time.split('~')[1].split(':')[0])*60+
  //   //             Number(element[i-1].time_and_place.time.split('~')[1].split(':')[1]);

  //   //           const now_begin=Number(element[i].time_and_place.time.split('~')[0].split(':')[0])*60+
  //   //             Number(element[i].time_and_place.time.split('~')[0].split(':')[1]);

  //   //           if(now_begin-before_end<mingap || now_begin-before_end>maxgap){
  //   //             //밑 if문의 조건에 충족하지 않도록 리스트의 요소 제거
  //   //             inserted_subject_list.pop();
  //   //             console.log('시간 간격 안맞음');
  //   //           }
  //   //         }
  //   //       })
  //   //       if (inserted_subject_list.length == group.length) {
  //   //         timetables.push([]);
  //   //         inserted_subject_list.forEach((element) => {
  //   //           timetables[timetables.length - 1].push(element);
  //   //         });
  //   //       }
  //   //     }
  //   //     inserted_subject_list.pop();
  //   //   } catch (err) {
  //   //     console.log('SQL 실행 시 오류 발생');
  //   //     console.dir(err);
  //   //   }
  //   // }
  // }

  async function selectTimetables(
    group,
    group_id,
    inserted_subject_list,
    test_value
  ) {
    console.log('test_value: ', test_value);
    console.log('inserted: ', inserted_subject_list);
    await Promise.all(
      group[group_id].map(async (element) => {
        //let inserted_subject_list=inserted_subject_list;
        console.log('element: ', element);
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
          // console.log('inserted: ',inserted_subject_list);
          const day = await queryDatabase(element);
          times.push(day);
          times = times[0];
          const name = times[0].name;
          times.forEach((element) => {
            delete element.name;
          });
          inserted_subject_list.push({
            sid: element,
            name: name,
            times: times,
          });

          let current_timetable = [[], [], [], [], [], [], []];
          const index_of_day = {};
          index_of_day['월'] = 0;
          index_of_day['화'] = 1;
          index_of_day['수'] = 2;
          index_of_day['목'] = 3;
          index_of_day['금'] = 4;
          index_of_day['토'] = 5;
          index_of_day['일'] = 6;
          let j;

          //현재 삽입된 과목리스트를 시간표에 추가, 과목코드가 같은과목이 있는지 여부 파악
          for (j = 0; j < inserted_subject_list.length - 1; j++) {
            inserted_subject_list[j].times.forEach((element) => {
              current_timetable[index_of_day[element.day]].push({
                sid: inserted_subject_list[j].sid,
                time_and_place: element,
              });
            });
            if (
              inserted_subject_list[j].sid.substring(0, 9) ==
              element.substring(0, 9)
            ) {
              break;
            }
          }
          if (j < inserted_subject_list.length - 1) {
            inserted_subject_list.pop();
            return;
          }
          let i;

          //현재 과목 시간별 탐색
          for (i = 0; i < times.length; i++) {
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
              break;
            }

            let flag = 0;

            //현재시간표에서 times[i].day요일의 요소들 탐색
            await current_timetable[index_of_day[times[i].day]].forEach(
              async (element) => {
                const element_begin =
                  Number(
                    element.time_and_place.time.split('~')[0].split(':')[0]
                  ) *
                    60 +
                  Number(
                    element.time_and_place.time.split('~')[0].split(':')[1]
                  );
                const element_end =
                  Number(
                    element.time_and_place.time.split('~')[1].split(':')[0]
                  ) *
                    60 +
                  Number(
                    element.time_and_place.time.split('~')[1].split(':')[1]
                  );

                //추가하려는 시간이 현재 등록되어 있는 시간과 겹칠때
                if (
                  (begin <= element_begin && end > element_begin) ||
                  (begin >= element_begin && begin < element_end)
                ) {
                  flag = 1;
                  return;
                }

                //연강 체크
                if (begin == element_end || end == element_begin) {
                  //이전 연강
                  let temp_begin = begin;
                  let temp_end = end;
                  let count = 1,
                    time = end - begin;
                  while (true) {
                    let flag = 0;
                    current_timetable[index_of_day[times[i].day]].forEach(
                      (element) => {
                        const element_begin =
                          Number(
                            element.time_and_place.time
                              .split('~')[0]
                              .split(':')[0]
                          ) *
                            60 +
                          Number(
                            element.time_and_place.time
                              .split('~')[0]
                              .split(':')[1]
                          );
                        const element_end =
                          Number(
                            element.time_and_place.time
                              .split('~')[1]
                              .split(':')[0]
                          ) *
                            60 +
                          Number(
                            element.time_and_place.time
                              .split('~')[1]
                              .split(':')[1]
                          );
                        if (temp_begin == element_end) {
                          count++;
                          time += element_end - element_begin;
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
                    current_timetable[index_of_day[times[i].day]].forEach(
                      (element) => {
                        const element_begin =
                          Number(
                            element.time_and_place.time
                              .split('~')[0]
                              .split(':')[0]
                          ) *
                            60 +
                          Number(
                            element.time_and_place.time
                              .split('~')[0]
                              .split(':')[1]
                          );
                        const element_end =
                          Number(
                            element.time_and_place.time
                              .split('~')[1]
                              .split(':')[0]
                          ) *
                            60 +
                          Number(
                            element.time_and_place.time
                              .split('~')[1]
                              .split(':')[1]
                          );
                        if (temp_end == element_begin) {
                          count++;
                          time += element_end - element_begin;
                          temp_end = element_end;
                          flag = 1;
                          return;
                        }
                      }
                    );
                    if (flag == 0) break;
                  }
                  if (count > btbMaxcount || time > btbMaxtime) {
                    flag = 1;
                    return;
                  }

                  //연강 가능여부
                  if (btbecpt == 'true') {
                    const element_place = element.time_and_place.place;
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
                      const time = await queryDatabase(
                        element_place,
                        times[i].place
                      );
                      console.log(time);
                      if (time > 600) {
                        flag = 1;
                        return;
                      }
                    } catch (err) {}
                  }
                }
              }
            );
            if (flag == 1) {
              break;
            }
          }
          if (i < times.length) {
            inserted_subject_list.pop();
            return;
          }
          console.log(inserted_subject_list);
          if (group.length - 1 > inserted_subject_list.length) {
            await selectTimetables(
              group,
              group_id + 1,
              inserted_subject_list,
              ++test_value
            );
          } else {
            //마지막 그룹에 있는과목을 current_timetable에 추가
            inserted_subject_list[
              inserted_subject_list.length - 1
            ].times.forEach((element) => {
              current_timetable[index_of_day[element.day]].push({
                sid: inserted_subject_list[inserted_subject_list.length - 1]
                  .sid,
                time_and_place: element,
              });
            });

            //강의간 시간간격 체크
            current_timetable.forEach((element) => {
              element.sort((a, b) =>
                a.time_and_place.time.localeCompare(b.time_and_place.time)
              );
              for (let i = 1; i < element.length; i++) {
                const before_end =
                  Number(
                    element[i - 1].time_and_place.time
                      .split('~')[1]
                      .split(':')[0]
                  ) *
                    60 +
                  Number(
                    element[i - 1].time_and_place.time
                      .split('~')[1]
                      .split(':')[1]
                  );

                const now_begin =
                  Number(
                    element[i].time_and_place.time.split('~')[0].split(':')[0]
                  ) *
                    60 +
                  Number(
                    element[i].time_and_place.time.split('~')[0].split(':')[1]
                  );

                if (
                  now_begin - before_end < mingap ||
                  now_begin - before_end > maxgap
                ) {
                  //밑 if문의 조건에 충족하지 않도록 리스트의 요소 제거
                  inserted_subject_list.pop();
                  console.log('시간 간격 안맞음');
                }
              }
            });

            // console.log('inserted: ', inserted_subject_list);
            if (inserted_subject_list.length == group.length) {
              timetables.push([]);
              inserted_subject_list.forEach((element) => {
                timetables[timetables.length - 1].push(element);
              });

              console.log('timetables: ', timetables);
            }
          }
          inserted_subject_list.pop();
        } catch (err) {
          console.log('SQL 실행 시 오류 발생');
          console.dir(err);
        }
      })
    );
  }

  await selectTimetables(group, 0, [], 0);
  console.log('timetables23231: ', timetables);
  res.json(timetables);
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});
