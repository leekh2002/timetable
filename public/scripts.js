const category = document.getElementById('courseCategory');
const department = document.getElementById('departments');

document.addEventListener('DOMContentLoaded', function () {});

const categoryAndDeptfromdb = (category, department) => {
  fetch('/categoryanddeptfromdb', {
    method: 'GET',
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
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
const searchForm = document.getElementById('searchForm');

function adjustTableWidth() {
  const thead = document.querySelector('.results-section .output_result thead');
  const tbody = document.querySelector('.results-section .output_result tbody');
  const element = document.querySelector('.output_result');
  const scrollbarWidth = 17;

  console.log('height: ', element.scrollHeight);
  if (element.scrollHeight >= 400) {
    console.log('height: ', element.scrollHeight);
    thead.style.width = 'calc(100% - ' + scrollbarWidth + 'px)';
  } else {
    thead.style.width = '100%';
  }
  tbody.style.width = '100%'; // tbody는 항상 100% 너비를 유지
  console.log('asefsaeiohf;seaoidjaelsifh');
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
  //console.log('tbody:',tbody);
  //console.log(name, major);
  tbody.replaceChildren();

  const queryString = `inst_method=${encodeURIComponent(
    inst_method
  )}&course_class=${encodeURIComponent(
    course_class
  )}&prof_name=${encodeURIComponent(prof_name)}&major=${encodeURIComponent(
    major
  )}&name=${encodeURIComponent(name)}`;

  console.log(formData);
  fetch(`/process/search?${queryString}`, {
    method: 'GET',
  })
    .then((res) => res.json())
    .then((data) => {
      // console.log(data);
      data.forEach((element) => {
        const keys = Object.keys(element);
        const newRow = document.createElement('tr');
        // console.log('keys: ',keys)
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
        newRow.addEventListener('mouseenter', function (event) {
          enterEvent(event);
        });
        newRow.addEventListener('mouseleave', function (event) {
          leaveEvent(event);
        });
        newRow.addEventListener('click', (event) => {
          console.log(param_row);
          clickEvent(param_row, name, prof_name);
        });
        //console.log('newRow: ',newRow);
        tbody.appendChild(newRow);
      });
      adjustTableWidth();
    });
});

let class_num2 = 0;
let color_num = 0;

function enterEvent(event) {
  displayTime(event.target.querySelectorAll('td'), 10, '0.2', 0);
}

let displayed_element = [];

function leaveEvent(event) {
  displayed_element.forEach((element) => {
    element.remove();
  });
}
let k = 0;
async function clickEvent(row, name, prof_name) {
  console.log('k: ', k++);
  const td = row.querySelectorAll('td');
  await displayTime(td, color_num++ % 10, '1', 1);
  let flag = 0;
  displayed_element.forEach((element) => {
    element.remove();
  });
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
        // console.log('element: ', element.style.top);
        // console.log('element2: ',  Number(elemenㄹㄴㄷt2.style.top.split('px')[0]) + Number(element2.style.height.split('px')[0]));
        if (
          (e1_topval+2 >= e2_topval && e2_topval + e2_heival > e1_topval+2) ||
          (e1_topval <= e2_topval+2 && e1_topval + e1_heival > e2_topval+2)
        ) {
          flag = 1;
          return;
        }
      }
    });
    if (flag == 1) return;
  });
  if (flag == 1) {
    document
      .querySelectorAll('.col' + `${class_num2 - 1}`)
      .forEach((element) => {
        element.remove();
      });
    alert('해당시간과 겹치는 강의가 있습니다.');
  }
}

async function displayTime(tdElements, color, opacity, op) {
  const name = tdElements[4].textContent;
  const prof_name = tdElements[7].textContent;
  await fetch(
    `/process/getTime?sid=${tdElements[2].textContent}&class=${tdElements[3].textContent}`,
    {
      method: 'GET',
    }
  )
    .then((res) => res.json())
    .then((data) => {
      const dayDict = {};
      dayDict['월'] = '1';
      dayDict['화'] = '2';
      dayDict['수'] = '3';
      dayDict['목'] = '4';
      dayDict['금'] = '5';
      dayDict['토'] = '6';
      dayDict['일'] = '7';
      let i = 0;
      data.forEach((element) => {
        if (element.day == null) return;
        const column = document
          .querySelector(`[data-day='${dayDict[element.day]}']`)
          .getElementsByClassName('cols')[0];

        const div = document.createElement('div');
        if (op == 1) div.className += 'col' + `${class_num2} `;

        div.style.position = 'absolute';
        div.style.width = '113.31px';
        div.className += 'color' + `${color}`;
        //div.style.backgroundColor = color;
        div.style.opacity = opacity;
        //div.style.filter = 'grayscale(100%)';

        const start = element.time.split('~')[0];
        const end = element.time.split('~')[1];
        const start_hour = Number(start.split(':')[0]);
        const start_min = Number(start.split(':')[1]);
        const end_hour = Number(end.split(':')[0]);
        const end_min = Number(end.split(':')[1]);
        div.style.top =
          `${(((start_hour - 8) * 60 + start_min) / 960) * 758.72}` + 'px';
        div.style.height =
          `${
            ((end_hour * 60 + end_min - (start_hour * 60 + start_min)) / 60) *
            47.42
          }` + 'px';

        column.appendChild(div);
        if (op == 0) displayed_element.push(div);
        i++;
      });
      if (op == 1) class_num2++;
    });
}
