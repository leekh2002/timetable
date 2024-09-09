const express = require('express');
const mysql = require('mysql');
const path = require('path');
const static = require('serve-static');
const dbconfig = require('./config/dbconfig.json');

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
        console.log(rows[8]);
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
  console.log('inst_method:', req.query.inst_method);
  console.log('course_class:', req.query.course_class);
  console.log('prof_name:', req.query.prof_name);
  console.log('major:', req.query.major);
  console.log('name:', req.query.name);
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

  console.log('where: ', where);
  let params = [];
  if (course_class != '전체') params.push(course_class);

  if (prof_name != '') {
    params.push(prof_name);
  }

  if (major != '' && major != '전체') params.push(major + '%');

  if (name != '') {
    console.log(
      'name.charAt(4): ',
      name.charAt(4),
      'name.charAt(9)',
      name.charAt(9)
    );
    if (name.charAt(4) == '-' && name.charAt(9) == '-') {
      params.push(name.substring(0, 9));
      params.push(name.substring(10));
    } else params.push('%' + name + '%');
  }

  console.log('params: ', params);
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

  pool.getConnection((err,conn)=>{
    const exec = conn.query(
      `select day, time, place from time_info where sid=? and class=?`,
      [sid,lect_class],
      (err, rows)=>{
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
  })
});

app.get('/process/filter',(req, res)=>{
  
})

app.listen(3000, () => {
  console.log('Listening on port 3000');
});

