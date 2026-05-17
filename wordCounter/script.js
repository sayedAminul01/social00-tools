// ========== DOM ELEMENTS ==========
const textInput = document.getElementById('textInput');
const wordCount = document.getElementById('wordCount');
const charCount = document.getElementById('charCount');
const charNoSpaceCount = document.getElementById('charNoSpaceCount');
const sentenceCount = document.getElementById('sentenceCount');
const paragraphCount = document.getElementById('paragraphCount');
const readingTime = document.getElementById('readingTime');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');

// ========== CONSTANTS ==========
const WORDS_PER_MINUTE = 238;
const STORAGE_KEY = 'wordCounterText';

// ========== COUNTING FUNCTIONS ==========
function countWords(text) {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function countCharacters(text) {
  return text.length;
}

function countCharactersNoSpaces(text) {
  return text.replace(/\s/g, '').length;
}

function countSentences(text) {
  if (!text.trim()) return 0;
  const sentences = text.match(/[.!?]+/g);
  return sentences ? sentences.length : 0;
}

function countParagraphs(text) {
  if (!text.trim()) return 0;
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  return paragraphs.length;
}

function calculateReadingTime(words) {
  if (words === 0) return '0s';
  const minutes = Math.floor(words / WORDS_PER_MINUTE);
  const seconds = Math.round((words % WORDS_PER_MINUTE) / WORDS_PER_MINUTE * 60);
  
  if (minutes === 0) {
    return `${seconds}s`;
  } else if (seconds === 0) {
    return `${minutes}m`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
}

// ========== UPDATE STATS ==========
function updateStats() {
  const text = textInput.value;
  
  const words = countWords(text);
  const chars = countCharacters(text);
  const charsNoSpace = countCharactersNoSpaces(text);
  const sentences = countSentences(text);
  const paragraphs = countParagraphs(text);
  const reading = calculateReadingTime(words);
  
  wordCount.textContent = words.toLocaleString();
  charCount.textContent = chars.toLocaleString();
  charNoSpaceCount.textContent = charsNoSpace.toLocaleString();
  sentenceCount.textContent = sentences.toLocaleString();
  paragraphCount.textContent = paragraphs.toLocaleString();
  readingTime.textContent = reading;
  
  // Save to localStorage
  localStorage.setItem(STORAGE_KEY, text);
}

// ========== LOAD SAVED TEXT ==========
function loadSavedText() {
  const savedText = localStorage.getItem(STORAGE_KEY);
  if (savedText) {
    textInput.value = savedText;
    updateStats();
  }
}

// ========== COPY FUNCTIONALITY ==========
function copyText() {
  const text = textInput.value;
  
  if (!text.trim()) {
    showNotification('Nothing to copy!', 'error');
    return;
  }
  
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Text copied to clipboard!', 'success');
  }).catch(() => {
    // Fallback for older browsers
    textInput.select();
    document.execCommand('copy');
    showNotification('Text copied to clipboard!', 'success');
  });
}

// ========== CLEAR FUNCTIONALITY ==========
function clearText() {
  if (!textInput.value.trim()) return;
  
  if (confirm('Are you sure you want to clear all text?')) {
    textInput.value = '';
    updateStats();
    textInput.focus();
    showNotification('Text cleared', 'success');
  }
}

// ========== NOTIFICATION SYSTEM ==========
function showNotification(message, type = 'success') {
  // Remove existing notification
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  
  // Create notification
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${type === 'success' ? '#20d4a8' : '#ef4444'};
    color: #0f1419;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 14px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ========== FAQ ACCORDION ==========
function initFAQ() {
  const faqQuestions = document.querySelectorAll('.faq-question');
  
  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const faqItem = question.parentElement;
      const isActive = faqItem.classList.contains('active');
      
      // Close all FAQs
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
      });
      
      // Open clicked FAQ if it wasn't active
      if (!isActive) {
        faqItem.classList.add('active');
      }
    });
  });
}

// ========== EVENT LISTENERS ==========
textInput.addEventListener('input', updateStats);
copyBtn.addEventListener('click', copyText);
clearBtn.addEventListener('click', clearText);

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K to clear
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    clearText();
  }
  
  // Ctrl/Cmd + Shift + C to copy
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
    e.preventDefault();
    copyText();
  }
});

// ========== ANIMATIONS ==========
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
  loadSavedText();
  initFAQ();
  textInput.focus();
});

// ========== PERFORMANCE OPTIMIZATION ==========
// Debounce localStorage saves for better performance
let saveTimeout;
const originalUpdateStats = updateStats;
updateStats = function() {
  originalUpdateStats();
  
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, textInput.value);
  }, 500);
};
