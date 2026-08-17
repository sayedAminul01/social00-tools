'use strict';

const els = {
  fullName: document.getElementById('fullName'),
  jobTitle: document.getElementById('jobTitle'),
  companyName: document.getElementById('companyName'),
  yearsExp: document.getElementById('yearsExp'),
  keySkills: document.getElementById('keySkills'),
  generateBtn: document.getElementById('generateBtn'),
  clearBtn: document.getElementById('clearBtn'),
  letterWrap: document.getElementById('letterWrap'),
};

/* Joins a skills array into natural prose: "SEO", "SEO and content strategy",
   or "SEO, content strategy, and team leadership" (Oxford comma).
   Reused from resumeSummaryGenerator/script.js. */
function joinSkills(skills) {
  if (skills.length === 0) return '';
  if (skills.length === 1) return skills[0];
  if (skills.length === 2) return `${skills[0]} and ${skills[1]}`;
  return `${skills.slice(0, -1).join(', ')}, and ${skills[skills.length - 1]}`;
}

function parseSkills(raw) {
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/* Template bank: 3 variants per paragraph per tone. Each function takes the
   assembled data object and returns a finished sentence/paragraph string.
   {jobTitle} / {company} are woven in directly rather than via find-replace
   so each variant can phrase the reference differently. */
const TEMPLATES = {
  professional: {
    opening: [
      (d) => `I am writing to express my interest in the ${d.jobTitle} position at ${d.company}. With a strong professional background and a genuine interest in the work your team does, I believe I would be a valuable addition to your organization.`,
      (d) => `I was pleased to see the opening for ${d.jobTitle} at ${d.company}, and I am writing to formally apply for the role. The position aligns closely with my professional background and the direction I want my career to take.`,
      (d) => `Please accept this letter as my application for the ${d.jobTitle} position at ${d.company}. Having followed your organization's work, I am confident this role is a strong match for my experience and professional goals.`,
    ],
    fit: [
      (d) => `In my career, I have built ${d.yearsPhrase} in ${d.skillsText}. I have consistently applied these skills to solve real problems, meet deadlines, and support the goals of the teams I work with.`,
      (d) => `My background includes ${d.yearsPhrase} across ${d.skillsText}, which has prepared me to contribute from day one. I take a methodical approach to my work and am comfortable adapting to new tools, processes, and priorities.`,
      (d) => `Over ${d.yearsPhrase}, I have developed a solid foundation in ${d.skillsText}. I bring both technical capability and a collaborative mindset, and I am confident these strengths would translate well to the ${d.jobTitle} role.`,
    ],
    value: [
      () => `What sets me apart is my ability to combine attention to detail with a results-oriented mindset. I hold myself to a high standard, communicate clearly with stakeholders, and follow through on commitments without needing close supervision.`,
      () => `I bring a track record of reliability, sound judgment, and steady performance under pressure. Colleagues and managers have consistently described me as someone who takes ownership of problems and sees them through to resolution.`,
      () => `Beyond technical skill, I offer strong organizational habits and a proactive approach to problem-solving. I look for ways to improve processes rather than simply completing tasks, and I take pride in the quality of my work.`,
    ],
    closing: [
      (d) => `I would welcome the opportunity to discuss how my background aligns with the needs of ${d.company} in more detail. Thank you for your time and consideration — I look forward to the possibility of speaking further.`,
      (d) => `I would appreciate the chance to speak with you about this opportunity and how I can contribute to ${d.company}. Thank you for reviewing my application; I look forward to hearing from you.`,
      (d) => `Thank you for considering my application for the ${d.jobTitle} position. I would be glad to provide any additional information and look forward to the opportunity to discuss my candidacy further.`,
    ],
  },
  enthusiastic: {
    opening: [
      (d) => `I was genuinely excited to see the ${d.jobTitle} opening at ${d.company} — it's exactly the kind of opportunity I've been hoping to find, and I'd love the chance to bring my energy and skills to your team.`,
      (d) => `The moment I came across the ${d.jobTitle} role at ${d.company}, I knew I had to apply. I've long admired what your team does, and I'm thrilled at the possibility of contributing to it.`,
      (d) => `I'm thrilled to apply for the ${d.jobTitle} position at ${d.company}! This role is a fantastic match for my background, and I can't wait for the opportunity to show what I can bring to your team.`,
    ],
    fit: [
      (d) => `Over ${d.yearsPhrase}, I've had the chance to dig deep into ${d.skillsText} — and I've loved every bit of it. I bring genuine enthusiasm to everything I work on, along with the practical skills to back it up.`,
      (d) => `I've spent ${d.yearsPhrase} building my skills in ${d.skillsText}, and I'm always looking for the next challenge to grow further. I thrive in environments where I can jump in, learn fast, and make an impact quickly.`,
      (d) => `My experience in ${d.skillsText}, developed over ${d.yearsPhrase}, has given me both confidence and capability. I get genuinely energized by solving problems in this space, and I'd bring that same energy to the ${d.jobTitle} role.`,
    ],
    value: [
      () => `I bring more than just skills — I bring energy, curiosity, and a genuine drive to do great work. I love collaborating with a team, celebrating wins together, and finding creative solutions when things get tricky.`,
      () => `What I offer is enthusiasm backed by follow-through: I show up motivated, I'm quick to learn, and I genuinely enjoy the work itself, which keeps me pushing for the best possible outcome on every project.`,
      (d) => `I'm the kind of person who gets excited about the details, not just the big picture. That passion, paired with a strong work ethic, is what I'd bring to ${d.company} every single day.`,
    ],
    closing: [
      (d) => `I would absolutely love the chance to talk more about this opportunity — thank you so much for considering my application! I'm excited about the possibility of joining ${d.company} and can't wait to hear from you.`,
      (d) => `Thank you for taking the time to review my application! I'd be thrilled to discuss the ${d.jobTitle} role further and share more about what I could bring to ${d.company}.`,
      () => `I can't wait for the opportunity to speak with you further. Thank you for your consideration, and I hope to hear from you soon about next steps!`,
    ],
  },
  concise: {
    opening: [
      (d) => `I'm applying for the ${d.jobTitle} position at ${d.company}. My background is a strong match for this role, and I'm confident I can add value quickly.`,
      (d) => `Please consider this my application for ${d.jobTitle} at ${d.company}. I believe my experience makes me a strong candidate for the role.`,
      (d) => `I'd like to apply for the ${d.jobTitle} opening at ${d.company}. My skills and experience line up well with what this position requires.`,
    ],
    fit: [
      (d) => `I have ${d.yearsPhrase} in ${d.skillsText}. I apply these skills directly to deliver results without unnecessary overhead.`,
      (d) => `My background covers ${d.yearsPhrase} in ${d.skillsText}, giving me the tools to contribute from the start.`,
      (d) => `With ${d.yearsPhrase} in ${d.skillsText}, I'm equipped to handle the core demands of the ${d.jobTitle} role immediately.`,
    ],
    value: [
      () => `I focus on clear communication, efficient execution, and dependable results. I get things done without needing extra oversight.`,
      () => `I bring practical experience, a direct work style, and consistent follow-through on every task I take on.`,
      () => `My approach is straightforward: understand the goal, do the work well, and deliver on time.`,
    ],
    closing: [
      () => `I'd welcome the chance to discuss this further. Thank you for your time.`,
      () => `Happy to provide more detail on request. Thank you for considering my application.`,
      () => `I look forward to discussing next steps. Thank you for your consideration.`,
    ],
  },
};

/* Remembers the last index picked per paragraph slot so "Regenerate" avoids
   immediately repeating the same combination when a bank has more than one
   option. Reset whenever a fresh generation starts from cleared fields. */
const lastPicks = { opening: -1, fit: -1, value: -1, closing: -1 };

function pickTemplate(bank, slot) {
  if (bank.length === 1) return bank[0];
  let index = Math.floor(Math.random() * bank.length);
  if (index === lastPicks[slot]) {
    index = (index + 1) % bank.length;
  }
  lastPicks[slot] = index;
  return bank[index];
}

function buildLetter(data) {
  const bank = TEMPLATES[data.tone];
  const opening = pickTemplate(bank.opening, 'opening')(data);
  const fit = pickTemplate(bank.fit, 'fit')(data);
  const value = pickTemplate(bank.value, 'value')(data);
  const closing = pickTemplate(bank.closing, 'closing')(data);

  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return {
    date,
    salutation: 'Dear Hiring Manager,',
    paragraphs: [opening, fit, value, closing],
    name: data.fullName,
  };
}

function letterToPlainText(letter) {
  return [
    letter.date,
    '',
    letter.salutation,
    '',
    ...letter.paragraphs.flatMap(p => [p, '']),
    'Sincerely,',
    letter.name,
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let currentLetter = null;
let currentData = null;

function renderLetter(letter) {
  const plainText = letterToPlainText(letter);
  currentLetter = letter;

  els.letterWrap.innerHTML = `
    <div class="letter-doc" id="letterDoc">
      <p class="letter-date">${escapeHtml(letter.date)}</p>
      <div class="letter-body">
        <p>${escapeHtml(letter.salutation)}</p>
        ${letter.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')}
      </div>
      <div class="letter-signoff">
        <p>Sincerely,</p>
        <p class="sign-name">${escapeHtml(letter.name)}</p>
      </div>
    </div>
    <div class="letter-toolbar">
      <span class="letter-count" id="letterCount">${countWords(plainText)} words</span>
      <div class="letter-actions">
        <button class="btn-regenerate" id="regenerateBtn" type="button">🔄 Regenerate</button>
        <button class="btn-copy" id="copyLetterBtn" type="button">Copy Full Letter</button>
      </div>
    </div>
  `;

  document.getElementById('regenerateBtn').addEventListener('click', () => {
    if (!currentData) return;
    renderLetter(buildLetter(currentData));
  });
  document.getElementById('copyLetterBtn').addEventListener('click', () => {
    copyToClipboard(letterToPlainText(currentLetter), 'Cover letter copied');
  });
}

function showEmptyState(message) {
  els.letterWrap.innerHTML = `<p class="results-empty">${escapeHtml(message)}</p>`;
}

function generate() {
  const fullName = els.fullName.value.trim();
  const jobTitle = els.jobTitle.value.trim();
  const companyName = els.companyName.value.trim();
  const yearsRaw = els.yearsExp.value.trim();
  const skills = parseSkills(els.keySkills.value);
  const toneInput = document.querySelector('input[name="tone"]:checked');
  const tone = toneInput ? toneInput.value : 'professional';

  if (!fullName) {
    showToast('Please enter your name');
    els.fullName.focus();
    return;
  }
  if (!jobTitle) {
    showToast('Please enter the job title');
    els.jobTitle.focus();
    return;
  }
  if (!companyName) {
    showToast('Please enter the company name');
    els.companyName.focus();
    return;
  }

  const years = yearsRaw && !isNaN(Number(yearsRaw)) && Number(yearsRaw) > 0
    ? String(Math.round(Number(yearsRaw)))
    : '';
  const yearsPhrase = years ? `${years} year${years === '1' ? '' : 's'} of experience` : 'hands-on experience';
  const skillsText = skills.length ? joinSkills(skills) : 'a range of relevant skills';

  currentData = {
    fullName,
    jobTitle,
    company: companyName,
    yearsPhrase,
    skillsText,
    tone,
  };

  renderLetter(buildLetter(currentData));
}

els.generateBtn.addEventListener('click', generate);

els.clearBtn.addEventListener('click', () => {
  els.fullName.value = '';
  els.jobTitle.value = '';
  els.companyName.value = '';
  els.yearsExp.value = '';
  els.keySkills.value = '';
  const defaultTone = document.querySelector('input[name="tone"][value="professional"]');
  if (defaultTone) defaultTone.checked = true;
  currentData = null;
  currentLetter = null;
  showEmptyState('Fill in the fields above and click "Generate Cover Letter" to see your draft.');
  els.fullName.focus();
});

[els.fullName, els.jobTitle, els.companyName, els.yearsExp, els.keySkills].forEach(input => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      generate();
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('writing');
});
