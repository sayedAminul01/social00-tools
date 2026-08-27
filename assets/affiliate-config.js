/**
 * social00.com — /assets/affiliate-config.js
 * ────────────────────────────────────────────────────────────────
 * Disclosed "Recommended tools" data, rendered by
 * renderAffiliateBox(category) into any element with
 * id="affiliate-box" on a tool page (see tools-base.js).
 *
 * Every item currently points at the vendor's real homepage, NOT
 * a tracking link — that's intentional. These are well-known
 * products with public affiliate programs; once you're accepted
 * into a given program, replace that item's `url` with your real
 * affiliate/ref link. Until then this stays 100% honest: a plain
 * editorial recommendation, not a dead or fake tracking link.
 *
 * FTC compliance: the box is always rendered with a visible
 * "Sponsored recommendations" label (see .affiliate-label in
 * tools-base.css) — do not remove that when you add real links.
 * ──────────────────────────────────────────────────────────────── */
'use strict';

window.AFFILIATE_RECOMMENDATIONS = {
  youtube: [
    { name: 'TubeBuddy', blurb: 'Browser extension for keyword research, A/B thumbnail testing & channel analytics.', url: 'https://www.tubebuddy.com/' },
    { name: 'VidIQ', blurb: 'Video SEO scoring, trend alerts and competitor tracking for YouTube channels.', url: 'https://vidiq.com/' },
    { name: 'Epidemic Sound', blurb: 'Royalty-free music & SFX library safe for monetized videos.', url: 'https://www.epidemicsound.com/' }
  ],
  instagram: [
    { name: 'Canva Pro', blurb: 'Templates for Reels covers, carousels and Story graphics.', url: 'https://www.canva.com/' },
    { name: 'Later', blurb: 'Visual content calendar and auto-scheduler for Instagram.', url: 'https://later.com/' },
    { name: 'Linktree', blurb: 'One landing link for your bio that houses all your other links.', url: 'https://linktr.ee/' }
  ],
  writing: [
    { name: 'Grammarly', blurb: 'Grammar, tone and clarity checking as you write.', url: 'https://www.grammarly.com/' },
    { name: 'Hemingway Editor', blurb: 'Flags dense, hard-to-read sentences for punchier copy.', url: 'https://hemingwayapp.com/' },
    { name: 'Notion', blurb: 'Plan drafts, outlines and a content calendar in one workspace.', url: 'https://www.notion.so/' }
  ],
  image: [
    { name: 'Canva Pro', blurb: 'Background remover, resize magic & brand kits beyond what a free tool covers.', url: 'https://www.canva.com/' },
    { name: 'Envato Elements', blurb: 'Unlimited stock photos, graphics and templates on one subscription.', url: 'https://elements.envato.com/' },
    { name: 'Squoosh', blurb: 'Google\'s advanced open-source image compressor for power users.', url: 'https://squoosh.app/' }
  ],
  student: [
    { name: 'Grammarly', blurb: 'Catches grammar, plagiarism-adjacent phrasing and clarity issues in essays.', url: 'https://www.grammarly.com/' },
    { name: 'Notion', blurb: 'Free student plan for notes, study planners and citation tracking.', url: 'https://www.notion.so/' },
    { name: 'Coursera', blurb: 'Accredited online courses and certificates to round out a resume.', url: 'https://www.coursera.org/' }
  ],
  seo: [
    { name: 'Semrush', blurb: 'Full keyword-volume, backlink and competitor research suite.', url: 'https://www.semrush.com/' },
    { name: 'Ahrefs', blurb: 'Industry-standard backlink index and keyword explorer.', url: 'https://ahrefs.com/' },
    { name: 'Google Search Console', blurb: 'Free — track how your pages actually perform in Google search.', url: 'https://search.google.com/search-console' }
  ],
  utility: [
    { name: 'Bitwarden', blurb: 'Free, open-source password manager to actually store what you generate here.', url: 'https://bitwarden.com/' },
    { name: 'Google Authenticator', blurb: 'Free two-factor authentication app — pairs well with a strong password.', url: 'https://www.google.com/landing/2step/' },
    { name: 'Wise', blurb: 'Real exchange rates for currency conversion and international transfers.', url: 'https://wise.com/' }
  ]
};

/**
 * Renders a disclosed recommendations box into #affiliate-box.
 * @param {string} category one of the keys above
 */
window.renderAffiliateBox = function (category) {
  const el = document.getElementById('affiliate-box');
  const items = (window.AFFILIATE_RECOMMENDATIONS || {})[category];
  if (!el || !items || !items.length) return;

  el.innerHTML = `
    <div class="affiliate-card">
      <span class="affiliate-label">Sponsored recommendations</span>
      <div class="affiliate-grid">
        ${items.map(item => `
          <a class="affiliate-item" href="${item.url}" target="_blank" rel="sponsored noopener noreferrer">
            <strong>${item.name}</strong>
            <span>${item.blurb}</span>
            <span class="aff-cta">Learn more →</span>
          </a>
        `).join('')}
      </div>
    </div>
  `;
};
