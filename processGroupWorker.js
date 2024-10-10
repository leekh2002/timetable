const { parentPort, workerData } = require('worker_threads');
const {
  start,
  end,
  freedays,
  subject_info,
  distance,
  mingap,
  maxgap,
  gotime,
  leavetime,
  btbMaxtime,
  btbMaxcount,
  btbecpt,
  group,
  group_tree_idx,
} = workerData;

let results = [];

const test_start = new Date();
const start_time =
  test_start.getMinutes() * 60000 +
  test_start.getSeconds() * 1000 +
  test_start.getMilliseconds();
function selectTimetables() {
  for (i = start; i <= end; i++) {
    processGroup(
      i,
      group.length,
      [],
      i - group_tree_idx[group.length].begin_idx
    );
  }
}
function processGroup(idx, groupNum, inserted_subject_list, test_idx) {
  const param3_list = inserted_subject_list;
  const next_idx = Math.floor(
    (idx - group_tree_idx[groupNum].begin_idx) / group[groupNum - 1].length +
      group_tree_idx[groupNum - 1].begin_idx
  );

  while (idx != 0) {
    param3_list.push(
      subject_info[groupNum - 1][
        (idx - group_tree_idx[groupNum].begin_idx) % group[groupNum - 1].length
      ]
    );
    idx = Math.floor(
      (idx - group_tree_idx[groupNum].begin_idx) /
        subject_info[groupNum - 1].length +
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

  //console.log('param3:', param3_list);
  //console.log('begin: ', start, 'param: ', param3_list);
  param3_list.forEach((subject) => {
    let times = [];

    subject.forEach((time) => {
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
            // console.log('요일공강 안맞음');
            flag = 1;
            return;
          }
        });
      }

      //등하교시간 필터링 조건에 만족하는지 확인
      if (begin < gotime || end > leavetime) {
        //console.log('등하교 안맞음');
        flag = 1;
        return;
      }

      //현재 시간표에서 time.day요일에 포함되어있는 과목 요소들 탐색
      current_timetable[index_of_day[time.day]].forEach(
        async (subject_in_timetable) => {
          const sub_begin =
            Number(subject_in_timetable.time.split('~')[0].split(':')[0]) * 60 +
            Number(subject_in_timetable.time.split('~')[0].split(':')[1]);
          const sub_end =
            Number(subject_in_timetable.time.split('~')[1].split(':')[0]) * 60 +
            Number(subject_in_timetable.time.split('~')[1].split(':')[1]);

          //과목코드 겹치는지 여부확인
          if (subject.sid == subject_in_timetable.sid) {
            //console.log('과목코드 겹침');
            flag = 1;
            return;
          }

          //시간이 겹치는 과목이 있는지 확인
          if (
            (begin <= sub_begin && end > sub_begin) ||
            (begin >= sub_begin && begin < sub_end)
          ) {
            //console.log('시간 겹침');
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
              current_timetable[index_of_day[time.day]].forEach((element) => {
                const element_begin =
                  Number(element.time.split('~')[0].split(':')[0]) * 60 +
                  Number(element.time.split('~')[0].split(':')[1]);
                const element_end =
                  Number(element.time.split('~')[1].split(':')[0]) * 60 +
                  Number(element.time.split('~')[1].split(':')[1]);
                if (temp_begin == element_end) {
                  count++;
                  time_sum += element_end - element_begin;
                  temp_begin = element_begin;
                  flag = 1;
                  return;
                }
              });
              if (flag == 0) break;
            }

            //이후 연강
            while (true) {
              let flag = 0;
              current_timetable[index_of_day[time.day]].forEach((element) => {
                const element_begin =
                  Number(element.time.split('~')[0].split(':')[0]) * 60 +
                  Number(element.time.split('~')[0].split(':')[1]);
                const element_end =
                  Number(element.time.split('~')[1].split(':')[0]) * 60 +
                  Number(element.time.split('~')[1].split(':')[1]);
                if (temp_end == element_begin) {
                  count++;
                  time_sum += element_end - element_begin;
                  temp_end = element_end;
                  flag = 1;
                  return;
                }
              });
              if (flag == 0) break;
            }
            if (count > btbMaxcount || time_sum > btbMaxtime) {
              //console.log('연강조건 안맞음');
              flag = 1;
              return;
            }

            //연강 가능여부
            if (btbecpt == 'true') {
              const element_place = time.place;
              
              let walk_time=0;
              if(distance[element_place] !== undefined && distance[element_place][subject_in_timetable.place] !== undefined)
                walk_time = distance[element_place][subject_in_timetable.place];
              if (walk_time > 600) {
                // console.log('연강 불가능');
                flag = 1;
                return;
              }
            }
          }
        }
      );
    });

    if (flag == 1) return;
    //현재 과목을 current_timetable에 추가
    subject.forEach((time) => {
      current_timetable[index_of_day[time.day]].push({
        sid: time.sid,
        time: time.time,
        place: time.place,
        prof_name: time.prof_name,
      });
    });
  });

  const test_begin = new Date();
  const start_time =
    test_begin.getMinutes * 60000 +
    test_begin.getSeconds * 1000 +
    test_begin.getMilliseconds;
  //강의간 시간간격 체크
  current_timetable.forEach((day) => {
    day.sort((a, b) => a.time.localeCompare(b.time));

    for (let i = 1; i < day.length; i++) {
      if (day[i].sid == day[i - 1].sid) continue;
      const now_begin =
        Number(day[i].time.split('~')[0].split(':')[0]) * 60 +
        Number(day[i].time.split('~')[0].split(':')[1]);
      const bef_end =
        Number(day[i - 1].time.split('~')[1].split(':')[0]) * 60 +
        Number(day[i - 1].time.split('~')[1].split(':')[1]);

      if (now_begin - bef_end < mingap || now_begin - bef_end > maxgap) {
        flag = 1;
        return;
      }
    }
  });

  // console.log('flag=', flag);
  if (flag == 1) return;

  results.push(param3_list);
  //console.log('params: ', timetables);
  return;
}
if (end <= group_tree_idx[group.length].end_idx) selectTimetables();
const test_end = new Date();
const end_time =
  test_end.getMinutes() * 60000 +
  test_end.getSeconds() * 1000 +
  test_end.getMilliseconds();
console.log('end: ', end, ' time: ', test_end - test_start);
//console.log('results: ', results);
parentPort.postMessage(results);
