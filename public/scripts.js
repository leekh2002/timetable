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
        newRow.addEventListener('mouseenter', (event) => {
          addTime(event);
        });
        //console.log('newRow: ',newRow);
        tbody.appendChild(newRow);
      });
      adjustTableWidth();
    });
});

function addTime(event) {
  // console.log('element:', event.target);
  const tdElements = event.target.querySelectorAll('td');
  const name = tdElements[4].textContent;
  const prof_name = tdElements[7].textContent;

  // console.log(tdElements[2].textContent);
  fetch(
    `/process/getTime?sid=${tdElements[2].textContent}&class=${tdElements[3].textContent}`,
    {
      method: 'GET',
    }
  )
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
      const dayDict = {};
      dayDict['월'] = '1';
      dayDict['화'] = '2';
      dayDict['수'] = '3';
      dayDict['목'] = '4';
      dayDict['금'] = '5';
      dayDict['토'] = '6';
      dayDict['일'] = '7';
      data.forEach((element) => {
        console.log(element.day);
        const column = document
          .querySelector(`[data-day='${dayDict[element.day]}']`)
          .getElementsByClassName('cols')[0];
        const div=document.createElement('div');
        div.style.position='absolute';
        div.style.width='113.31px';
        div.className+='subject ';
        div.className+='color3';

        //-------------내일 처리해야할거----fesa----------
        // div.style.top='0px';
        // div.style.height='47.42px';
        //--------------------------------------------
        column.appendChild(div)
        console.log(column);
      });
    });
}
