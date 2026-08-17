'use strict';

const HASHTAG_TOOL_URL = 'https://social00.com/tools/hashtag-generator';
const PLACEHOLDER_TEXT = 'Your generated description will appear here...';

const HOOKS = [
  (t) => `In this video, we're diving into ${t} — everything you need to know, explained clearly and step by step.`,
  (t) => `Ready to get better at ${t}? This video breaks it all down so you can start right away.`,
  (t) => `Today we're covering ${t} in detail — stick around, because you don't want to miss this.`,
  (t) => `Curious about ${t}? You're in the right place — let's get straight into it.`,
  (t) => `This is your complete guide to ${t}, with practical tips you can use right away.`,
];

const CLOSINGS = [
  (ch) => `👍 If this video helped you, smash that like button and subscribe${ch ? ' to ' + ch : ''} for more content like this every week!`,
  (ch) => `🔔 Don't forget to subscribe${ch ? ' to ' + ch : ''} and turn on notifications so you never miss an upload!`,
  () => `💬 Got questions or thoughts? Drop them in the comments below — I read and reply to every one!`,
  (ch) => `📌 Enjoyed this? Share it with someone who needs to see it, and subscribe${ch ? ' to ' + ch : ''} for more!`,
  (ch) => `🙏 Thanks for watching${ch ? ', from ' + ch : ''}! Hit subscribe and join the community for weekly videos.`,
];

const els = {
  videoTitle: document.getElementById('videoTitle'),
  keyPoints: document.getElementById('keyPoints'),
  channelName: document.getElementById('channelName'),
  includeTimestamps: document.getElementById('includeTimestamps'),
  clearBtn: document.getElementById('clearBtn'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  generateBtn: document.getElementById('generateBtn'),
  copyDescBtn: document.getElementById('copyDescBtn'),
  descText: document.getElementById('descText'),
  charCounter: document.getElementById('charCounter'),
};

const socialToggles = [
  { checkbox: document.getElementById('toggleInstagram'), url: document.getElementById('urlInstagram'), platform: 'Instagram' },
  { checkbox: document.getElementById('toggleTwitter'), url: document.getElementById('urlTwitter'), platform: 'Twitter / X' },
  { checkbox: document.getElementById('toggleTiktok'), url: document.getElementById('urlTiktok'), platform: 'TikTok' },
];

let lastHookIdx = -1;
let lastCloseIdx = -1;

function randomIndex(length, avoid) {
  if (length <= 1) return 0;
  let idx = Math.floor(Math.random() * length);
  if (idx === avoid) idx = (idx + 1) % length;
  return idx;
}

function parseKeyPoints(raw) {
  if (!raw || !raw.trim()) return [];
  const byLine = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (byLine.length > 1) return byLine;
  const byComma = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return byComma.length > 1 ? byComma : byLine;
}

function buildTimestamps(points) {
  const lines = ['⏱ Timestamps:', '0:00 Intro'];
  if (points.length) {
    points.slice(0, 8).forEach((p) => lines.push(`0:00 ${p}`));
  } else {
    lines.push('0:00 [Add your timestamp]');
    lines.push('0:00 [Add your timestamp]');
  }
  lines.push('0:00 [Add your timestamp]');
  return lines.join('\n');
}

function buildSocialBlock(socials) {
  if (!socials.length) return '';
  const lines = ['🔗 Follow me:'];
  socials.forEach((s) => {
    lines.push(`${s.platform}: ${s.url || '[add your ' + s.platform + ' link]'}`);
  });
  return lines.join('\n');
}

function getCheckedSocials() {
  return socialToggles
    .filter((s) => s.checkbox.checked)
    .map((s) => ({ platform: s.platform, url: s.url.value.trim() }));
}

function buildDescription({ title, points, channel, socials, includeTimestamps, hookIdx, closeIdx }) {
  const sections = [];
  sections.push(HOOKS[hookIdx](title));

  if (points.length) {
    sections.push(`Here's what we cover in this video:\n${points.map((p) => '• ' + p).join('\n')}`);
  }

  if (includeTimestamps) sections.push(buildTimestamps(points));

  const socialBlock = buildSocialBlock(socials);
  if (socialBlock) sections.push(socialBlock);

  sections.push(CLOSINGS[closeIdx](channel));
  sections.push(`🏷️ Need hashtags for this video? Generate them free with our Hashtag Generator: ${HASHTAG_TOOL_URL}`);

  return sections.join('\n\n');
}

function updateCounter(text) {
  const len = text.length;
  els.charCounter.textContent = `${len} / 5000 characters`;
  els.charCounter.classList.remove('tier-info', 'tier-warn', 'tier-over');
  if (len > 5000) els.charCounter.classList.add('tier-over');
  else if (len >= 4500) els.charCounter.classList.add('tier-warn');
  else if (len >= 1000) els.charCounter.classList.add('tier-info');
}

function render({ reshuffle }) {
  const title = els.videoTitle.value.trim();
  if (!title) {
    showToast('Please enter a video title or topic');
    return;
  }

  const hookIdx = reshuffle ? randomIndex(HOOKS.length, lastHookIdx) : (lastHookIdx >= 0 ? lastHookIdx : randomIndex(HOOKS.length, -1));
  const closeIdx = reshuffle ? randomIndex(CLOSINGS.length, lastCloseIdx) : (lastCloseIdx >= 0 ? lastCloseIdx : randomIndex(CLOSINGS.length, -1));
  lastHookIdx = hookIdx;
  lastCloseIdx = closeIdx;

  const description = buildDescription({
    title,
    points: parseKeyPoints(els.keyPoints.value),
    channel: els.channelName.value.trim(),
    socials: getCheckedSocials(),
    includeTimestamps: els.includeTimestamps.checked,
    hookIdx,
    closeIdx,
  });

  els.descText.textContent = description;
  updateCounter(description);
}

socialToggles.forEach(({ checkbox, url }) => {
  checkbox.addEventListener('change', () => {
    url.classList.toggle('hidden', !checkbox.checked);
    if (!checkbox.checked) url.value = '';
  });
});

els.generateBtn.addEventListener('click', () => render({ reshuffle: false }));
els.regenerateBtn.addEventListener('click', () => render({ reshuffle: true }));

els.copyDescBtn.addEventListener('click', () => {
  const text = els.descText.textContent;
  if (!text || text === PLACEHOLDER_TEXT) {
    showToast('Generate a description first');
    return;
  }
  copyToClipboard(text, 'Description copied');
});

els.clearBtn.addEventListener('click', () => {
  els.videoTitle.value = '';
  els.keyPoints.value = '';
  els.channelName.value = '';
  els.includeTimestamps.checked = true;
  socialToggles.forEach(({ checkbox, url }) => {
    checkbox.checked = false;
    url.value = '';
    url.classList.add('hidden');
  });
  lastHookIdx = -1;
  lastCloseIdx = -1;
  els.descText.textContent = PLACEHOLDER_TEXT;
  els.charCounter.textContent = '0 / 5000 characters';
  els.charCounter.classList.remove('tier-info', 'tier-warn', 'tier-over');
  els.videoTitle.focus();
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('youtube');
});
