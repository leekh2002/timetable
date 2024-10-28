const category = document.getElementById('courseCategory');
const department = document.getElementById('departments');
let width_value = '113.31px';
let group_count = 1;
const searchForm = document.getElementById('searchForm');
let class_num2 = 0;
let color_num = 0;
let displayed_element = [];
let sid_set = [];
const dayDict = {};
let results;
let now_results_idx = 0;
let add_subject_target = 0;
let timetable_count = 0;
let current_timetable_num = 0;
let timetables = [];
dayDict['월'] = '1';
dayDict['화'] = '2';
dayDict['수'] = '3';
dayDict['목'] = '4';
dayDict['금'] = '5';
dayDict['토'] = '6';
dayDict['일'] = '7';

document.addEventListener('DOMContentLoaded', function () {});
document.getElementById('department').addEventListener('click', (event) => {
  event.target.value = '';
});
const categoryAndDeptfromdb = (category, department) => {
  fetch('/categoryanddeptfromdb', {
    method: 'GET',
  })
    .then((res) => res.json())
    .then((data) => {
      data.forEach((element) => {
        var option = document.createElement('option');
        option.value = element.major1;
        department.appendChild(option);
      });
    });
};
categoryAndDeptfromdb(category, department);

document
  .getElementById('loadTimetable')
  .addEventListener('click', function (event) {
    event.preventDefault();

    const timetableList = document.getElementById('timetableList');
    const container = document.querySelector('.container');
    timetableList.classList.toggle('show');

    // 시간표가 열릴 때와 닫힐 때 container의 위치를 조정
    container.classList.add('shift-left');
  });
document
  .querySelector('.close-timetable')
  .addEventListener('click', function () {
    const timetableList = document.getElementById('timetableList');
    timetableList.classList.remove('show');
    const container = document.querySelector('.container');
    container.classList.remove('shift-left');
  });

function adjustTableWidth() {
  const thead = document.querySelector('.results-section .output_result thead');
  const tbody = document.querySelector('.results-section .output_result tbody');
  const element = document.querySelector('.output_result');
  const scrollbarWidth = 17;

  if (element.scrollHeight >= 400) {
    thead.style.width = 'calc(100% - ' + scrollbarWidth + 'px)';
  } else {
    thead.style.width = '100%';
  }
  tbody.style.width = '100%'; // tbody는 항상 100% 너비를 유지
}

document.getElementById('searchForm').addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(searchForm);
  const inst_method = document.getElementById('courseType').value;
  const course_class = document.getElementById('courseCategory').value;
  const prof_name = document.getElementById('prof_name').value;
  const major = document.getElementById('department').value;
  const name = document.getElementById('courseNumber').value;
  const tbody = document.querySelector('.output_result tbody');
  tbody.replaceChildren();

  const queryString = `inst_method=${encodeURIComponent(
    inst_method
  )}&course_class=${encodeURIComponent(
    course_class
  )}&prof_name=${encodeURIComponent(prof_name)}&major=${encodeURIComponent(
    major
  )}&name=${encodeURIComponent(name)}`;

  fetch(`/process/search?${queryString}`, {
    method: 'GET',
  })
    .then((res) => res.json())
    .then((data) => {
      data.forEach((element) => {
        const keys = Object.keys(element);
        const newRow = document.createElement('tr');
        keys.forEach((key) => {
          const newCell = document.createElement('td');
          newCell.textContent = element[key];
          newRow.appendChild(newCell);
        });
        const addButton = document.createElement('button');
        addButton.className += 'add-btn';
        addButton.textContent = '+ 추가';
        newRow.appendChild(addButton);
        const param_row = newRow;

        newRow.addEventListener('mouseenter', (event) => {
          enterEvent(event);
        });

        newRow.addEventListener('mouseleave', (event) => {
          leaveEvent(event);
        });

        newRow.addEventListener('dragstart', (event) => {
          const target = event.target.parentElement.querySelectorAll('td');
          const lect_info = {
            name: target[4].textContent,
            prof_name: target[7].textContent,
            sid: target[2].textContent,
            class: target[3].textContent,
            time: target[8].textContent,
          };
          event.dataTransfer.setData(
            'application/json',
            JSON.stringify(lect_info)
          );
        });

        addButton.addEventListener('click', (event) => {
          clickEvent(param_row, 0);
        });

        tbody.appendChild(newRow);
      });
      adjustTableWidth();
    });
});

function enterEvent(event) {
  const td = event.target.querySelectorAll('td');
  const lecture_info = {
    sid: td[2].textContent,
    class: td[3].textContent,
    name: td[4].textContent,
    prof_name: td[7].textContent,
    time: seperateTime(td[8].textContent),
  };
  displayTime(lecture_info, 10, '0.2', 0);
}

function leaveEvent(event) {
  removeElements(displayed_element);
}

function clickEvent(row) {
  const td = row.querySelectorAll('td');
  const lecture_info = {
    sid: td[2].textContent,
    class: td[3].textContent,
    name: td[4].textContent,
    prof_name: td[7].textContent,
    time: seperateTime(td[8].textContent),
  };
  if (add_subject_target === 0) addLectureToTimeTable(lecture_info);
  else addLectureToGroup(row, add_subject_target);
}

function seperateTime(time) {
  if (time == '') return '';
  const ret = [];
  const no_space = time.split(' ').join('');
  const splited_times = no_space.split(',');

  for (let element of splited_times) {
    const day = element[0];
    const place = element.match(/\((.*)\)/)[1];
    const time = element.substring(1, element.indexOf('('));
    const start = time.split('~')[0];
    const end = time.split('~')[1];

    ret.push({
      day: day,
      place: place,
      start: start,
      end: end,
    });
  }
  return ret;
}

async function addLectureToTimeTable(lecture) {
  console.log('lecture: ', lecture);
  let i;
  const current_lectures = timetables[current_timetable_num].lecture_list;

  for (let element of current_lectures) {
    if (lecture.sid == element.sid) {
      alert('동일한 과목코드를 가진 과목은 두개 이상 담을 수 없습니다.');
      return;
    }
  }

  await displayTime(lecture, color_num++ % 10, '1', 1);
  let flag = 0;
  displayed_element.forEach((element) => {
    element.remove();
  });
  if (lecture.time == '') {
    const nontime = document.querySelector('.nontimes');
    const div = document.createElement('div');
    const span = document.createElement('span');
    const img = new Image();

    pushAddLi(
      timetables[timetables[current_timetable_num].before_timetable_num],
      timetables[current_timetable_num],
      {
        sid: lecture.sid,
        class: lecture.class,
        name: lecture.name,
      }
    );
    if (
      !timetables[current_timetable_num].lecture_list.some(
        (element) => element.sid == `${lecture.sid}-${lecture.class}`
      )
    )
      timetables[current_timetable_num].lecture_list.push(lecture);

    div.setAttribute('data-sid', lecture.sid);
    div.setAttribute('data-class', lecture.class);
    div.className += 'subject';

    span.className += 'name';
    span.textContent = lecture.name;
    span.style.setProperty('font-size', '15px', 'important');

    img.src = `./image/bin.png`;
    img.alt = 'bin';
    img.addEventListener('click', (event) => {
      const parent = img.parentElement;
      const index = timetables[current_timetable_num].lecture_list.findIndex(
        (element) =>
          element.sid == parent.dataset.sid &&
          element.class == parent.getAttribute('data-class')
      );
      timetables[current_timetable_num].lecture_list.splice(index, 1);
      pushRemoveLi(
        timetables[timetables[current_timetable_num].before_timetable_num],
        timetables[current_timetable_num],
        {
          sid: parent.dataset.sid,
          class: parent.getAttribute('data-class'),
          name: parent.getAttribute('data-name'),
        }
      );

      for (let i = 0; i < sid_set.length; i++) {
        if (sid_set[i] == parent.dataset.sid) {
          sid_set.splice(i, 1);
          break;
        }
      }
      parent.remove();
    });
    img.style.width = '13px';
    img.style.height = '13px';
    div.appendChild(span);
    div.appendChild(img);
    nontime.appendChild(div);
    sid_set.push(lecture.sid);
    return;
  }
  document.querySelectorAll('.col' + `${class_num2 - 1}`).forEach((element) => {
    element.parentElement.querySelectorAll('div').forEach((element2) => {
      if (element !== element2) {
        const e1_topval = Math.floor(Number(element.style.top.split('px')[0]));
        const e1_heival = Math.floor(
          Number(element.style.height.split('px')[0])
        );
        const e2_topval = Math.floor(Number(element2.style.top.split('px')[0]));
        const e2_heival = Math.floor(
          Number(element2.style.height.split('px')[0])
        );
        if (
          (e1_topval + 2 >= e2_topval &&
            e2_topval + e2_heival > e1_topval + 2) ||
          (e1_topval <= e2_topval + 2 && e1_topval + e1_heival > e2_topval + 2)
        ) {
          flag = 1;
          return;
        }
      }
    });
    if (flag == 1) return;
  });
  if (flag == 1) {
    removeElements(document.querySelectorAll('.col' + `${class_num2 - 1}`));
    alert('해당시간과 겹치는 강의가 있습니다.');
    return;
  } else {
    pushAddLi(
      timetables[timetables[current_timetable_num].before_timetable_num],
      timetables[current_timetable_num],
      {
        sid: lecture.sid,
        class: lecture.class,
        name: lecture.name,
      }
    );
    timetables[current_timetable_num].lecture_list.push(lecture);
    document
      .querySelectorAll('.col' + `${class_num2 - 1}`)
      .forEach((element) => {
        const h5 = document.createElement('h5');
        const em = document.createElement('em');
        const span = document.createElement('span');
        const p = document.createElement('p');
        const img = new Image();
        const day_div = element.parentElement.parentElement;

        if (day_div.dataset.day == 6) {
          day_div.parentElement.style.removeProperty('display');
          document.querySelector('.sat').style.removeProperty('display');
          width_value = '96.88px';

          for (let i = 0; i < class_num2; i++) {
            document.querySelectorAll('.col' + `${i}`).forEach((element) => {
              element.style.width = width_value;
            });
          }
        }

        img.src = `./image/bin.png`;
        img.className += 'bin-icon';
        img.alt = 'bin';
        img.addEventListener('click', (event) => {
          const parent = img.parentElement;
          const index = timetables[
            current_timetable_num
          ].lecture_list.findIndex(
            (element) =>
              element.sid == parent.dataset.sid &&
              element.class == parent.getAttribute('data-class')
          );

          timetables[current_timetable_num].lecture_list.splice(index, 1);
          pushRemoveLi(
            timetables[timetables[current_timetable_num].before_timetable_num],
            timetables[current_timetable_num],
            {
              sid: parent.dataset.sid,
              class: parent.getAttribute('data-class'),
              name: parent.getAttribute('data-name'),
            }
          );

          for (let i = 0; i < sid_set.length; i++) {
            if (sid_set[i] == parent.dataset.sid) {
              sid_set.splice(i, 1);
              break;
            }
          }

          if (parent.parentElement.parentElement.dataset.day == 6) {
            if (parent.parentElement.querySelectorAll('div').length == 1) {
              width_value = '113.31px';
              for (let i = 0; i < class_num2; i++) {
                const div = document.querySelectorAll('.col' + `${i}`);
                console.log('div: ', element, ' ', i);
                if (div == null) continue;
                div.forEach((element) => {
                  element.style.width = width_value;
                });
              }
              parent.parentElement.parentElement.parentElement.style.display =
                'none';
              document.querySelector('.sat').style.display = 'none';
            }
          }
          for (let lecture of document.querySelectorAll(
            '.' + `${parent.classList[0]}`
          )) {
            console.log('lecture: ', lecture);
          }
          removeElements(
            document.querySelectorAll('.' + `${parent.classList[0]}`)
          );
          console.log('delete: ', timetables[current_timetable_num]);
        });

        h5.textContent = lecture.name;
        em.textContent = lecture.prof_name;
        span.textContent = element.dataset.place;

        p.appendChild(em);
        p.appendChild(span);
        element.appendChild(h5);
        element.appendChild(p);
        element.appendChild(img);
      });
    sid_set.push(lecture.sid);
  }
}

function addLectureToGroup(row, group) {
  console.log(row);
  const lect_info = row.querySelectorAll('td');
  const div = document.createElement('div');
  const span_name = document.createElement('span');
  const span_sid = document.createElement('span');
  const span_time = document.createElement('span');
  const span_prof = document.createElement('span');
  const img = new Image();

  span_name.textContent = lect_info[4].textContent;
  span_sid.textContent =
    lect_info[2].textContent + '-' + lect_info[3].textContent;
  span_time.textContent = lect_info[8].textContent;
  span_prof.textContent = lect_info[7].textContent;
  img.src = './image/cancle.png';
  img.alt = 'cancle';
  img.style.width = '9px';
  img.style.height = '9px';
  let flag = 0;
  img.addEventListener('click', (event) => {
    console.log(add_subject_target);
    if (
      event.target.parentElement.parentElement.querySelectorAll('div').length ==
        2 &&
      add_subject_target != 0
    )
      group.querySelector('.placeholder').style.display = 'block';
    event.target.parentElement.remove();
  });
  group.querySelector('.placeholder').style.display = 'none';
  group.querySelectorAll('div').forEach((element) => {
    if (element.className == 'placeholder') return;
    if (
      element.querySelectorAll('span')[1].textContent == span_sid.textContent
    ) {
      flag = 1;
      return;
    }
  });

  if (flag == 1) {
    alert('이미 그룹에 해당 강의가 포함되어 있습니다.');
    return;
  }

  div.appendChild(span_name);
  div.appendChild(span_sid);
  div.appendChild(span_prof);
  div.appendChild(span_time);
  div.appendChild(img);
  group.appendChild(div);
}

function removeElements(elements) {
  elements.forEach((element) => {
    element.remove();
  });
}
async function displayTime(lecture, color, opacity, op) {
  const name = lecture.name;
  const prof_name = lecture.prof_name;

  for (let element of lecture.time) {
    if (element.day == null) {
      return;
    }
    const column = document
      .querySelector(`[data-day='${dayDict[element.day]}']`)
      .getElementsByClassName('cols')[0];

    const div = document.createElement('div');
    if (op == 1) div.className += 'col' + `${class_num2} `;

    div.style.position = 'absolute';
    div.style.width = width_value;
    div.className += 'color' + `${color}`;
    div.style.opacity = opacity;

    const start = element.start;
    const end = element.end;
    const start_hour = Number(start.split(':')[0]);
    const start_min = Number(start.split(':')[1]);
    const end_hour = Number(end.split(':')[0]);
    const end_min = Number(end.split(':')[1]);

    div.style.top =
      `${(((start_hour - 8) * 60 + start_min) / 960) * 758.72}` + 'px';
    div.style.height =
      `${
        ((end_hour * 60 + end_min - (start_hour * 60 + start_min)) / 60) * 47.42
      }` + 'px';
    div.style.overflow = 'hidden';
    column.appendChild(div);
    div.setAttribute('data-place', element.place);
    div.setAttribute('data-sid', lecture.sid);
    div.setAttribute('data-class', lecture.class);
    div.setAttribute('data-name', name);
    div.setAttribute('data-start', start);
    div.setAttribute('data-end', end);
    if (op == 0) displayed_element.push(div);
  }
  if (op == 1) class_num2++;
}

document.querySelector('.goto-generator').addEventListener('click', (event) => {
  event.target.style.display = 'none';
  document.querySelector('.days-table').style.display = 'none';
  document.querySelector('.timetable').style.display = 'none';
  document.querySelector('.nontimes').style.display = 'none';
  document.getElementById('generate-planb').style.display = 'none';
  document.getElementById('cancle-planb').style.display = 'none';
  document.getElementById('select-planb').style.display = 'none';
  document.getElementById('planb-summary').style.display = 'none';
  document.getElementById('goto-first').style.display = 'none';
  // 'filtering-section', 'add-group', 'subject-group' 표시
  document.querySelector('.filtering-section').style.display = 'grid';
  document.querySelector('.add-group').style.display = 'block';
  document.querySelector('.subject-group').style.display = 'block';
  document.querySelector('#filterForm').style.display = 'block';
  // document.querySelector('.goto-generator').style.display='none';
});

document.querySelector('.back-icon').addEventListener('click', (event) => {
  canclePlanb(document.getElementById('generate-planb'));
  document.querySelector('#filterForm').style.display = 'none';
  document.querySelector('.goto-generator').style.display = 'block';
  document.querySelector('.days-table').style.display = 'table';
  document.querySelector('.timetable').style.display = 'table';
  document.querySelector('.nontimes').style.display = 'block';
  if (!timetables[current_timetable_num].is_root) {
    document.getElementById('planb-summary').style.display = 'flex';
    document.getElementById('goto-first').style.display = 'inline-block';
  }
});

document.querySelector('.add-group').addEventListener('click', (event) => {
  event.preventDefault();

  const ph = document.createElement('div');
  const div = document.querySelector('.subject-group');
  const group = document.createElement('div');
  const span = document.createElement('span');
  const remove_img = new Image(),
    add_subject_img = new Image(),
    close_add_img = new Image();
  ph.className += 'placeholder';
  ph.textContent = '이곳에 강의를 추가하세요';
  ph.style.display = 'none';
  group.appendChild(ph);

  span.textContent = `그룹 ${++group_count} `;
  span.style.fontSize = '16px';

  group.className += 'group';
  group.id = `group${group_count}`;

  remove_img.src = './image/bin.png';
  remove_img.alt = 'bin';
  remove_img.style.width = '13px';
  remove_img.style.height = '13px';

  add_subject_img.src = './image/add.png';
  add_subject_img.alt = 'add';
  close_add_img.src = './image/cancle.png';
  close_add_img.alt = '.close';
  add_subject_img.className = 'add-subject-btn';
  close_add_img.className = 'cancle-add-btn';

  add_subject_img.addEventListener('click', (event) => {
    convertGroupStateToAdd(event);
  });
  close_add_img.addEventListener('click', (event) => {
    convertGroupStateToOrigin(event);
  });
  remove_img.addEventListener('click', (event) => {
    const pardiv = remove_img.parentElement;
    for (let i = Number(pardiv.id.substring(5)) + 1; i <= group_count; i++) {
      const group = document.getElementById(`group${i}`);
      group.id = `group${i - 1}`;
      group.querySelector('span').textContent = `그룹 ${i - 1} `;
    }
    group_count--;
    document.getElementById(pardiv.remove());
  });

  group.appendChild(span);
  group.appendChild(remove_img);
  group.appendChild(add_subject_img);
  group.appendChild(close_add_img);
  div.appendChild(group);
});

document
  .getElementById('filterForm')
  .addEventListener('submit', async (event) => {
    event.preventDefault();
    const freeday = [];
    document.getElementsByName('freeday').forEach((element) => {
      console.log(element.checked);
      if (element.checked) {
        freeday.push(element.value);
      }
    });

    let mingap = document.getElementsByName('mingap')[0].value;
    if (mingap == '') mingap = 0;

    let maxgap = document.getElementsByName('maxgap')[0].value;
    if (maxgap == '') maxgap = 10000;

    let gotime = document.getElementsByName('gotime')[0].value;
    if (gotime == '') gotime = '0:0';

    let leavetime = document.getElementsByName('leavetime')[0].value;
    if (leavetime == '') leavetime = '23:59';

    let btbMaxtime = document.getElementsByName('btbMaxtime')[0].value;
    if (btbMaxtime == '') btbMaxtime = 10000;

    let btbMaxcount = document.getElementsByName('btbMaxcount')[0].value;
    if (btbMaxcount == '') btbMaxcount = 100;
    let btbecpt = document.getElementsByName('btbecpt')[0].checked;
    let group_query = [];
    for (let i = 1; i <= group_count; i++) {
      let subjectArr = [];
      document
        .getElementById(`group${i}`)
        .querySelectorAll('div')
        .forEach((element) => {
          if (element.classList.contains('placeholder')) return;
          subjectArr.push(element.querySelectorAll('span')[1].textContent);
        });
      group_query.push(subjectArr);
    }
    const freedays = freeday
      .map((item) => `freeday=${encodeURIComponent(item)}`)
      .join('&');
    const groups = group_query
      .map((row, rowIndex) =>
        row
          .map((value, colIndex) => `group[${rowIndex}][${colIndex}]=${value}`)
          .join('&')
      )
      .join('&');
    const queryString = `${freedays}&mingap=${mingap}&maxgap=${maxgap}&gotime=${gotime}&leavetime=${leavetime}&btbMaxtime=${btbMaxtime}&btbMaxcount=${btbMaxcount}&btbecpt=${btbecpt}&${groups}`;

    await fetch(`/process/filter?${queryString}`, {
      method: 'GET',
    })
      .then((res) => res.json())
      .then((data) => {
        document.querySelector('.container').classList.add('hidden');
        document.getElementById('generatedTimetables').style.display = 'block';
        document
          .getElementById('generatedTimetables')
          .classList.add('shift-left');
        results = data;
        document.querySelector('.now-page').textContent = '1';
        document.querySelector('.all-pages').textContent = `${results.length}`;
        console.log('data: ', results[0]);
        document.querySelectorAll('.col2').forEach((element) => {
          element.remove();
        });
        addLectureToGeneratedTimeTable(results[0]);
      });
    console.log('resulasfsaefts: ', results);
  });

document
  .querySelector('.generated-timetables-back')
  .addEventListener('click', (event) => {
    const now_page = document.querySelector('.now-page');

    if (now_page.textContent != '1') {
      now_page.textContent = `${Number(now_page.textContent) - 1}`;
      console.log('cols2: ', document.querySelectorAll('.cols2'));
      document.querySelectorAll('.col2').forEach((element) => {
        element.remove();
      });
      addLectureToGeneratedTimeTable(results[Number(now_page.textContent) - 1]);
    }
  });

document
  .querySelector('.generated-timetables-forward')
  .addEventListener('click', (event) => {
    const now_page = document.querySelector('.now-page');
    const all_pages = document.querySelector('.all-pages');

    if (now_page.textContent != all_pages.textContent) {
      now_page.textContent = `${Number(now_page.textContent) + 1}`;
      console.log('cols2: ', document.querySelectorAll('.cols2'));
      document.querySelectorAll('.col2').forEach((element) => {
        element.remove();
      });
      addLectureToGeneratedTimeTable(results[Number(now_page.textContent) - 1]);
    }
  });

function addLectureToGeneratedTimeTable(lectures) {
  let color = 0;
  console.log('lectures: ', lectures);
  lectures.forEach((lecture) => {
    console.log('lecture: ', lecture);
    lecture.forEach((time) => {
      console.log('time: ', time);
      const begin =
        Number(time.time.split('~')[0].split(':')[0] - 8) * 60 +
        Number(time.time.split('~')[0].split(':')[1]);
      const end =
        Number(time.time.split('~')[1].split(':')[0] - 8) * 60 +
        Number(time.time.split('~')[1].split(':')[1]);
      console.log(document.querySelector(`[data-day2='${dayDict[time.day]}']`));
      const col = document
        .querySelector(`[data-day2='${dayDict[time.day]}']`)
        .querySelector('.cols2');
      const div = document.createElement('div');
      const p = document.createElement('p');
      const em = document.createElement('em');
      const span = document.createElement('span');
      const h5 = document.createElement('h5');

      h5.textContent = time.name;
      em.textContent = time.prof_name;
      span.textContent = time.place;
      p.appendChild(em);
      p.appendChild(span);

      div.className += 'col2 ';
      div.style.top = `${(begin / 960) * 800}px`;
      div.style.height = `${((end - begin) / 960) * 800}px`;
      div.className += `color${color}`;

      div.appendChild(h5);
      div.appendChild(p);
      col.appendChild(div);
    });
    color = (color + 1) % 11;
  });
}

document
  .getElementById('backToSelectionSection')
  .addEventListener('click', (event) => {
    document.getElementById('generatedTimetables').style.display = 'none';
    document.querySelector('.container').classList.remove('hidden');
  });

document
  .querySelector('.add-subject-btn')
  .addEventListener('click', (event) => {
    convertGroupStateToAdd(event);
  });

document.querySelector('.cancle-add-btn').addEventListener('click', (event) => {
  convertGroupStateToOrigin(event);
});

function convertGroupStateToAdd(event) {
  add_subject_target = event.target.parentElement;
  console.log(add_subject_target);
  for (let element of document.querySelector('#filterForm').childNodes) {
    console.log(element);
    if (element.className != 'subject-group' && element.nodeType == 1)
      element.style.display = 'none';
  }
  document.querySelector('.close-timetable').style.display = 'none';
  add_subject_target.querySelector('.placeholder').style.display = 'block';
  if (add_subject_target.querySelectorAll('div').length >= 2)
    add_subject_target.querySelector('.placeholder').style.display = 'none';

  event.target.style.display = 'none';
  for (let element of document.querySelectorAll('.group')) {
    if (element.id != add_subject_target.id) element.style.display = 'none';
  }
  event.target.parentElement.querySelector('.cancle-add-btn').style.display =
    'block';
}

function convertGroupStateToOrigin(event) {
  event.target.style.display = 'none';
  event.target.parentElement.querySelector('.add-subject-btn').style.display =
    'block';
  for (let element of document.querySelector('#filterForm').childNodes) {
    console.log(element);
    if (element.nodeType == 1) element.style.display = 'block';
    if (element.className == 'filtering-section')
      element.style.display = 'grid';
  }
  document.querySelector('.close-timetable').style.display = 'block';
  add_subject_target.querySelector('.placeholder').style.display = 'none';
  add_subject_target = 0;
  displayHiddenGroup();
}

function displayHiddenGroup() {
  for (let element of document.querySelectorAll('.cancle-add-btn'))
    element.style.display = 'none';
  for (let element of document.querySelectorAll('.add-subject-btn'))
    element.style.display = 'block';
  for (let element of document.querySelectorAll('.group')) {
    element.style.display = 'block';
  }
}

function checkboxOn(target) {
  target.style.display = 'none';
  document.getElementById('cancle-planb').style.display = 'inline-block';
  document.getElementById('select-planb').style.display = 'block';

  const cols = document.querySelectorAll('.cols');
  let i = 0;
  for (let col of cols) {
    const lectures = col.querySelectorAll('div');
    for (let lecture of lectures) {
      addCheckBox(lecture, i++, false);
    }
  }
  for (let div of document.querySelectorAll('.nontimes > div')) {
    addCheckBox(div, i++, true);
  }
}

function addCheckBox(target, num, isRemote) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.name = checkbox.id = `${num}`;
  checkbox.value = target.getAttribute('data-sid');
  if (!isRemote) {
    checkbox.style.position = 'absolute';
    checkbox.style.right = '0px';
  }
  checkbox.addEventListener('change', (event) => {
    let isChecked = event.target.checked;
    changeCheckState(isChecked, checkbox.value);
  });
  target.prepend(checkbox);
}

function changeCheckState(isChecked, sid) {
  for (let checkbox of document.querySelectorAll(`input[value="${sid}"]`)) {
    checkbox.checked = isChecked;
  }
}

function canclePlanb(target) {
  target.style.display = 'none';
  document.getElementById('generate-planb').style.display = 'block';
  document.getElementById('select-planb').style.display = 'none';
  //document.getElementById('planb-summary').style.display='none';

  for (let checkbox of document.querySelectorAll(
    '.timetable input[type="checkbox"]'
  )) {
    checkbox.remove();
  }
}

function getCheckedLectures() {
  let results = [];
  for (let checkbox of document.querySelectorAll(
    '.timetable input[type="checkbox"]'
  )) {
    if (checkbox.checked) {
      results.push(
        timetables[current_timetable_num].lecture_list.find(
          (item) => item.sid == checkbox.parentElement.getAttribute('data-sid')
        )
      );
    }
  }
  return results;
}

function getPlanb(selected_lectures) {
  selected_lectures.sort();
  console.log('sel: ', selected_lectures);
  if (
    timetables[current_timetable_num].getPlanb(selected_lectures) == undefined
  ) {
    const timetable = new Timetable(
      ++timetable_count,
      false,
      current_timetable_num
    );

    console.log('lect_list:', timetable.lecture_list);
    for (let checkbox of document.querySelectorAll(
      '.timetable input[type="checkbox"]'
    )) {
      if (
        !checkbox.checked &&
        (timetable.lecture_list.length == 0 ||
          !timetable.lecture_list.some(
            (item) =>
              item.sid == checkbox.parentElement.getAttribute('data-sid')
          ))
      ) {
        console.log('fsaf: ', timetables[current_timetable_num].lecture_list);
        timetable.addLecture(
          timetables[current_timetable_num].lecture_list.find(
            (item) =>
              item.sid == checkbox.parentElement.getAttribute('data-sid')
          )
        );
      }
    }

    timetables.push(timetable);
    timetables[current_timetable_num].addPlanb(selected_lectures, timetable);
  }
  return timetables[current_timetable_num].getPlanb(selected_lectures)
    .timetable;
}

function pushRemoveLi(before_timetable, current_timetable, lecture) {
  const remove_ul = document.querySelector('#planb-remove-lecture > ul');
  if (
    !current_timetable.lecture_list.some(
      (element) => element.sid == lecture.sid && element.class == lecture.class
    ) &&
    before_timetable.lecture_list.some(
      (element) => element.sid == lecture.sid && element.class == lecture.class
    )
  ) {
    const li = document.createElement('li');
    li.textContent = `${lecture.name} ${lecture.sid}-${lecture.class}`;
    remove_ul.appendChild(li);
  }
  console.log('pushRemove');
  popAddLi(lecture);
}

function pushAddLi(before_timetable, current_timetable, lecture) {
  const add_ul = document.querySelector('#planb-add-lecture > ul');
  console.log('before:', before_timetable);
  if (
    !before_timetable.lecture_list.some(
      (element) => element.sid == lecture.sid && element.class == lecture.class
    )
  ) {
    const li = document.createElement('li');
    li.textContent = `${lecture.name} ${lecture.sid}-${lecture.class}`;
    add_ul.appendChild(li);
  }

  popRemoveLi(lecture);
}

function popRemoveLi(lecture) {
  const remove_ul = document.querySelector('#planb-remove-lecture > ul');
  for (let li of remove_ul.querySelectorAll('li')) {
    const splited_string = li.textContent.split(' ');
    if (
      splited_string[splited_string.length - 1] ==
      `${lecture.sid}-${lecture.class}`
    ) {
      li.remove();
      break;
    }
  }
}

function popAddLi(lecture) {
  const add_ul = document.querySelector('#planb-add-lecture > ul');
  for (let li of add_ul.querySelectorAll('li')) {
    const splited_string = li.textContent.split(' ');
    if (
      splited_string[splited_string.length - 1] ==
      `${lecture.sid}-${lecture.class}`
    ) {
      li.remove();
      break;
    }
  }
}

function createListRemoveAndAdd(planb, selected_lectures) {
  console.log('planb: ', planb);
  document.getElementById('planb-summary').style.display = 'flex';
  const before_timetable = timetables[planb.before_timetable_num];

  const remove_ul = document.querySelector('#planb-remove-lecture > ul');
  remove_ul.innerHTML = '';
  console.log('before timetable: ', before_timetable);
  console.log('selected: ', selected_lectures);
  for (let element of before_timetable.lecture_list) {
    const sid = element.sid;
    const cls = element.class;

    if (
      !selected_lectures.some(
        (element) => element.sid == sid && element.class == cls
      )
    ) {
      pushRemoveLi(before_timetable, planb, {
        sid: sid,
        class: cls,
        name: before_timetable.lecture_list.find(
          (item) => item.sid == sid && item.class == cls
        ).name,
      });
    }
  }

  const add_ul = document.querySelector('#planb-add-lecture > ul');
  add_ul.innerHTML = '';

  for (let element of planb.lecture_list) {
    const sid = element.sid;
    const cls = element.class;
    pushAddLi(before_timetable, planb, {
      sid: sid,
      class: cls,
      name: planb.lecture_list.find(
        (item) => item.sid == sid && item.class == cls
      ).name,
    });
  }
}

function deleteCheckedElements(lectures) {
  
  for (let lecture of lectures) {
    console.log('fes:', document.querySelectorAll(`[data-sid="${lecture.sid}"]`));
    document
      .querySelectorAll(`[data-sid="${lecture.sid}"]`)
      .forEach((element) => {
        element.remove();
      });
  }
}

document.getElementById('generate-planb').addEventListener('click', (event) => {
  checkboxOn(event.target);
});

document.getElementById('cancle-planb').addEventListener('click', (event) => {
  canclePlanb(event.target);
});

document.getElementById('select-planb').addEventListener('click', (event) => {
  let selected_lectures = getCheckedLectures();
  deleteCheckedElements(selected_lectures);
  document.getElementById('goto-first').style.display = 'inline-block';
  console.log('num: ', current_timetable_num);
  const planb = getPlanb(selected_lectures);
  createListRemoveAndAdd(planb, selected_lectures);
  current_timetable_num = planb.timetable_num;
});

class Timetable {
  lecture_list = [];
  planb_list = [];
  before_timetable_num;
  timetable_num;
  is_root;

  constructor(timetable_num, is_root, before_timetable_num) {
    this.timetable_num = timetable_num;
    this.is_root = is_root;
    this.before_timetable_num = before_timetable_num;
  }

  addPlanb(selected_lectures, timetable) {
    const key = selected_lectures
      .map((item) => `${item.sid}-${item.class}`)
      .join(' ');
    this.planb_list.push({ key: key, timetable: timetable });
  }

  addLecture(lecture) {
    this.lecture_list.push(lecture);
  }

  getPlanb(key) {
    key = key.map((item) => `${item.sid}-${item.class}`).join(' ');
    return this.planb_list.find((item) => item.key === key);
  }

  removeLecture(sid) {
    for (let i = 0; i < this.lecture_list.length; i++) {
      if (lecture[i].sid == sid) {
        this.lecture_list.splice(i, 1);
        break;
      }
    }
  }
}

timetables.push(new Timetable(0, true, 0));
