// Form field configurations for each source type
const formFields = {
  website: [
    { id: 'author', label: 'Author(s)', placeholder: 'Last Name, First Name', required: false },
    { id: 'title', label: 'Page Title', placeholder: 'Title of the webpage', required: true },
    { id: 'website', label: 'Website Name', placeholder: 'Name of the website', required: true },
    { id: 'date', label: 'Publication Date', placeholder: 'YYYY-MM-DD', type: 'date', required: false },
    { id: 'url', label: 'URL', placeholder: 'https://example.com', required: true },
    { id: 'accessDate', label: 'Access Date', placeholder: 'YYYY-MM-DD', type: 'date', required: false }
  ],
  book: [
    { id: 'author', label: 'Author(s)', placeholder: 'Last Name, First Name', required: true },
    { id: 'title', label: 'Book Title', placeholder: 'Title of the book', required: true },
    { id: 'publisher', label: 'Publisher', placeholder: 'Publisher name', required: true },
    { id: 'year', label: 'Publication Year', placeholder: 'YYYY', required: true },
    { id: 'city', label: 'Publication City', placeholder: 'City name', required: false }
  ],
  journal: [
    { id: 'author', label: 'Author(s)', placeholder: 'Last Name, First Name', required: true },
    { id: 'title', label: 'Article Title', placeholder: 'Title of the article', required: true },
    { id: 'journal', label: 'Journal Name', placeholder: 'Name of the journal', required: true },
    { id: 'volume', label: 'Volume', placeholder: 'Volume number', required: false },
    { id: 'issue', label: 'Issue', placeholder: 'Issue number', required: false },
    { id: 'year', label: 'Year', placeholder: 'YYYY', required: true },
    { id: 'pages', label: 'Page Range', placeholder: 'e.g., 123-145', required: false },
    { id: 'doi', label: 'DOI', placeholder: 'https://doi.org/...', required: false }
  ],
  newspaper: [
    { id: 'author', label: 'Author(s)', placeholder: 'Last Name, First Name', required: false },
    { id: 'title', label: 'Article Title', placeholder: 'Title of the article', required: true },
    { id: 'newspaper', label: 'Newspaper Name', placeholder: 'Name of the newspaper', required: true },
    { id: 'date', label: 'Publication Date', placeholder: 'YYYY-MM-DD', type: 'date', required: true },
    { id: 'pages', label: 'Page(s)', placeholder: 'e.g., A1, A3-A4', required: false },
    { id: 'url', label: 'URL (if online)', placeholder: 'https://example.com', required: false }
  ],
  youtube: [
    { id: 'author', label: 'Channel/Creator Name', placeholder: 'Channel or creator name', required: true },
    { id: 'title', label: 'Video Title', placeholder: 'Title of the video', required: true },
    { id: 'date', label: 'Upload Date', placeholder: 'YYYY-MM-DD', type: 'date', required: true },
    { id: 'url', label: 'Video URL', placeholder: 'https://youtube.com/watch?v=...', required: true }
  ]
};

// State
let currentFormat = 'apa';
let currentSourceType = 'website';
let recentCitations = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initFormatTabs();
  initSourceTypeSelector();
  initGenerator();
  initFAQ();
  initBackToTop();
  loadRecentCitations();
  renderFormFields();
});

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

// Format Tabs
function initFormatTabs() {
  const tabs = document.querySelectorAll('.format-tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFormat = tab.dataset.format;
    });
  });
}

// Source Type Selector
function initSourceTypeSelector() {
  const selector = document.getElementById('sourceType');
  
  selector.addEventListener('change', (e) => {
    currentSourceType = e.target.value;
    renderFormFields();
  });
}

// Render Form Fields
function renderFormFields() {
  const container = document.getElementById('formFields');
  const fields = formFields[currentSourceType];
  
  container.innerHTML = fields.map(field => `
    <div class="form-group">
      <label for="${field.id}">
        ${field.label}${field.required ? ' *' : ''}
      </label>
      <input 
        type="${field.type || 'text'}" 
        id="${field.id}" 
        placeholder="${field.placeholder}"
        ${field.required ? 'required' : ''}
      >
    </div>
  `).join('');
}

// Generator Initialization
function initGenerator() {
  const generateBtn = document.getElementById('generateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');

  generateBtn.addEventListener('click', generateCitation);
  copyBtn.addEventListener('click', copyCitation);
  clearBtn.addEventListener('click', clearForm);
}

// Generate Citation
function generateCitation() {
  const fields = formFields[currentSourceType];
  const data = {};
  let isValid = true;

  // Collect form data
  fields.forEach(field => {
    const input = document.getElementById(field.id);
    const value = input.value.trim();
    
    if (field.required && !value) {
      isValid = false;
      input.style.borderColor = 'var(--error)';
      setTimeout(() => input.style.borderColor = '', 2000);
    } else {
      data[field.id] = value;
    }
  });

  if (!isValid) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  // Generate citation based on format
  let citation = '';
  
  switch (currentFormat) {
    case 'apa':
      citation = generateAPA(data, currentSourceType);
      break;
    case 'mla':
      citation = generateMLA(data, currentSourceType);
      break;
    case 'chicago':
      citation = generateChicago(data, currentSourceType);
      break;
  }

  displayCitation(citation);
  saveCitation(citation);
  showToast('Citation generated successfully!', 'success');
}

// APA Citation Generator
function generateAPA(data, type) {
  switch (type) {
    case 'website':
      const author = data.author || data.website;
      const date = data.date ? formatDateAPA(data.date) : 'n.d.';
      return `${author}. (${date}). ${data.title}. ${data.website}. ${data.url}`;
    
    case 'book':
      return `${data.author}. (${data.year}). <em>${data.title}</em>. ${data.publisher}.`;
    
    case 'journal':
      const volIssue = data.volume ? `${data.volume}${data.issue ? `(${data.issue})` : ''}` : '';
      const pages = data.pages ? `, ${data.pages}` : '';
      const doi = data.doi ? ` ${data.doi}` : '';
      return `${data.author}. (${data.year}). ${data.title}. <em>${data.journal}</em>, ${volIssue}${pages}.${doi}`;
    
    case 'newspaper':
      const newsDate = formatDateAPA(data.date);
      const newsPages = data.pages ? `, ${data.pages}` : '';
      const newsUrl = data.url ? ` ${data.url}` : '';
      return `${data.author || data.newspaper}. (${newsDate}). ${data.title}. <em>${data.newspaper}</em>${newsPages}.${newsUrl}`;
    
    case 'youtube':
      const ytDate = formatDateAPA(data.date);
      return `${data.author}. (${ytDate}). <em>${data.title}</em> [Video]. YouTube. ${data.url}`;
    
    default:
      return '';
  }
}

// MLA Citation Generator
function generateMLA(data, type) {
  switch (type) {
    case 'website':
      const author = data.author || data.website;
      const date = data.date ? formatDateMLA(data.date) : 'n.d.';
      return `${author}. "${data.title}." <em>${data.website}</em>, ${date}, ${data.url}.`;
    
    case 'book':
      return `${data.author}. <em>${data.title}</em>. ${data.publisher}, ${data.year}.`;
    
    case 'journal':
      const volIssue = data.volume ? `, vol. ${data.volume}${data.issue ? `, no. ${data.issue}` : ''}` : '';
      const pages = data.pages ? `, pp. ${data.pages}` : '';
      return `${data.author}. "${data.title}." <em>${data.journal}</em>${volIssue}, ${data.year}${pages}.`;
    
    case 'newspaper':
      const newsDate = formatDateMLA(data.date);
      const newsPages = data.pages ? `, p. ${data.pages}` : '';
      return `${data.author || data.newspaper}. "${data.title}." <em>${data.newspaper}</em>, ${newsDate}${newsPages}.`;
    
    case 'youtube':
      const ytDate = formatDateMLA(data.date);
      return `${data.author}. "${data.title}." <em>YouTube</em>, ${ytDate}, ${data.url}.`;
    
    default:
      return '';
  }
}

// Chicago Citation Generator
function generateChicago(data, type) {
  switch (type) {
    case 'website':
      const author = data.author || data.website;
      const date = data.date ? data.date.split('-')[0] : 'n.d.';
      const access = data.accessDate ? ` Accessed ${formatDateChicago(data.accessDate)}.` : '';
      return `${author}. ${date}. "${data.title}." ${data.website}.${access} ${data.url}.`;
    
    case 'book':
      const city = data.city ? `${data.city}: ` : '';
      return `${data.author}. ${data.year}. <em>${data.title}</em>. ${city}${data.publisher}.`;
    
    case 'journal':
      const volIssue = data.volume ? ` ${data.volume}${data.issue ? `, no. ${data.issue}` : ''}` : '';
      const pages = data.pages ? `: ${data.pages}` : '';
      return `${data.author}. ${data.year}. "${data.title}." <em>${data.journal}</em>${volIssue}${pages}.`;
    
    case 'newspaper':
      const newsDate = formatDateChicago(data.date);
      return `${data.author || data.newspaper}. ${data.date.split('-')[0]}. "${data.title}." <em>${data.newspaper}</em>, ${newsDate}.`;
    
    case 'youtube':
      const ytYear = data.date.split('-')[0];
      return `${data.author}. ${ytYear}. "${data.title}." YouTube video. ${data.url}.`;
    
    default:
      return '';
  }
}

// Date Formatting Functions
function formatDateAPA(dateStr) {
  const date = new Date(dateStr);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${date.getFullYear()}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function formatDateMLA(dateStr) {
  const date = new Date(dateStr);
  const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 
                  'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateChicago(dateStr) {
  const date = new Date(dateStr);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Display Citation
function displayCitation(citation) {
  const preview = document.getElementById('citationPreview');
  preview.innerHTML = `<div class="citation-text">${citation}</div>`;
}

// Copy Citation
function copyCitation() {
  const preview = document.getElementById('citationPreview');
  const text = preview.innerText;

  if (!text || text.includes('Your citation will appear here')) {
    showToast('No citation to copy', 'error');
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    showToast('Citation copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy citation', 'error');
  });
}

// Clear Form
function clearForm() {
  const fields = formFields[currentSourceType];
  fields.forEach(field => {
    const input = document.getElementById(field.id);
    if (input) input.value = '';
  });

  const preview = document.getElementById('citationPreview');
  preview.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">📚</span>
      <p>Your citation will appear here</p>
      <p class="empty-hint">Fill in the form and click "Generate Citation"</p>
    </div>
  `;

  showToast('Form cleared', 'success');
}

// Save Citation
function saveCitation(citation) {
  const citationData = {
    format: currentFormat.toUpperCase(),
    type: currentSourceType,
    text: citation,
    timestamp: Date.now()
  };

  recentCitations.unshift(citationData);
  recentCitations = recentCitations.slice(0, 5); // Keep only 5 recent

  try {
    localStorage.setItem('recentCitations', JSON.stringify(recentCitations));
    displayRecentCitations();
  } catch (e) {
    console.error('LocalStorage error:', e);
  }
}

// Load Recent Citations
function loadRecentCitations() {
  try {
    const saved = localStorage.getItem('recentCitations');
    if (saved) {
      recentCitations = JSON.parse(saved);
      displayRecentCitations();
    }
  } catch (e) {
    console.error('LocalStorage error:', e);
  }
}

// Display Recent Citations
function displayRecentCitations() {
  if (recentCitations.length === 0) return;

  const container = document.getElementById('recentCitations');
  const list = document.getElementById('recentList');

  list.innerHTML = recentCitations.map((citation, index) => `
    <div class="recent-item" onclick="loadCitation(${index})">
      <span class="recent-format">${citation.format}</span>
      <div class="recent-text">${citation.text}</div>
    </div>
  `).join('');

  container.style.display = 'block';
}

// Load Citation from Recent
function loadCitation(index) {
  const citation = recentCitations[index];
  displayCitation(citation.text);
  showToast('Citation loaded', 'success');
}

// Toast Notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.textContent = message;
  
  const bgColor = type === 'success' ? 'var(--accent-primary)' : 'var(--error)';
  
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 30px;
    background: ${bgColor};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 1000;
    animation: slideIn 0.3s ease;
    font-size: 14px;
    font-weight: 500;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
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
