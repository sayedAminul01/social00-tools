'use strict';

const COMMON_AGENTS = ['*', 'Googlebot', 'Bingbot', 'Googlebot-Image', 'GPTBot', 'CCBot', 'anthropic-ai', 'ClaudeBot'];

const els = {
  defaultPolicy: document.getElementById('defaultPolicy'),
  ruleGroups: document.getElementById('ruleGroups'),
  addGroupBtn: document.getElementById('addGroupBtn'),
  sitemapList: document.getElementById('sitemapList'),
  addSitemapBtn: document.getElementById('addSitemapBtn'),
  outputPreview: document.getElementById('outputPreview'),
  copyBtn: document.getElementById('copyBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
};

let groupCounter = 0;
let sitemapCounter = 0;
let wasEmptyGroupWarned = false;

/* ── Datalist for User-agent suggestions (shared by every group) ── */
function ensureAgentDatalist() {
  if (document.getElementById('uaSuggestions')) return;
  const dl = document.createElement('datalist');
  dl.id = 'uaSuggestions';
  dl.innerHTML = COMMON_AGENTS.map(a => `<option value="${a}"></option>`).join('');
  document.body.appendChild(dl);
}

/* ── Rule group builder ───────────────────────────────────────── */
function createPathRow(type = 'Disallow', value = '') {
  const row = document.createElement('div');
  row.className = 'path-rule';
  row.innerHTML = `
    <select class="path-type">
      <option value="Disallow"${type === 'Disallow' ? ' selected' : ''}>Disallow</option>
      <option value="Allow"${type === 'Allow' ? ' selected' : ''}>Allow</option>
    </select>
    <input type="text" class="path-value" placeholder="/private/" autocomplete="off" />
    <button type="button" class="btn-remove-path" title="Remove path" aria-label="Remove path">✕</button>
  `;
  row.querySelector('.path-value').value = value;
  return row;
}

function createRuleGroup() {
  groupCounter += 1;
  const group = document.createElement('div');
  group.className = 'rule-group';
  group.dataset.groupId = String(groupCounter);
  group.innerHTML = `
    <div class="rule-group-header">
      <div class="field ua-field">
        <label>User-agent</label>
        <input type="text" class="ua-input" list="uaSuggestions" value="*" placeholder="*" autocomplete="off" />
      </div>
      <div class="field delay-field">
        <label>Crawl-delay (optional)</label>
        <input type="number" class="crawl-delay-input" min="0" step="1" placeholder="none" />
      </div>
      <button type="button" class="btn-remove-group" title="Remove rule group" aria-label="Remove rule group">✕</button>
    </div>
    <div class="path-rules"></div>
    <button type="button" class="btn-add-path">+ Add path</button>
  `;
  group.querySelector('.path-rules').appendChild(createPathRow());
  return group;
}

function addGroup() {
  ensureAgentDatalist();
  els.ruleGroups.appendChild(createRuleGroup());
  render();
}

function createSitemapRow() {
  sitemapCounter += 1;
  const row = document.createElement('div');
  row.className = 'sitemap-row';
  row.innerHTML = `
    <input type="text" class="sitemap-input" placeholder="https://example.com/sitemap.xml" autocomplete="off" />
    <button type="button" class="btn-remove-path" title="Remove sitemap URL" aria-label="Remove sitemap URL">✕</button>
  `;
  return row;
}

function addSitemap() {
  els.sitemapList.appendChild(createSitemapRow());
  render();
}

/* ── Event delegation ─────────────────────────────────────────── */
els.addGroupBtn.addEventListener('click', addGroup);
els.addSitemapBtn.addEventListener('click', addSitemap);

els.ruleGroups.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-remove-group')) {
    e.target.closest('.rule-group').remove();
    render();
  } else if (e.target.classList.contains('btn-remove-path')) {
    const group = e.target.closest('.rule-group');
    e.target.closest('.path-rule').remove();
    if (!group.querySelector('.path-rule')) {
      group.querySelector('.path-rules').appendChild(createPathRow());
    }
    render();
  } else if (e.target.classList.contains('btn-add-path')) {
    const group = e.target.closest('.rule-group');
    group.querySelector('.path-rules').appendChild(createPathRow());
    render();
  }
});

els.ruleGroups.addEventListener('input', render);
els.ruleGroups.addEventListener('change', render);

// blur doesn't bubble, so use capture to auto-fix a path missing a leading "/"
els.ruleGroups.addEventListener('blur', (e) => {
  if (!e.target.classList || !e.target.classList.contains('path-value')) return;
  const val = e.target.value.trim();
  if (val && !val.startsWith('/')) {
    e.target.value = '/' + val;
    if (typeof showToast === 'function') showToast('Path adjusted to start with "/"');
    render();
  }
}, true);

els.sitemapList.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-remove-path')) {
    e.target.closest('.sitemap-row').remove();
    render();
  }
});
els.sitemapList.addEventListener('input', render);

els.defaultPolicy.addEventListener('change', render);

/* ── Generation ───────────────────────────────────────────────── */
function collectGroups() {
  const groups = [];
  els.ruleGroups.querySelectorAll('.rule-group').forEach((groupEl) => {
    const agent = (groupEl.querySelector('.ua-input').value || '').trim() || '*';
    const delayRaw = groupEl.querySelector('.crawl-delay-input').value.trim();
    const crawlDelay = delayRaw !== '' && !isNaN(Number(delayRaw)) ? Number(delayRaw) : null;
    const rules = [];
    groupEl.querySelectorAll('.path-rule').forEach((row) => {
      const type = row.querySelector('.path-type').value;
      let path = row.querySelector('.path-value').value.trim();
      if (!path) return;
      if (!path.startsWith('/')) path = '/' + path;
      rules.push({ type, path });
    });
    groups.push({ agent, crawlDelay, rules });
  });
  return groups;
}

function collectSitemaps() {
  const urls = [];
  els.sitemapList.querySelectorAll('.sitemap-input').forEach((input) => {
    const val = input.value.trim();
    if (val) urls.push(val);
  });
  return urls;
}

// Merges rule groups sharing the same User-agent (case-insensitive) into one
// contiguous block, per the robots.txt spec — a bot must not see the same
// User-agent split across two separate, non-adjacent groups.
function buildRobotsTxt() {
  const policy = els.defaultPolicy.value;
  const merged = new Map(); // key: lowercase agent -> { agent, rules[], crawlDelay }

  function addToMerged(agent, rules, crawlDelay) {
    const key = agent.toLowerCase();
    if (!merged.has(key)) merged.set(key, { agent, rules: [], crawlDelay: null });
    const entry = merged.get(key);
    entry.rules.push(...rules);
    if (crawlDelay !== null && crawlDelay !== undefined) entry.crawlDelay = crawlDelay;
  }

  if (policy === 'allow') addToMerged('*', [{ type: 'Allow', path: '/' }], null);
  else if (policy === 'block') addToMerged('*', [{ type: 'Disallow', path: '/' }], null);

  let hasEmptyGroup = false;
  collectGroups().forEach((g) => {
    if (!g.rules.length) {
      hasEmptyGroup = true;
      if (g.crawlDelay === null) return; // truly nothing to contribute
    }
    addToMerged(g.agent, g.rules, g.crawlDelay);
  });

  const blocks = [];
  merged.forEach((entry) => {
    if (!entry.rules.length) { hasEmptyGroup = true; return; }
    const lines = [`User-agent: ${entry.agent}`];
    entry.rules.forEach((r) => lines.push(`${r.type}: ${r.path}`));
    if (entry.crawlDelay !== null) lines.push(`Crawl-delay: ${entry.crawlDelay}`);
    blocks.push(lines.join('\n'));
  });

  const sitemaps = collectSitemaps();
  let output = blocks.join('\n\n');
  if (sitemaps.length) {
    output += (output ? '\n\n' : '') + sitemaps.map((s) => `Sitemap: ${s}`).join('\n');
  }

  return { output, hasEmptyGroup };
}

function render() {
  const { output, hasEmptyGroup } = buildRobotsTxt();
  els.outputPreview.textContent = output || '# Choose a default policy or add a rule group to build your robots.txt';

  if (hasEmptyGroup && !wasEmptyGroupWarned) {
    if (typeof showToast === 'function') {
      showToast('A rule group has no Allow/Disallow paths and will be skipped');
    }
    wasEmptyGroupWarned = true;
  } else if (!hasEmptyGroup) {
    wasEmptyGroupWarned = false;
  }
}

els.copyBtn.addEventListener('click', () => {
  const { output } = buildRobotsTxt();
  copyToClipboard(output, 'robots.txt copied');
});

els.downloadBtn.addEventListener('click', () => {
  const { output } = buildRobotsTxt();
  const blob = new Blob([output + '\n'], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'robots.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (typeof showToast === 'function') showToast('robots.txt downloaded');
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('seo');
  ensureAgentDatalist();
  render();
});
