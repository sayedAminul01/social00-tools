/**
 * social00.com — script.js
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * HOW TO ADD / UPDATE TOOL LINKS:
 *   1. Find the tool in the TOOLS array below
 *   2. Set its  url: '/your-tool-page-url'
 *   3. The "Use Tool" button will link there — same window
 *   4. Set  url: ''  to show "Coming Soon" state
 *
 * HOW TO ADD A NEW TOOL:
 *   Copy one object in TOOLS and add it to the array.
 *   Fields: id, name, icon, category, badge, desc, url
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   TOOL DATA — Edit url: '' to add your real tool page links.
   Categories: youtube | instagram | writing | image | student | seo
   ═══════════════════════════════════════════════════════════════ */
const TOOLS = [
  // ── YouTube Tools ──────────────────────────────────────────
  {
    id: 'yt-title',
    name: 'YouTube Title Generator',
    icon: '📹',
    category: 'youtube',
    badge: '🔥 Popular',
    desc: 'Generate click-worthy, SEO-optimised YouTube titles in seconds. Boost your CTR and views instantly.',
    url: ''   // ← ADD YOUR TOOL URL HERE e.g. '/tools/youtube-title-generator'
  },
  {
    id: 'yt-thumb',
    name: 'Thumbnail Headline Generator',
    icon: '🖼️',
    category: 'youtube',
    badge: '⚡ Hot',
    desc: 'Craft bold, punchy thumbnail text that stops the scroll and dramatically improves click-through rate.',
    url: ''
  },
  {
    id: 'yt-desc',
    name: 'YouTube Description Generator',
    icon: '📝',
    category: 'youtube',
    badge: '🆕 New',
    desc: 'Write keyword-rich, engaging YouTube descriptions that rank well and convert viewers to subscribers.',
    url: ''
  },
  {
    id: 'yt-tags',
    name: 'YouTube Tags Generator',
    icon: '🏷️',
    category: 'youtube',
    badge: '🔍 SEO',
    desc: 'Generate the most relevant YouTube tags for your video topic and dramatically improve discoverability.',
    url: ''
  },
  {
    id: 'yt-hook',
    name: 'YouTube Hook Writer',
    icon: '🎣',
    category: 'youtube',
    badge: '✨ AI',
    desc: 'Create compelling video openings that hook viewers in the first 30 seconds and reduce drop-off rate.',
    url: ''
  },
  {
    id: 'yt-script',
    name: 'YouTube Script Outline',
    icon: '🎬',
    category: 'youtube',
    badge: '✍️ Write',
    desc: 'Generate a complete video script outline with intro, key points and call-to-action in seconds.',
    url: ''
  },

  // ── Instagram Tools ─────────────────────────────────────────
  {
    id: 'ig-caption',
    name: 'Instagram Caption Generator',
    icon: '📸',
    category: 'instagram',
    badge: '🔥 Popular',
    desc: 'Create engaging, on-brand Instagram captions for any post. Save hours of creative thinking every week.',
    url: ''
  },
  {
    id: 'hashtag',
    name: 'Hashtag Generator',
    icon: '#️⃣',
    category: 'instagram',
    badge: '✨ AI',
    desc: 'Find the most relevant trending hashtags for your niche and maximise organic reach across platforms.',
    url: ''
  },
  {
    id: 'ig-bio',
    name: 'Instagram Bio Generator',
    icon: '👤',
    category: 'instagram',
    badge: '🆕 New',
    desc: 'Write a professional, personality-packed Instagram bio with CTA that converts profile visits to follows.',
    url: ''
  },
  {
    id: 'ig-reel',
    name: 'Reel Script Generator',
    icon: '🎥',
    category: 'instagram',
    badge: '📱 Reels',
    desc: 'Generate punchy, scroll-stopping Reels scripts tailored to your niche and target audience.',
    url: ''
  },
  {
    id: 'ig-story',
    name: 'Instagram Story Ideas',
    icon: '🌟',
    category: 'instagram',
    badge: '💡 Ideas',
    desc: 'Never run out of Story content. Get 10 creative Story ideas for your account with one click.',
    url: ''
  },

  // ── AI Writing Tools ────────────────────────────────────────
  {
    id: 'stylish-text',
    name: 'Stylish Text Generator',
    icon: '𝓐',
    category: 'writing',
    badge: '🎨 Fun',
    desc: 'Transform plain text into beautiful Unicode fonts and styles. Make your bios and posts stand out.',
    url: ''
  },
  {
    id: 'ai-bio',
    name: 'AI Bio Generator',
    icon: '🤖',
    category: 'writing',
    badge: '✨ AI',
    desc: 'Write the perfect professional bio for Instagram, Twitter, LinkedIn or any platform in one click.',
    url: ''
  },
  {
    id: 'resume-summary',
    name: 'Resume Summary Generator',
    icon: '📄',
    category: 'writing',
    badge: '💼 Career',
    desc: 'Generate powerful, ATS-friendly resume summaries that impress recruiters and land interviews faster.',
    url: ''
  },
  {
    id: 'blog-intro',
    name: 'Blog Intro Generator',
    icon: '📰',
    category: 'writing',
    badge: '✍️ Blog',
    desc: 'Write captivating blog introductions that hook readers instantly and reduce bounce rate on your posts.',
    url: ''
  },
  {
    id: 'email-subject',
    name: 'Email Subject Line Generator',
    icon: '📧',
    category: 'writing',
    badge: '📨 Email',
    desc: 'Create high-converting email subject lines that boost open rates for newsletters and campaigns.',
    url: ''
  },
  {
    id: 'cover-letter',
    name: 'Cover Letter Generator',
    icon: '📋',
    category: 'writing',
    badge: '💼 Career',
    desc: 'Generate personalised, professional cover letters that stand out from the pile and get interviews.',
    url: ''
  },
  {
    id: 'product-desc',
    name: 'Product Description Generator',
    icon: '🛍️',
    category: 'writing',
    badge: '🛒 Shop',
    desc: 'Write compelling product descriptions that highlight benefits and convert browsers into buyers.',
    url: ''
  },
  {
    id: 'tweet-writer',
    name: 'Tweet / X Thread Writer',
    icon: '𝕏',
    category: 'writing',
    badge: '🔵 Twitter',
    desc: 'Craft viral-ready tweets and engaging Twitter/X threads on any topic in seconds with AI assistance.',
    url: ''
  },

  // ── Image Tools ─────────────────────────────────────────────
  {
    id: 'img-compress',
    name: 'Image Compressor',
    icon: '🗜️',
    category: 'image',
    badge: '⚡ Fast',
    desc: 'Compress images without losing quality. Supports JPEG, PNG and WebP. Works entirely in your browser.',
    url: ''
  },
  {
    id: 'img-resize',
    name: 'Image Resizer',
    icon: '📐',
    category: 'image',
    badge: '📏 Size',
    desc: 'Resize images to any dimension instantly. Perfect for social media templates and profile pictures.',
    url: ''
  },
  {
    id: 'color-palette',
    name: 'Color Palette Generator',
    icon: '🎨',
    category: 'image',
    badge: '🌈 Color',
    desc: 'Generate beautiful, harmonious colour palettes from any keyword, mood or hex code. Free to export.',
    url: ''
  },
  {
    id: 'bg-remove',
    name: 'Background Remover',
    icon: '✂️',
    category: 'image',
    badge: '🪄 Magic',
    desc: 'Remove image backgrounds instantly with AI. Perfect for product photos, profiles and thumbnails.',
    url: ''
  },

  // ── Student Tools ────────────────────────────────────────────
  {
    id: 'percentage-calc',
    name: 'Percentage Calculator',
    icon: '🧮',
    category: 'student',
    badge: '📐 Utility',
    desc: 'Instantly calculate percentages, discounts, markups and grade scores. No mental math needed.',
    url: ''
  },
  {
    id: 'gpa-calc',
    name: 'GPA Calculator',
    icon: '🎓',
    category: 'student',
    badge: '📊 Grades',
    desc: 'Calculate your semester GPA and cumulative GPA instantly using any grading scale worldwide.',
    url: ''
  },
  {
    id: 'word-counter',
    name: 'Word Counter',
    icon: '🔢',
    category: 'student',
    badge: '📝 Write',
    desc: 'Count words, characters, sentences and estimated reading time for any text. Instant and accurate.',
    url: ''
  },
  {
    id: 'citation-gen',
    name: 'Citation Generator',
    icon: '📚',
    category: 'student',
    badge: '🏫 Academics',
    desc: 'Generate APA, MLA and Chicago citations instantly. No more formatting headaches for your papers.',
    url: ''
  },
  {
    id: 'essay-outline',
    name: 'Essay Outline Generator',
    icon: '📑',
    category: 'student',
    badge: '✍️ Essays',
    desc: 'Create a structured essay outline for any topic with thesis, arguments and conclusion in seconds.',
    url: ''
  },

  // ── SEO Tools ────────────────────────────────────────────────
  {
    id: 'meta-gen',
    name: 'SEO Meta Tag Generator',
    icon: '🔍',
    category: 'seo',
    badge: '📈 SEO',
    desc: 'Generate perfect meta titles and descriptions for any web page. Optimised for Google CTR.',
    url: ''
  },
  {
    id: 'keyword-ideas',
    name: 'Keyword Ideas Generator',
    icon: '💡',
    category: 'seo',
    badge: '🔑 Keywords',
    desc: 'Discover long-tail keyword ideas for your niche that have real search intent and low competition.',
    url: ''
  },
  {
    id: 'slug-gen',
    name: 'URL Slug Generator',
    icon: '🔗',
    category: 'seo',
    badge: '🌐 URL',
    desc: 'Convert any title or phrase into an SEO-friendly URL slug instantly. Clean, readable and optimised.',
    url: ''
  },
  {
    id: 'alt-text',
    name: 'Image Alt Text Generator',
    icon: '🏷️',
    category: 'seo',
    badge: '♿ A11y',
    desc: 'Generate descriptive, SEO-friendly alt text for images that improves accessibility and search rankings.',
    url: ''
  },
];

/* ═══════════════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════════════ */
let currentFilter  = 'all';
let currentSearch  = '';
let lastClickedTool = null;

/* ═══════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initNavbar();
  initHamburger();
  initThemeToggle();
  renderTools();          // Draw all tool cards from data
  initFilterBar();        // Category filter tabs
  initSearchBar();        // Navbar search
  initMobileSearch();     // Mobile search
  initCategoryJumps();    // Category card → filter tools
  initScrollReveal();
  initStatCounters();
  initParticles();
  initSmoothScroll();
  initBackToTop();
  initFAQ();
  initActiveNavLinks();
  initFooterYear();
  initScrollProgress();
});

/* ═══════════════════════════════════════════════════════════════
   LOADER
   ═══════════════════════════════════════════════════════════════ */
function initLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    loader.classList.add('hidden');
    loader.addEventListener('transitionend', () => loader.remove(), { once: true });
    document.body.style.overflow = '';
  }, 1600);
}

/* ═══════════════════════════════════════════════════════════════
   RENDER TOOLS GRID
   ═══════════════════════════════════════════════════════════════ */
function renderTools(filter = 'all', query = '') {
  const grid = document.getElementById('tools-grid');
  const noResults = document.getElementById('no-results');
  if (!grid) return;

  const q = query.toLowerCase().trim();
  const filtered = TOOLS.filter(t => {
    const matchCat  = filter === 'all' || t.category === filter;
    const matchQuery = !q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.category.includes(q);
    return matchCat && matchQuery;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '';
    noResults.removeAttribute('hidden');
    return;
  }
  noResults.setAttribute('hidden', '');

  grid.innerHTML = filtered.map((t, i) => `
    <article class="tool-card reveal" data-id="${t.id}" data-category="${t.category}"
             style="transition-delay:${Math.min(i, 12) * 50}ms"
             aria-label="${escHtml(t.name)} — ${t.category} tool">
      <div class="tc-glow"></div>
      <div class="tc-header">
        <div class="tc-icon">${t.icon}</div>
        <div class="tc-badge">${escHtml(t.badge)}</div>
      </div>
      <h3 class="tc-title">${escHtml(t.name)}</h3>
      <p class="tc-desc">${escHtml(t.desc)}</p>
      <div class="tc-footer">
        <span class="tc-tag">${categoryLabel(t.category)}</span>
        ${t.url
          ? `<a href="${escHtml(t.url)}" class="btn-tool" data-tool-id="${t.id}" aria-label="Open ${escHtml(t.name)}">Use Tool →</a>`
          : `<span class="btn-tool coming" style="color:var(--text-3);border-color:var(--border);cursor:default" aria-label="Coming soon">Coming Soon</span>`
        }
      </div>
    </article>
  `).join('');

  // Trigger scroll reveal on freshly rendered cards
  requestAnimationFrame(() => {
    grid.querySelectorAll('.reveal').forEach(el => {
      el.classList.add('visible');
    });
    // Attach "Use Tool" click handlers for related tools
    grid.querySelectorAll('a.btn-tool').forEach(btn => {
      btn.addEventListener('click', handleToolClick);
    });
  });
}

function categoryLabel(cat) {
  return { youtube:'YouTube', instagram:'Instagram', writing:'AI Writing', image:'Image', student:'Student', seo:'SEO' }[cat] || cat;
}

/* ═══════════════════════════════════════════════════════════════
   HANDLE TOOL CLICK → show related tools
   ═══════════════════════════════════════════════════════════════ */
function handleToolClick(e) {
  const toolId = e.currentTarget.getAttribute('data-tool-id');
  const tool   = TOOLS.find(t => t.id === toolId);
  if (!tool) return;

  // Don't block navigation — it'll open same window
  // But show related strip below
  showRelatedTools(tool);
  lastClickedTool = toolId;
}

function showRelatedTools(tool) {
  const strip   = document.getElementById('related-strip');
  const relGrid = document.getElementById('related-grid');
  if (!strip || !relGrid) return;

  // Same category, different tool, max 4
  const related = TOOLS.filter(t => t.category === tool.category && t.id !== tool.id).slice(0, 4);

  if (!related.length) return;

  relGrid.innerHTML = related.map(t => `
    <a href="${escHtml(t.url || '#')}"
       class="related-card"
       aria-label="Open ${escHtml(t.name)}"
       ${t.url ? '' : 'onclick="return false" style="cursor:default;opacity:.6"'}>
      <span class="rc-icon">${t.icon}</span>
      <span class="rc-name">${escHtml(t.name)}</span>
    </a>
  `).join('');

  strip.removeAttribute('hidden');
  strip.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeRelated() {
  const strip = document.getElementById('related-strip');
  if (strip) strip.setAttribute('hidden', '');
}

/* ═══════════════════════════════════════════════════════════════
   FILTER BAR
   ═══════════════════════════════════════════════════════════════ */
function initFilterBar() {
  const bar = document.querySelector('.filter-bar');
  if (!bar) return;

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    bar.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    currentFilter = btn.getAttribute('data-filter');
    renderTools(currentFilter, currentSearch);
    closeRelated();
  });
}

/* Reset all filters — called from no-results button */
function resetFilters() {
  currentFilter = 'all';
  currentSearch = '';
  document.querySelector('.filter-btn[data-filter="all"]')?.click();
  const input = document.getElementById('tool-search');
  if (input) { input.value = ''; }
  document.getElementById('search-results')?.classList.remove('open');
  document.getElementById('search-clear')?.setAttribute('hidden', '');
}
window.resetFilters = resetFilters;
window.closeRelated = closeRelated;

/* ═══════════════════════════════════════════════════════════════
   SEARCH BAR (navbar)
   ═══════════════════════════════════════════════════════════════ */
function initSearchBar() {
  const input    = document.getElementById('tool-search');
  const dropdown = document.getElementById('search-results');
  const clearBtn = document.getElementById('search-clear');
  if (!input || !dropdown) return;

  let timer;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = input.value.trim();
      if (clearBtn) clearBtn[q ? 'removeAttribute' : 'setAttribute']('hidden', '');
      doDropdownSearch(q, dropdown);
    }, 160);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdown.classList.remove('open');
      input.blur();
    }
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (q) {
        currentSearch = q;
        renderTools(currentFilter, q);
        dropdown.classList.remove('open');
        document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' });
        input.value = '';
        if (clearBtn) clearBtn.setAttribute('hidden', '');
      }
    }
  });

  input.addEventListener('focus', () => {
    if (input.value.trim()) doDropdownSearch(input.value.trim(), dropdown);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.setAttribute('hidden', '');
      dropdown.classList.remove('open');
      currentSearch = '';
      renderTools(currentFilter, '');
    });
  }

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
}

function doDropdownSearch(q, dropdown) {
  if (!q) { dropdown.classList.remove('open'); dropdown.innerHTML = ''; return; }

  const matches = TOOLS.filter(t =>
    t.name.toLowerCase().includes(q.toLowerCase()) ||
    t.desc.toLowerCase().includes(q.toLowerCase()) ||
    categoryLabel(t.category).toLowerCase().includes(q.toLowerCase())
  ).slice(0, 7);

  if (!matches.length) {
    dropdown.innerHTML = `<div class="search-no-result">No tools found for "<strong>${escHtml(q)}</strong>" — try a different keyword</div>`;
  } else {
    dropdown.innerHTML = matches.map(t => `
      <div class="search-result-item" data-id="${t.id}" tabindex="0" role="option" aria-label="${escHtml(t.name)}">
        <span class="sri-icon">${t.icon}</span>
        <div>
          <span class="sri-name">${highlight(t.name, q)}</span>
          <span class="sri-cat">${categoryLabel(t.category)}</span>
        </div>
      </div>
    `).join('');

    dropdown.querySelectorAll('.search-result-item').forEach(item => {
      const activate = () => {
        const id   = item.getAttribute('data-id');
        const tool = TOOLS.find(t => t.id === id);
        if (!tool) return;
        dropdown.classList.remove('open');
        document.getElementById('tool-search').value = '';
        document.getElementById('search-clear')?.setAttribute('hidden', '');
        // Highlight tool category
        currentFilter = tool.category;
        currentSearch = '';
        renderTools(tool.category, '');
        // Update filter tab
        document.querySelectorAll('.filter-btn').forEach(b => {
          const active = b.getAttribute('data-filter') === tool.category;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', String(active));
        });
        // Scroll to tools
        document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' });
        // Highlight matching card briefly
        setTimeout(() => {
          const card = document.querySelector(`.tool-card[data-id="${id}"]`);
          if (card) {
            card.style.borderColor = 'var(--accent)';
            card.style.boxShadow   = '0 0 0 3px rgba(249,115,22,.2)';
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => { card.style.borderColor = ''; card.style.boxShadow = ''; }, 2000);
          }
        }, 400);
        // Show related
        if (tool.url) showRelatedTools(tool);
      };
      item.addEventListener('click', activate);
      item.addEventListener('keydown', e => { if (e.key === 'Enter') activate(); });
    });
  }

  dropdown.classList.add('open');
}

/* ═══════════════════════════════════════════════════════════════
   MOBILE SEARCH
   ═══════════════════════════════════════════════════════════════ */
function initMobileSearch() {
  const input = document.getElementById('mobile-search-input');
  if (!input) return;
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = input.value.trim();
      if (!q) return;
      currentSearch = q;
      renderTools(currentFilter, q);
      // Close mobile menu & scroll to tools
      document.getElementById('hamburger')?.classList.remove('open');
      const mm = document.getElementById('mobile-menu');
      if (mm) { mm.classList.remove('open'); mm.setAttribute('aria-hidden', 'true'); }
      document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' });
      input.value = '';
    }, 500);
  });
}

/* ═══════════════════════════════════════════════════════════════
   CATEGORY CARDS → jump to filter
   ═══════════════════════════════════════════════════════════════ */
function initCategoryJumps() {
  // Works for category cards on page + footer links
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-jump]');
    if (!el) return;
    const cat = el.getAttribute('data-jump');
    if (!cat) return;
    currentFilter = cat;
    renderTools(cat, currentSearch);
    document.querySelectorAll('.filter-btn').forEach(b => {
      const active = b.getAttribute('data-filter') === cat;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    // Scroll to tools section
    setTimeout(() => {
      document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  });
}

/* ═══════════════════════════════════════════════════════════════
   NAVBAR SCROLL
   ═══════════════════════════════════════════════════════════════ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ═══════════════════════════════════════════════════════════════
   HAMBURGER
   ═══════════════════════════════════════════════════════════════ */
function initHamburger() {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  const toggle = () => {
    const open = btn.classList.toggle('open');
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    btn.setAttribute('aria-expanded', String(open));
  };

  btn.addEventListener('click', toggle);

  menu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      btn.classList.remove('open');
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      btn.classList.remove('open');
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   THEME TOGGLE
   ═══════════════════════════════════════════════════════════════ */
function initThemeToggle() {
  const btn  = document.getElementById('theme-toggle');
  const body = document.body;
  if (!btn) return;

  const setTheme = (theme) => {
    body.setAttribute('data-theme', theme);
    body.classList.toggle('dark-mode', theme === 'dark');
  };

  const saved = localStorage.getItem('s00-theme') || 'dark';
  setTheme(saved);

  btn.addEventListener('click', () => {
    const next = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('s00-theme', next);
  });
}

/* ═══════════════════════════════════════════════════════════════
   SCROLL REVEAL
   ═══════════════════════════════════════════════════════════════ */
function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  // Stagger siblings
  document.querySelectorAll('.section-header, .stats-grid, .categories-grid, .testi-grid, .about-grid, .faq-list, .contact-grid, .newsletter-box').forEach(parent => {
    const revealKids = parent.querySelectorAll('.reveal');
    revealKids.forEach((el, i) => { el.style.transitionDelay = `${i * 60}ms`; });
  });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ═══════════════════════════════════════════════════════════════
   STAT COUNTERS
   ═══════════════════════════════════════════════════════════════ */
function initStatCounters() {
  const nums = document.querySelectorAll('.stat-num[data-target]');
  const fmt  = n => n >= 1_000_000 ? (n/1_000_000).toFixed(1).replace(/\.0$/,'')+'M+' : n >= 1_000 ? Math.round(n/1_000)+'K+' : n+'+';

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.getAttribute('data-target'), 10);
      const start  = performance.now();
      const dur    = 1600;
      const tick   = (now) => {
        const prog = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - prog, 3);
        el.textContent = fmt(Math.round(target * ease));
        if (prog < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  nums.forEach(el => observer.observe(el));
}

/* ═══════════════════════════════════════════════════════════════
   PARTICLES
   ═══════════════════════════════════════════════════════════════ */
function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const colors = ['var(--accent)', 'var(--accent-2)', 'var(--accent-3)', '#22c55e'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    const size = Math.random() * 3 + 1.5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    Object.assign(p.style, {
      width: `${size}px`, height: `${size}px`,
      left: `${Math.random()*100}%`, top: `${Math.random()*100}%`,
      background: color, boxShadow: `0 0 ${size*3}px ${color}`,
      animationDuration: `${Math.random()*5+3}s`,
      animationDelay: `${Math.random()*6}s`,
    });
    container.appendChild(p);
  }
}

/* ═══════════════════════════════════════════════════════════════
   SMOOTH SCROLL
   ═══════════════════════════════════════════════════════════════ */
function initSmoothScroll() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  });
}

/* ═══════════════════════════════════════════════════════════════
   SCROLL PROGRESS BAR
   ═══════════════════════════════════════════════════════════════ */
function initScrollProgress() {
  const bar = document.createElement('div');
  bar.id = 'scroll-progress';
  Object.assign(bar.style, {
    position: 'fixed', top: '0', left: '0', height: '2px', width: '0%',
    background: 'linear-gradient(90deg,var(--accent),var(--accent-2))',
    zIndex: '9000', transition: 'width .1s linear', pointerEvents: 'none',
  });
  document.body.prepend(bar);
  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = total > 0 ? `${(window.scrollY / total) * 100}%` : '0%';
  }, { passive: true });
}

/* ═══════════════════════════════════════════════════════════════
   BACK TO TOP
   ═══════════════════════════════════════════════════════════════ */
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 500), { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ═══════════════════════════════════════════════════════════════
   FAQ ACCORDION — one open at a time
   ═══════════════════════════════════════════════════════════════ */
function initFAQ() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    item.addEventListener('toggle', () => {
      if (item.open) items.forEach(o => { if (o !== item) o.removeAttribute('open'); });
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   ACTIVE NAV LINKS
   ═══════════════════════════════════════════════════════════════ */
function initActiveNavLinks() {
  const sections = document.querySelectorAll('section[id], header[id]');
  const navLinks = document.querySelectorAll('.nav-links .nav-link');
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => {
      if (!e.isIntersecting) return;
      const id = e.target.getAttribute('id');
      navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
    }),
    { rootMargin: '-40% 0px -55% 0px' }
  );
  sections.forEach(s => observer.observe(s));
}

/* ═══════════════════════════════════════════════════════════════
   FOOTER YEAR
   ═══════════════════════════════════════════════════════════════ */
function initFooterYear() {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
}

/* ═══════════════════════════════════════════════════════════════
   NEWSLETTER FORM
   ═══════════════════════════════════════════════════════════════ */
function handleNewsletterSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('nl-email');
  const email = input?.value.trim();

  if (!email || !isValidEmail(email)) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }

  const btn = e.target.querySelector('button');
  const orig = btn.textContent;
  btn.textContent = 'Subscribing…';
  btn.disabled = true;

  setTimeout(() => {
    btn.textContent = '✓ Subscribed!';
    if (input) input.value = '';
    showToast('🎉 You\'re subscribed! New tools coming your way.', 'success');
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3500);
  }, 900);
}
window.handleNewsletterSubmit = handleNewsletterSubmit;

/* ═══════════════════════════════════════════════════════════════
   CONTACT FORM
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   How it works:
   1. User fills form and clicks "Send Message"
   2. We validate fields
   3. We build a mailto: URL with all fields pre-filled
   4. window.location.href opens the user's default mail app
      (Gmail app / Outlook / Apple Mail) with everything filled
   5. User clicks Send in their mail app — 1 manual click
   ═══════════════════════════════════════════════════════════════ */
function handleContactSubmit(e) {
  e.preventDefault();

  const form    = document.getElementById('contact-form');
  const toEmail = form ? form.getAttribute('data-email') : 'hellowsupprt@gmail.com';

  const name    = document.getElementById('cf-name')?.value.trim()    || '';
  const email   = document.getElementById('cf-email')?.value.trim()   || '';
  const subject = document.getElementById('cf-subject')?.value.trim() || 'Message from social00.com';
  const message = document.getElementById('cf-message')?.value.trim() || '';
  const fb      = document.getElementById('form-feedback');

  // Validate
  if (!name) { setFeedback(fb, 'Please enter your name.', 'error'); return; }
  if (!email || !isValidEmail(email)) { setFeedback(fb, 'Please enter a valid email address.', 'error'); return; }
  if (!message) { setFeedback(fb, 'Please enter a message.', 'error'); return; }

  // Build pre-filled email body
  const emailBody = [
    `Name: ${name}`,
    `From: ${email}`,
    ``,
    `Message:`,
    message,
    ``,
    `---`,
    `Sent via social00.com contact form`,
  ].join('\n');

  const mailtoURL = `mailto:${encodeURIComponent(toEmail)}`
    + `?subject=${encodeURIComponent(subject)}`
    + `&body=${encodeURIComponent(emailBody)}`;

  // Open mail app
  window.location.href = mailtoURL;

  // Show success
  setFeedback(fb, '✓ Your mail app is opening with all details pre-filled. Just hit Send!', 'success');

  // Optionally reset form after a delay
  setTimeout(() => {
    e.target.reset();
    setFeedback(fb, '', '');
  }, 6000);
}
window.handleContactSubmit = handleContactSubmit;

function setFeedback(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.className   = `form-feedback ${type}`;
}

/* ═══════════════════════════════════════════════════════════════
   TOAST NOTIFICATION
   ═══════════════════════════════════════════════════════════════ */
function showToast(message, type = 'success') {
  document.getElementById('s00-toast')?.remove();
  const toast = document.createElement('div');
  toast.id = 's00-toast';
  Object.assign(toast.style, {
    position: 'fixed', bottom: '1.8rem', left: '50%',
    transform: 'translateX(-50%) translateY(20px)',
    background: type === 'success' ? '#22c55e' : '#ef4444',
    color: '#fff', padding: '.72rem 1.5rem', borderRadius: '100px',
    fontSize: '.92rem', fontWeight: '600', fontFamily: 'var(--font-body)',
    zIndex: '9999', boxShadow: '0 8px 30px rgba(0,0,0,.3)',
    opacity: '0', transition: 'opacity .3s, transform .3s',
    whiteSpace: 'nowrap', maxWidth: '90vw',
  });
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(-50%) translateY(0)'; });
  setTimeout(() => {
    toast.style.opacity = '0'; toast.style.transform = 'translateX(-50%) translateY(10px)';
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3500);
}

/* ═══════════════════════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════════════════════ */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function highlight(text, query) {
  const safe  = escHtml(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
  return safe.replace(regex, '<mark style="background:rgba(249,115,22,.25);color:inherit;border-radius:2px;padding:0 2px">$1</mark>');
}