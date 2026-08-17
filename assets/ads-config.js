/**
 * social00.com — /assets/ads-config.js
 * ────────────────────────────────────────────────────────────────
 * AdSense activation switch. Every tool page ships with styled
 * "Advertisement" placeholder slots (see .ad-slot in
 * /assets/tools-base.css) so the layout, spacing and Core Web
 * Vitals are already correct for when ads go live — this is also
 * what you submit to Google for AdSense review.
 *
 * TO GO LIVE AFTER ADSENSE APPROVAL:
 *   1. Set ADSENSE_CLIENT_ID below to your publisher ID
 *      (looks like 'ca-pub-1234567890123456').
 *   2. Create 3 ad units in your AdSense dashboard (or fewer —
 *      any slot left blank below just stays a placeholder) and
 *      paste their slot IDs into ADSENSE_SLOTS.
 *   3. Update /ads.txt at the site root with your real publisher
 *      ID (required by Google before ads will actually serve).
 * Nothing else needs to change — /assets/tools-base.js reads
 * these values automatically on every page that includes it.
 * ──────────────────────────────────────────────────────────────── */
'use strict';

window.ADSENSE_CLIENT_ID = 'ca-pub-9882344850230649';

window.ADSENSE_SLOTS = {
  top: '',    // slot ID for .ad-slot[data-ad="top"]
  mid: '',    // slot ID for .ad-slot[data-ad="mid"]
  bottom: ''  // slot ID for .ad-slot[data-ad="bottom"]
};
