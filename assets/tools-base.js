/**
 * social00.com — /assets/tools-base.js
 * Shared chrome behaviour for every new tool page: theme toggle
 * (synced with the homepage via the same 's00-theme' localStorage
 * key), scroll-to-top, toast notifications, clipboard copy helper,
 * and conditional AdSense slot rendering driven by /assets/ads-config.js.
 */
'use strict';

(function () {
  /* ── Theme toggle (shared key with homepage) ───────────────── */
  function initTheme() {
    const body = document.body;
    const btn = document.getElementById('theme-toggle');
    const saved = localStorage.getItem('s00-theme') || 'dark';
    body.setAttribute('data-theme', saved);
    body.classList.toggle('dark-mode', saved === 'dark');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      body.setAttribute('data-theme', next);
      body.classList.toggle('dark-mode', next === 'dark');
      localStorage.setItem('s00-theme', next);
    });
  }

  /* ── Scroll to top ──────────────────────────────────────────── */
  function initScrollTop() {
    const btn = document.getElementById('scrollTop');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ── Toast ──────────────────────────────────────────────────── */
  let toastTimer = null;
  window.showToast = function (message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('visible'), 2200);
  };

  /* ── Clipboard helper ───────────────────────────────────────── */
  window.copyToClipboard = async function (text, successMessage) {
    if (!text) { window.showToast('Nothing to copy yet'); return; }
    try {
      await navigator.clipboard.writeText(text);
      window.showToast(successMessage || 'Copied to clipboard');
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      window.showToast(successMessage || 'Copied to clipboard');
    }
  };

  /* ── AdSense slots ──────────────────────────────────────────
     Stays as a plain "Advertisement" placeholder until
     window.ADSENSE_CLIENT_ID (set in /assets/ads-config.js) is
     filled in with a real approved publisher ID. Once set, this
     injects real <ins class="adsbygoogle"> units and loads the
     AdSense script once per page. */
  function initAdSlots() {
    const slots = document.querySelectorAll('.ad-slot[data-ad]');
    if (!slots.length) return;
    const clientId = window.ADSENSE_CLIENT_ID || '';
    if (!clientId) return; // leave placeholder text as-is

    if (!document.querySelector('script[data-adsbygoogle-loader], script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) {
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(clientId);
      s.crossOrigin = 'anonymous';
      s.setAttribute('data-adsbygoogle-loader', '1');
      document.head.appendChild(s);
    }

    slots.forEach((slot) => {
      const position = slot.getAttribute('data-ad');
      const slotId = (window.ADSENSE_SLOTS || {})[position];
      if (!slotId) return;
      slot.innerHTML = '';
      slot.removeAttribute('aria-label');
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.setAttribute('data-ad-client', clientId);
      ins.setAttribute('data-ad-slot', slotId);
      ins.setAttribute('data-ad-format', 'auto');
      ins.setAttribute('data-full-width-responsive', 'true');
      slot.appendChild(ins);
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initScrollTop();
    initAdSlots();
  });
})();
