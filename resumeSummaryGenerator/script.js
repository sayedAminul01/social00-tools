'use strict';

const els = {
  jobTitle: document.getElementById('jobTitle'),
  yearsExp: document.getElementById('yearsExp'),
  keySkills: document.getElementById('keySkills'),
  achievement: document.getElementById('achievement'),
  generateBtn: document.getElementById('generateBtn'),
  clearBtn: document.getElementById('clearBtn'),
  resultsList: document.getElementById('resultsList'),
};

/* Joins a skills array into natural prose: "SEO", "SEO and content strategy",
   or "SEO, content strategy, and team leadership" (Oxford comma). */
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

/* Lowercases the first letter of an achievement clause so it reads
   naturally after a lead-in like "Notably, ..." */
function lowerFirst(str) {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/* Bank of 5-6 distinct summary structures. Each returns the core 2-3
   sentence summary; `achievementLine(achievement)` returns the optional
   trailing sentence, only appended when the user supplied one. Varying
   the lead-in phrase per template keeps the achievement sentence from
   reading identically across variants. */
const TEMPLATES = [
  {
    body: ({ title, years, skills }) =>
      `Results-driven ${title} with ${years} years of experience in ${skills}. Proven ability to manage priorities, collaborate across teams, and deliver measurable results in fast-paced environments.`,
    achievementLine: (a) => `Notably, ${lowerFirst(a)}.`,
  },
  {
    body: ({ title, years, skills }) =>
      `${title} professional bringing ${years}+ years of hands-on expertise in ${skills} to deliver measurable results for employers and clients alike.`,
    achievementLine: (a) => `Key highlight: ${lowerFirst(a)}.`,
  },
  {
    body: ({ title, years, skills }) =>
      `Accomplished ${title} with a ${years}-year track record in ${skills}, known for translating strategy into execution and keeping projects on time and on budget.`,
    achievementLine: (a) => `Most recently, ${lowerFirst(a)}.`,
  },
  {
    body: ({ title, years, skills }) =>
      `Dedicated ${title} offering ${years} years of experience across ${skills}. Skilled at building processes that scale and communicating clearly with stakeholders at every level.`,
    achievementLine: (a) => `Achievement highlight: ${lowerFirst(a)}.`,
  },
  {
    body: ({ title, years, skills }) =>
      `Detail-oriented ${title} with ${years} years in ${skills}, combining analytical rigor with strong communication to solve problems efficiently and drive team performance.`,
    achievementLine: (a) => `Standout result: ${lowerFirst(a)}.`,
  },
  {
    body: ({ title, years, skills }) =>
      `${years}-year veteran ${title} specializing in ${skills}, recognized for consistently exceeding goals and mentoring junior team members along the way.`,
    achievementLine: (a) => `For example, ${lowerFirst(a)}.`,
  },
];

function buildSummary(template, data) {
  let text = template.body(data);
  if (data.achievement) {
    text += ' ' + template.achievementLine(data.achievement);
  }
  return text;
}

/* Fisher-Yates shuffle, used to pick 5 of the 6 templates each run so
   repeat generations don't always show the same combination/order. */
function shuffled(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function countWords(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function renderResults(summaries) {
  els.resultsList.innerHTML = summaries.map((text, i) => `
    <div class="summary-card">
      <span class="summary-index">Variant ${i + 1}</span>
      <p class="summary-text">${escapeHtml(text)}</p>
      <div class="summary-meta">
        <span class="summary-counts">${countWords(text)} words &middot; ${text.length} characters</span>
        <button class="btn-copy-sm" data-copy-index="${i}">Copy</button>
      </div>
    </div>
  `).join('');

  els.resultsList.querySelectorAll('[data-copy-index]').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      copyToClipboard(summaries[i], `Variant ${i + 1} copied`);
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showEmptyState(message) {
  els.resultsList.innerHTML = `<p class="results-empty">${escapeHtml(message)}</p>`;
}

function generate() {
  const title = els.jobTitle.value.trim();
  const yearsRaw = els.yearsExp.value.trim();
  const skills = parseSkills(els.keySkills.value);
  const achievement = els.achievement.value.trim().replace(/\.+$/, '');

  if (!title) {
    showToast('Please enter a job title');
    els.jobTitle.focus();
    return;
  }
  if (!yearsRaw || isNaN(Number(yearsRaw)) || Number(yearsRaw) < 0) {
    showToast('Please enter your years of experience');
    els.yearsExp.focus();
    return;
  }
  if (!skills.length) {
    showToast('Please enter at least one skill');
    els.keySkills.focus();
    return;
  }

  const years = String(Math.round(Number(yearsRaw)));
  const data = {
    title,
    years,
    skills: joinSkills(skills),
    achievement,
  };

  const picks = shuffled(TEMPLATES).slice(0, 5);
  const summaries = picks.map(t => buildSummary(t, data));
  renderResults(summaries);
}

els.generateBtn.addEventListener('click', generate);

els.clearBtn.addEventListener('click', () => {
  els.jobTitle.value = '';
  els.yearsExp.value = '';
  els.keySkills.value = '';
  els.achievement.value = '';
  showEmptyState('Fill in the fields above and click "Generate Summaries" to see 5 ready-to-use variants.');
  els.jobTitle.focus();
});

[els.jobTitle, els.yearsExp, els.keySkills, els.achievement].forEach(input => {
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
