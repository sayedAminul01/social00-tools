// State
let subjectCount = 0;
let semesterCount = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initThemeToggle();
  initSemesterGPA();
  initCGPA();
  initGPAToPercent();
  initPercentToGPA();
  initFAQ();
  initBackToTop();
  loadSavedData();
});

// Tab Switching
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });
}

// Theme Toggle
function initThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  const icon = toggle.querySelector('.theme-icon');
  const savedTheme = localStorage.getItem('theme') || 'dark';
  
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    icon.textContent = '☀️';
  }

  toggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    icon.textContent = newTheme === 'light' ? '☀️' : '🌙';
    localStorage.setItem('theme', newTheme);
  });
}

// Semester GPA Calculator
function initSemesterGPA() {
  const addBtn = document.getElementById('addSubject');
  const resetBtn = document.getElementById('resetSemester');
  const copyBtn = document.getElementById('copySemester');
  
  addBtn.addEventListener('click', () => addSubject());
  resetBtn.addEventListener('click', resetSemesterGPA);
  copyBtn.addEventListener('click', () => copyResult('semester'));
  
  // Add initial subjects
  for (let i = 0; i < 3; i++) addSubject();
}

function addSubject() {
  const list = document.getElementById('subjectsList');
  const scale = document.getElementById('semesterScale').value;
  const id = ++subjectCount;
  
  const row = document.createElement('div');
  row.className = 'subject-row';
  row.dataset.id = id;
  row.innerHTML = `
    <input type="text" placeholder="Subject name" class="subject-name">
    <input type="number" placeholder="Grade (0-${scale})" step="0.01" min="0" max="${scale}" class="subject-grade">
    <input type="number" placeholder="Credits" step="1" min="1" value="3" class="subject-credits">
    <button class="btn-remove" onclick="removeSubject(${id})">×</button>
  `;
  
  list.appendChild(row);
  
  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', calculateSemesterGPA);
  });
  
  calculateSemesterGPA();
}

function removeSubject(id) {
  const row = document.querySelector(`.subject-row[data-id="${id}"]`);
  if (row) {
    row.remove();
    calculateSemesterGPA();
  }
}

function calculateSemesterGPA() {
  const rows = document.querySelectorAll('.subject-row');
  const scale = parseFloat(document.getElementById('semesterScale').value);
  let totalPoints = 0;
  let totalCredits = 0;
  
  rows.forEach(row => {
    const grade = parseFloat(row.querySelector('.subject-grade').value) || 0;
    const credits = parseFloat(row.querySelector('.subject-credits').value) || 0;
    
    if (grade > 0 && credits > 0) {
      totalPoints += grade * credits;
      totalCredits += credits;
    }
  });
  
  const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
  
  const resultBox = document.getElementById('semesterResult');
  resultBox.querySelector('.result-value').textContent = gpa;
  resultBox.querySelector('.result-meta').textContent = 
    totalCredits > 0 ? `Based on ${totalCredits} credit hours` : 'Add subjects to calculate';
  
  saveData('semesterGPA', gpa);
}

function resetSemesterGPA() {
  document.getElementById('subjectsList').innerHTML = '';
  subjectCount = 0;
  for (let i = 0; i < 3; i++) addSubject();
  calculateSemesterGPA();
}

// CGPA Calculator
function initCGPA() {
  const addBtn = document.getElementById('addSemester');
  const resetBtn = document.getElementById('resetCGPA');
  const copyBtn = document.getElementById('copyCGPA');
  
  addBtn.addEventListener('click', () => addSemester());
  resetBtn.addEventListener('click', resetCGPA);
  copyBtn.addEventListener('click', () => copyResult('cgpa'));
  
  // Add initial semesters
  for (let i = 0; i < 2; i++) addSemester();
}

function addSemester() {
  const list = document.getElementById('semestersList');
  const scale = document.getElementById('cgpaScale').value;
  const id = ++semesterCount;
  
  const row = document.createElement('div');
  row.className = 'semester-row';
  row.dataset.id = id;
  row.innerHTML = `
    <input type="text" placeholder="Semester ${id}" class="semester-name" value="Semester ${id}">
    <input type="number" placeholder="GPA (0-${scale})" step="0.01" min="0" max="${scale}" class="semester-gpa">
    <input type="number" placeholder="Credits" step="1" min="1" value="15" class="semester-credits">
    <button class="btn-remove" onclick="removeSemester(${id})">×</button>
  `;
  
  list.appendChild(row);
  
  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', calculateCGPA);
  });
  
  calculateCGPA();
}

function removeSemester(id) {
  const row = document.querySelector(`.semester-row[data-id="${id}"]`);
  if (row) {
    row.remove();
    calculateCGPA();
  }
}

function calculateCGPA() {
  const rows = document.querySelectorAll('.semester-row');
  let totalPoints = 0;
  let totalCredits = 0;
  
  rows.forEach(row => {
    const gpa = parseFloat(row.querySelector('.semester-gpa').value) || 0;
    const credits = parseFloat(row.querySelector('.semester-credits').value) || 0;
    
    if (gpa > 0 && credits > 0) {
      totalPoints += gpa * credits;
      totalCredits += credits;
    }
  });
  
  const cgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
  
  const resultBox = document.getElementById('cgpaResult');
  resultBox.querySelector('.result-value').textContent = cgpa;
  resultBox.querySelector('.result-meta').textContent = 
    totalCredits > 0 ? `Based on ${rows.length} semesters` : 'Add semesters to calculate';
  
  saveData('cgpa', cgpa);
}

function resetCGPA() {
  document.getElementById('semestersList').innerHTML = '';
  semesterCount = 0;
  for (let i = 0; i < 2; i++) addSemester();
  calculateCGPA();
}

// GPA to Percentage
function initGPAToPercent() {
  const input = document.getElementById('gpaInput');
  const scale = document.getElementById('gpaToPercentScale');
  const resetBtn = document.getElementById('resetGpaToPercent');
  const copyBtn = document.getElementById('copyGpaToPercent');
  
  input.addEventListener('input', convertGPAToPercent);
  scale.addEventListener('change', () => {
    input.max = scale.value;
    convertGPAToPercent();
  });
  
  resetBtn.addEventListener('click', () => {
    input.value = '';
    convertGPAToPercent();
  });
  
  copyBtn.addEventListener('click', () => copyResult('gpaToPercent'));
}

function convertGPAToPercent() {
  const gpa = parseFloat(document.getElementById('gpaInput').value) || 0;
  const scale = parseFloat(document.getElementById('gpaToPercentScale').value);
  
  let percentage = 0;
  
  if (scale === 10) {
    percentage = gpa * 9.5;
  } else {
    percentage = (gpa / scale) * 100;
  }
  
  percentage = Math.min(percentage, 100).toFixed(2);
  
  const resultBox = document.getElementById('gpaToPercentResult');
  resultBox.querySelector('.result-value').textContent = percentage + '%';
  resultBox.querySelector('.result-meta').textContent = 
    gpa > 0 ? `GPA ${gpa} on ${scale}.0 scale` : 'Enter GPA to convert';
  
  saveData('gpaToPercent', percentage);
}

// Percentage to GPA
function initPercentToGPA() {
  const input = document.getElementById('percentInput');
  const scale = document.getElementById('percentToGpaScale');
  const resetBtn = document.getElementById('resetPercentToGpa');
  const copyBtn = document.getElementById('copyPercentToGpa');
  
  input.addEventListener('input', convertPercentToGPA);
  scale.addEventListener('change', convertPercentToGPA);
  
  resetBtn.addEventListener('click', () => {
    input.value = '';
    convertPercentToGPA();
  });
  
  copyBtn.addEventListener('click', () => copyResult('percentToGpa'));
}

function convertPercentToGPA() {
  const percent = parseFloat(document.getElementById('percentInput').value) || 0;
  const scale = parseFloat(document.getElementById('percentToGpaScale').value);
  
  let gpa = 0;
  
  if (scale === 10) {
    gpa = percent / 9.5;
  } else {
    gpa = (percent / 100) * scale;
  }
  
  gpa = Math.min(gpa, scale).toFixed(2);
  
  const resultBox = document.getElementById('percentToGpaResult');
  resultBox.querySelector('.result-value').textContent = gpa;
  resultBox.querySelector('.result-meta').textContent = 
    percent > 0 ? `${percent}% on ${scale}.0 scale` : 'Enter percentage to convert';
  
  saveData('percentToGpa', gpa);
}

// Copy Result
function copyResult(type) {
  let text = '';
  
  switch(type) {
    case 'semester':
      text = document.querySelector('#semesterResult .result-value').textContent;
      break;
    case 'cgpa':
      text = document.querySelector('#cgpaResult .result-value').textContent;
      break;
    case 'gpaToPercent':
      text = document.querySelector('#gpaToPercentResult .result-value').textContent;
      break;
    case 'percentToGpa':
      text = document.querySelector('#percentToGpaResult .result-value').textContent;
      break;
  }
  
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!');
  });
}

// Toast Notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 30px;
    background: var(--accent-primary);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// FAQ Accordion
function initFAQ() {
  const questions = document.querySelectorAll('.faq-question');
  
  questions.forEach(question => {
    question.addEventListener('click', () => {
      const item = question.parentElement;
      const isActive = item.classList.contains('active');
      
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
      
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

// Back to Top
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  });
  
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// LocalStorage
function saveData(key, value) {
  try {
    localStorage.setItem(`gpa_${key}`, value);
  } catch (e) {
    console.error('LocalStorage error:', e);
  }
}

function loadSavedData() {
  try {
    const savedGPA = localStorage.getItem('gpa_semesterGPA');
    const savedCGPA = localStorage.getItem('gpa_cgpa');
    
    if (savedGPA) {
      document.querySelector('#semesterResult .result-value').textContent = savedGPA;
    }
    
    if (savedCGPA) {
      document.querySelector('#cgpaResult .result-value').textContent = savedCGPA;
    }
  } catch (e) {
    console.error('LocalStorage error:', e);
  }
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);
