// Essay Templates and Data
const essayTemplates = {
  argumentative: {
    intro: {
      hook: "Start with a compelling statistic, question, or statement",
      background: "Provide context and explain why this topic matters",
      thesis: "Present your clear position with main arguments"
    },
    bodyPoints: [
      "First main argument supporting your position",
      "Second main argument with evidence",
      "Third main argument with supporting data"
    ],
    conclusion: "Restate thesis, summarize arguments, call to action"
  },
  persuasive: {
    intro: {
      hook: "Grab attention with emotional appeal or striking fact",
      background: "Establish credibility and common ground",
      thesis: "State your position and what you want readers to do"
    },
    bodyPoints: [
      "Emotional appeal with personal stories or examples",
      "Logical reasoning with facts and statistics",
      "Address counterarguments and refute them"
    ],
    conclusion: "Powerful restatement, emotional appeal, clear call to action"
  },
  informative: {
    intro: {
      hook: "Interesting fact or question about the topic",
      background: "Define key terms and scope of information",
      thesis: "State what information you will present"
    },
    bodyPoints: [
      "First key aspect or category of information",
      "Second important element with details",
      "Third significant component with examples"
    ],
    conclusion: "Summarize key information, emphasize importance"
  },
  narrative: {
    intro: {
      hook: "Set the scene with vivid description",
      background: "Introduce characters, setting, and context",
      thesis: "Hint at the story's significance or lesson"
    },
    bodyPoints: [
      "Beginning: Establish situation and conflict",
      "Middle: Develop action and build tension",
      "Climax: Present turning point or key moment"
    ],
    conclusion: "Resolution and reflection on meaning or lesson learned"
  },
  compare: {
    intro: {
      hook: "Introduce both subjects being compared",
      background: "Explain why comparison is meaningful",
      thesis: "State main similarities and differences"
    },
    bodyPoints: [
      "First point of comparison between subjects",
      "Second point showing similarities or differences",
      "Third point with analysis of significance"
    ],
    conclusion: "Synthesize comparison, explain overall significance"
  },
  research: {
    intro: {
      hook: "Present research question or problem",
      background: "Review existing research and knowledge gaps",
      thesis: "State your research argument or findings"
    },
    bodyPoints: [
      "First research finding with evidence from sources",
      "Second finding with scholarly support",
      "Third finding with analysis and interpretation"
    ],
    conclusion: "Summarize findings, implications, future research directions"
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initGenerator();
  initFAQ();
  initBackToTop();
  loadRecentOutline();
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

// Generator Initialization
function initGenerator() {
  const generateBtn = document.getElementById('generateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const clearBtn = document.getElementById('clearBtn');

  generateBtn.addEventListener('click', generateOutline);
  copyBtn.addEventListener('click', copyOutline);
  downloadBtn.addEventListener('click', downloadOutline);
  clearBtn.addEventListener('click', clearOutline);
}

// Generate Outline
function generateOutline() {
  const topic = document.getElementById('essayTopic').value.trim();
  const type = document.getElementById('essayType').value;
  const length = parseInt(document.getElementById('essayLength').value);

  if (!topic) {
    showToast('Please enter an essay topic', 'error');
    return;
  }

  const btn = document.getElementById('generateBtn');
  btn.classList.add('loading');

  // Simulate generation delay for better UX
  setTimeout(() => {
    const outline = createOutline(topic, type, length);
    displayOutline(outline);
    saveOutline({ topic, type, length, outline });
    btn.classList.remove('loading');
    showToast('Outline generated successfully!', 'success');
  }, 800);
}

// Create Outline Structure
function createOutline(topic, type, length) {
  const template = essayTemplates[type];
  const bodyParagraphs = length === 3 ? 1 : length === 5 ? 3 : 5;
  
  const thesis = generateThesis(topic, type);
  
  let outline = {
    title: topic,
    type: type.charAt(0).toUpperCase() + type.slice(1) + ' Essay',
    introduction: {
      hook: template.intro.hook,
      background: template.intro.background,
      thesis: thesis
    },
    body: [],
    conclusion: template.conclusion
  };

  // Generate body paragraphs
  for (let i = 0; i < bodyParagraphs; i++) {
    const pointIndex = i % template.bodyPoints.length;
    outline.body.push({
      title: `Body Paragraph ${i + 1}`,
      topicSentence: template.bodyPoints[pointIndex],
      supportingPoints: generateSupportingPoints(topic, type, i)
    });
  }

  return outline;
}

// Generate Thesis Statement
function generateThesis(topic, type) {
  const thesisTemplates = {
    argumentative: `${topic} significantly impacts society, and this essay argues that [position] through examining [key aspects].`,
    persuasive: `We must take action on ${topic} because it affects [stakeholders] and requires [solution].`,
    informative: `This essay explores ${topic} by examining its key components, significance, and implications.`,
    narrative: `Through the lens of ${topic}, this narrative reveals important insights about [theme/lesson].`,
    compare: `While ${topic} shares similarities in [aspect], they differ significantly in [key differences].`,
    research: `Research on ${topic} demonstrates that [finding], which has important implications for [field/area].`
  };

  return thesisTemplates[type] || `This essay examines ${topic} and its significance.`;
}

// Generate Supporting Points
function generateSupportingPoints(topic, type, index) {
  const points = [
    `Evidence or example supporting the main point about ${topic}`,
    `Statistical data or research findings related to this aspect`,
    `Expert opinion or scholarly perspective on this element`,
    `Analysis connecting evidence back to thesis statement`
  ];

  return points.slice(0, 3);
}

// Display Outline
function displayOutline(outline) {
  const preview = document.getElementById('outlinePreview');
  
  let html = `
    <div class="outline-content">
      <div class="outline-section">
        <h3>📝 Essay Title</h3>
        <p><strong>${outline.title}</strong></p>
        <p><em>${outline.type}</em></p>
      </div>

      <div class="outline-section">
        <h3>🎯 I. Introduction</h3>
        <h4>A. Hook</h4>
        <p>${outline.introduction.hook}</p>
        <h4>B. Background Information</h4>
        <p>${outline.introduction.background}</p>
        <h4>C. Thesis Statement</h4>
        <div class="thesis-box">
          <p>${outline.introduction.thesis}</p>
        </div>
      </div>
  `;

  // Body paragraphs
  outline.body.forEach((para, index) => {
    const romanNumeral = ['II', 'III', 'IV', 'V', 'VI', 'VII'][index];
    html += `
      <div class="outline-section">
        <h3>💡 ${romanNumeral}. ${para.title}</h3>
        <h4>A. Topic Sentence</h4>
        <p>${para.topicSentence}</p>
        <h4>B. Supporting Points</h4>
        <ul>
          ${para.supportingPoints.map((point, i) => 
            `<li>${String.fromCharCode(49 + i)}. ${point}</li>`
          ).join('')}
        </ul>
      </div>
    `;
  });

  // Conclusion
  const conclusionNumeral = ['III', 'IV', 'V', 'VI', 'VII', 'VIII'][outline.body.length];
  html += `
      <div class="outline-section">
        <h3>✅ ${conclusionNumeral}. Conclusion</h3>
        <h4>A. Restate Thesis</h4>
        <p>Rephrase your thesis statement in new words</p>
        <h4>B. Summarize Main Points</h4>
        <p>Briefly recap your key arguments without introducing new information</p>
        <h4>C. Closing Thoughts</h4>
        <p>${outline.conclusion}</p>
      </div>
    </div>
  `;

  preview.innerHTML = html;
}

// Copy Outline
function copyOutline() {
  const preview = document.getElementById('outlinePreview');
  const content = preview.innerText;

  if (!content || content.includes('Your essay outline will appear here')) {
    showToast('No outline to copy', 'error');
    return;
  }

  navigator.clipboard.writeText(content).then(() => {
    showToast('Outline copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy outline', 'error');
  });
}

// Download Outline
function downloadOutline() {
  const preview = document.getElementById('outlinePreview');
  const content = preview.innerText;

  if (!content || content.includes('Your essay outline will appear here')) {
    showToast('No outline to download', 'error');
    return;
  }

  const topic = document.getElementById('essayTopic').value.trim();
  const filename = `${topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_outline.txt`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Outline downloaded!', 'success');
}

// Clear Outline
function clearOutline() {
  const preview = document.getElementById('outlinePreview');
  preview.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">📝</span>
      <p>Your essay outline will appear here</p>
      <p class="empty-hint">Fill in the form and click "Generate Outline"</p>
    </div>
  `;
  
  document.getElementById('essayTopic').value = '';
  document.getElementById('essayType').value = 'argumentative';
  document.getElementById('essayLength').value = '5';
  
  localStorage.removeItem('recentOutline');
  showToast('Outline cleared', 'success');
}

// Save Outline to LocalStorage
function saveOutline(data) {
  try {
    localStorage.setItem('recentOutline', JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage error:', e);
  }
}

// Load Recent Outline
function loadRecentOutline() {
  try {
    const saved = localStorage.getItem('recentOutline');
    if (saved) {
      const data = JSON.parse(saved);
      document.getElementById('essayTopic').value = data.topic;
      document.getElementById('essayType').value = data.type;
      document.getElementById('essayLength').value = data.length;
    }
  } catch (e) {
    console.error('LocalStorage error:', e);
  }
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
