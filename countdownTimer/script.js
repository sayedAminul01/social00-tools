'use strict';

/* ── Helpers ────────────────────────────────────────────────── */
function pad(n) { return String(n).padStart(2, '0'); }

function toLocalInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/* Single shared AudioContext, created lazily on a user gesture
   (Start button clicks) so autoplay policies don't block the beep. */
let audioCtx = null;
function getAudioCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playBeep(freq = 880, duration = 0.18) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  } catch (e) { /* ignore — beep is a nice-to-have, never block on it */ }
}

function maybeNotify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(title, { body }); } catch (e) { /* ignore */ }
}

const els = {
  modeTabs: document.querySelectorAll('.mode-tab'),
  panelCountdown: document.getElementById('panelCountdown'),
  panelStopwatch: document.getElementById('panelStopwatch'),
  subTabs: document.querySelectorAll('.sub-tab'),
  subPanelStopwatch: document.getElementById('subPanelStopwatch'),
  subPanelTimer: document.getElementById('subPanelTimer'),

  countdownTarget: document.getElementById('countdownTarget'),
  startCountdownBtn: document.getElementById('startCountdownBtn'),
  resetCountdownBtn: document.getElementById('resetCountdownBtn'),
  cdDays: document.getElementById('cdDays'),
  cdHours: document.getElementById('cdHours'),
  cdMinutes: document.getElementById('cdMinutes'),
  cdSeconds: document.getElementById('cdSeconds'),
  cdDaysLabel: document.getElementById('cdDaysLabel'),
  cdHoursLabel: document.getElementById('cdHoursLabel'),
  cdMinutesLabel: document.getElementById('cdMinutesLabel'),
  cdSecondsLabel: document.getElementById('cdSecondsLabel'),
  countdownStatus: document.getElementById('countdownStatus'),
  enableNotifyBtn: document.getElementById('enableNotifyBtn'),
  notifyStatus: document.getElementById('notifyStatus'),

  stopwatchDisplay: document.getElementById('stopwatchDisplay'),
  swToggleBtn: document.getElementById('swToggleBtn'),
  swResetBtn: document.getElementById('swResetBtn'),

  timerMinutes: document.getElementById('timerMinutes'),
  timerSeconds: document.getElementById('timerSeconds'),
  timerDisplay: document.getElementById('timerDisplay'),
  timerStatus: document.getElementById('timerStatus'),
  timerToggleBtn: document.getElementById('timerToggleBtn'),
  timerResetBtn: document.getElementById('timerResetBtn'),
};

/* ── Mode tabs (Countdown vs Stopwatch/Timer) ────────────────── */
els.modeTabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    els.modeTabs.forEach((b) => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', String(b === btn));
    });
    els.panelCountdown.hidden = mode !== 'countdown';
    els.panelStopwatch.hidden = mode !== 'stopwatch';
  });
});

els.subTabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    const sub = btn.dataset.submode;
    els.subTabs.forEach((b) => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', String(b === btn));
    });
    els.subPanelStopwatch.hidden = sub !== 'stopwatch';
    els.subPanelTimer.hidden = sub !== 'timer';
  });
});

/* ── Countdown to a date ──────────────────────────────────────
   Re-reads Date.now() on every tick and subtracts it from the
   fixed target timestamp, rather than decrementing a counter —
   this keeps the display correct even after the tab was
   throttled or backgrounded, since it never accumulates error. */
let countdownTargetMs = null;
let countdownInterval = null;

function renderCountdown(remainingMs) {
  const clamped = Math.max(0, remainingMs);
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  els.cdDays.textContent = pad(days);
  els.cdHours.textContent = pad(hours);
  els.cdMinutes.textContent = pad(minutes);
  els.cdSeconds.textContent = pad(seconds);
  els.cdDaysLabel.textContent = days === 1 ? 'Day' : 'Days';
  els.cdHoursLabel.textContent = hours === 1 ? 'Hour' : 'Hours';
  els.cdMinutesLabel.textContent = minutes === 1 ? 'Minute' : 'Minutes';
  els.cdSecondsLabel.textContent = seconds === 1 ? 'Second' : 'Seconds';
}

function stopCountdownInterval() {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
}

function tickCountdown() {
  const remaining = countdownTargetMs - Date.now();
  if (remaining <= 0) {
    renderCountdown(0);
    stopCountdownInterval();
    els.countdownStatus.textContent = "⏰ Time's up!";
    els.countdownStatus.classList.add('is-done');
    maybeNotify("Time's up!", 'Your countdown has reached zero.');
    playBeep(880, 0.22);
    return;
  }
  renderCountdown(remaining);
}

els.startCountdownBtn.addEventListener('click', () => {
  const val = els.countdownTarget.value;
  if (!val) { window.showToast('Pick a target date & time first'); return; }
  const targetDate = new Date(val);
  if (isNaN(targetDate.getTime())) { window.showToast('That date looks invalid'); return; }
  const targetMs = targetDate.getTime();
  if (targetMs <= Date.now()) { window.showToast('Pick a time in the future'); return; }

  getAudioCtx(); // unlock audio on this user gesture so the end-of-countdown beep can play later
  countdownTargetMs = targetMs;
  stopCountdownInterval();
  els.countdownStatus.textContent = 'Counting down…';
  els.countdownStatus.classList.remove('is-done');
  tickCountdown();
  countdownInterval = setInterval(tickCountdown, 250);
});

els.resetCountdownBtn.addEventListener('click', () => {
  stopCountdownInterval();
  countdownTargetMs = null;
  els.countdownTarget.value = '';
  els.countdownStatus.textContent = '';
  els.countdownStatus.classList.remove('is-done');
  renderCountdown(0);
  els.cdDaysLabel.textContent = 'Days';
  els.cdHoursLabel.textContent = 'Hours';
  els.cdMinutesLabel.textContent = 'Minutes';
  els.cdSecondsLabel.textContent = 'Seconds';
});

document.querySelectorAll('.preset-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const preset = btn.dataset.preset;
    const now = new Date();
    let target;
    switch (preset) {
      case '1h':
        target = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case 'tomorrow9':
        target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0, 0);
        break;
      case '7d':
        target = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        target = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return;
    }
    els.countdownTarget.value = toLocalInputValue(target);
  });
});

els.enableNotifyBtn.addEventListener('click', () => {
  if (!('Notification' in window)) {
    els.notifyStatus.textContent = 'Not supported in this browser';
    return;
  }
  if (Notification.permission === 'granted') {
    els.notifyStatus.textContent = 'Notifications already enabled ✓';
    return;
  }
  Notification.requestPermission().then((perm) => {
    els.notifyStatus.textContent = perm === 'granted'
      ? 'Notifications enabled ✓'
      : 'Permission not granted — the on-page alert still works';
  });
});

/* ── Stopwatch ────────────────────────────────────────────────
   Elapsed time = time accumulated before the current run, plus
   (now - startTimestamp) while running. Pausing folds the running
   segment into the accumulated total, so resuming never loses or
   double-counts time. */
let swRunning = false;
let swStartTs = 0;
let swAccumulatedMs = 0;
let swInterval = null;

function formatStopwatch(ms) {
  const totalMs = Math.max(0, Math.floor(ms));
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const tenths = Math.floor((totalMs % 1000) / 100);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${tenths}`;
}

function swElapsedMs() {
  return swAccumulatedMs + (swRunning ? Date.now() - swStartTs : 0);
}

function renderStopwatch() {
  els.stopwatchDisplay.textContent = formatStopwatch(swElapsedMs());
}

els.swToggleBtn.addEventListener('click', () => {
  if (!swRunning) {
    swStartTs = Date.now();
    swRunning = true;
    getAudioCtx();
    swInterval = setInterval(renderStopwatch, 100);
    els.swToggleBtn.textContent = 'Pause';
  } else {
    swAccumulatedMs += Date.now() - swStartTs;
    swRunning = false;
    if (swInterval) { clearInterval(swInterval); swInterval = null; }
    renderStopwatch();
    els.swToggleBtn.textContent = 'Resume';
  }
});

els.swResetBtn.addEventListener('click', () => {
  if (swInterval) { clearInterval(swInterval); swInterval = null; }
  swRunning = false;
  swAccumulatedMs = 0;
  swStartTs = 0;
  renderStopwatch();
  els.swToggleBtn.textContent = 'Start';
});

/* ── Timer (countdown from minutes/seconds) ──────────────────
   Same accumulated-time approach as the stopwatch, run in
   reverse: timerRemainingMs holds the frozen remaining time
   whenever the timer isn't actively running. */
let timerRunning = false;
let timerStartTs = 0;
let timerRemainingMs = 0;
let timerInterval = null;

function getInputDurationMs() {
  const mins = Math.max(0, parseInt(els.timerMinutes.value, 10) || 0);
  const secs = Math.max(0, Math.min(59, parseInt(els.timerSeconds.value, 10) || 0));
  return (mins * 60 + secs) * 1000;
}

function formatMinSec(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

function currentTimerRemaining() {
  if (!timerRunning) return timerRemainingMs;
  return Math.max(0, timerRemainingMs - (Date.now() - timerStartTs));
}

function renderTimer() {
  els.timerDisplay.textContent = formatMinSec(currentTimerRemaining());
}

timerRemainingMs = getInputDurationMs();

function timerTick() {
  const remaining = currentTimerRemaining();
  renderTimer();
  if (remaining <= 0) {
    timerRunning = false;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    timerRemainingMs = 0;
    els.timerToggleBtn.textContent = 'Start';
    els.timerStatus.textContent = "⏰ Time's up!";
    els.timerStatus.classList.add('is-done');
    maybeNotify("Time's up!", 'Your timer has finished.');
    playBeep(660, 0.25);
  }
}

els.timerToggleBtn.addEventListener('click', () => {
  if (!timerRunning) {
    if (timerRemainingMs <= 0) {
      timerRemainingMs = getInputDurationMs();
      if (timerRemainingMs <= 0) { window.showToast('Set a duration greater than 0'); return; }
    }
    timerStartTs = Date.now();
    timerRunning = true;
    getAudioCtx();
    timerInterval = setInterval(timerTick, 100);
    els.timerToggleBtn.textContent = 'Pause';
    els.timerStatus.textContent = 'Counting down…';
    els.timerStatus.classList.remove('is-done');
  } else {
    timerRemainingMs = currentTimerRemaining();
    timerRunning = false;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    renderTimer();
    els.timerToggleBtn.textContent = 'Resume';
  }
});

els.timerResetBtn.addEventListener('click', () => {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  timerRunning = false;
  timerRemainingMs = getInputDurationMs();
  renderTimer();
  els.timerToggleBtn.textContent = 'Start';
  els.timerStatus.textContent = '';
  els.timerStatus.classList.remove('is-done');
});

[els.timerMinutes, els.timerSeconds].forEach((input) => {
  input.addEventListener('input', () => {
    if (timerRunning) return;
    timerRemainingMs = getInputDurationMs();
    renderTimer();
  });
});

/* ── Init ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('utility');
  renderCountdown(0);
  renderStopwatch();
  renderTimer();
});
