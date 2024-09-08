const category = document.getElementById('courseCategory');
const department = document.getElementById('departments');
let width_value = '113.31px';

document.addEventListener('DOMContentLoaded', function () {});

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
const searchForm = document.getElementById('searchForm');

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
        newRow.addEventListener('mouseenter', function (event) {
          enterEvent(event);
        });
        newRow.addEventListener('mouseleave', function (event) {
          leaveEvent(event);
        });

        addButton.addEventListener('click', (event) => {
          clickEvent(param_row);
        });
        tbody.appendChild(newRow);
      });
      adjustTableWidth();
    });
});

let class_num2 = 0;
let color_num = 0;
let displayed_element = [];

function enterEvent(event) {
  displayTime(event.target.querySelectorAll('td'), 10, '0.2', 0);
}

function leaveEvent(event) {
  removeElements(displayed_element);
}

let sid_set = [];
async function clickEvent(row) {
  const td = row.querySelectorAll('td');
  let i;
  for (i = 0; i < sid_set.length; i++) {
    if (td[2].textContent == sid_set[i]) {
      alert('동일한 과목코드를 가진 과목은 두개 이상 담을 수 없습니다.');
      break;
    }
  }
  if (i < sid_set.length) return;

  await displayTime(td, color_num++ % 10, '1', 1);
  let flag = 0;
  displayed_element.forEach((element) => {
    element.remove();
  });
  if (td[8].textContent == '') {
    const nontime = document.querySelector('.nontimes');
    const div = document.createElement('div');
    const span = document.createElement('span');
    const img = new Image();

    div.setAttribute('data-sid', td[2].textContent);
    div.className += 'subject';

    span.className += 'name';
    span.textContent = td[4].textContent;
    span.style.setProperty('font-size', '15px', 'important');

    img.src = `./image/bin.png`;
    img.alt = 'bin';
    img.addEventListener('click', (event) => {
      const parent = img.parentElement;
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
    sid_set.push(td[2].textContent);
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
                console.log('div: ', element,' ',i);
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
          removeElements(
            document.querySelectorAll('.' + `${parent.classList[0]}`)
          );
        });
        h5.textContent = td[4].textContent;
        em.textContent = td[7].textContent;
        span.textContent = element.dataset.place;
        p.appendChild(em);
        p.appendChild(span);
        element.appendChild(h5);
        element.appendChild(p);
        element.appendChild(img);

      });
    sid_set.push(td[2].textContent);
  }
}

function removeElements(elements) {
  elements.forEach((element) => {
    element.remove();
  });
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
        div.style.overflow = 'hidden';
        column.appendChild(div);
        div.setAttribute('data-place', element.place);
        div.setAttribute('data-sid', tdElements[2].textContent);
        if (op == 0) displayed_element.push(div);
        i++;
      });
      if (op == 1) class_num2++;
    });
}

document.querySelector('.goto-generator').addEventListener('click', function() {
  document.querySelector('.days-table').style.display = 'none';
  document.querySelector('.timetable').style.display = 'none';
  document.querySelector('.nontimes').style.display = 'none';

  // 'filtering-section', 'add-group', 'subject-group' 표시
  document.querySelector('.filtering-section').style.display = 'grid';
  document.querySelector('.add-group').style.display = 'block';
  document.querySelector('.subject-group').style.display = 'block';
  // document.querySelector('.goto-generator').style.display='none';
});