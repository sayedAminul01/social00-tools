'use strict';

/* ============================================================
   Reel Script Generator
   100% client-side template engine — no external API calls,
   no AI model. Each format is a hand-built beat structure with
   realistic timestamps; every beat pulls phrasing from a bank
   of on-screen-action and text-overlay templates and drops in
   the user's topic. Regenerate re-rolls which template wins.
   ============================================================ */

// Shared hook-line bank — used for every format's opening beat,
// since Reels lose viewers in under a second without a strong
// visual/verbal pattern-interrupt right away.
const HOOK_LINES = [
  'Wait — you\'re doing {topic} wrong.',
  'Nobody tells you this about {topic}.',
  'Stop scrolling if you care about {topic}.',
  'I wish someone told me this about {topic} sooner.',
  'This changed how I think about {topic}.',
  'POV: you just found the {topic} hack everyone\'s hiding.',
  '3 seconds to save you hours on {topic}.',
  'The {topic} mistake almost everyone makes.'
];

const FORMATS = {
  quicktip: {
    label: 'Quick Tip / Hack',
    totalLabel: '~15s total',
    beats: [
      {
        time: '0-2s', tag: 'Hook',
        action: [
          'Jump-cut zoom on your face as you say the hook line',
          'Snap zoom + pattern-interrupt hand movement while speaking to camera',
          'Whip-pan into frame with direct eye contact with the camera'
        ],
        overlay: HOOK_LINES
      },
      {
        time: '2-4s', tag: 'Problem',
        action: [
          'Talk to camera with a relatable, frustrated expression',
          'Cut to a quick clip showing the common struggle with {topic}',
          'Point at or hold up the thing that\'s usually done wrong'
        ],
        overlay: [
          'Here\'s the problem with {topic}...',
          'Most people get {topic} wrong because of this',
          'This is why {topic} feels so hard'
        ]
      },
      {
        time: '4-10s', tag: 'The Tip',
        action: [
          'Demonstrate the fix step-by-step, numbered on screen',
          'Close-up B-roll of each step for {topic}, cutting on action every 1-2s',
          'Split-screen: you explaining on one side, hands doing the steps on the other'
        ],
        overlay: [
          'Step 1... step 2... step 3',
          'Here\'s exactly how to fix {topic}',
          'Do this instead'
        ]
      },
      {
        time: '10-13s', tag: 'Payoff',
        action: [
          'Show the finished result — quick before/after cut for {topic}',
          'Genuine on-camera reaction to the result',
          'Fast montage landing on the payoff moment'
        ],
        overlay: [
          'And that\'s it.',
          'Look at the difference',
          'This actually works'
        ]
      },
      {
        time: '13-15s', tag: 'CTA',
        action: [
          'Point up toward the follow button, smile at camera',
          'Freeze on the last frame while the overlay text lands'
        ],
        overlay: [
          'Follow for more {topic} tips',
          'Save this for later',
          'Follow for more like this'
        ]
      }
    ]
  },

  beforeafter: {
    label: 'Before & After',
    totalLabel: '~18s total',
    beats: [
      {
        time: '0-1s', tag: 'Hook',
        action: [
          'Quick 1-frame flash of the finished "after" result, then cut away',
          'Tease the end result for a split second before rewinding to the start'
        ],
        overlay: HOOK_LINES
      },
      {
        time: '1-3s', tag: 'Before',
        action: [
          'Show the starting "before" state of {topic}, plain and unfiltered',
          'Static shot of the before state while reacting to it on camera'
        ],
        overlay: [
          'Before...',
          'This is where I started with {topic}',
          'Not gonna lie, this was rough'
        ]
      },
      {
        time: '3-4s', tag: 'Setup',
        action: [
          'Quick line to camera on exactly what you\'re about to do',
          'Text-only frame stating the plan for {topic}'
        ],
        overlay: [
          'Here\'s what I changed',
          'Watch what happens next',
          'This is the process'
        ]
      },
      {
        time: '4-13s', tag: 'Process',
        action: [
          'Fast cuts of each transformation step, 1-2s per clip',
          'Sped-up montage of the {topic} process',
          'Jump cuts between the 3-4 key process moments'
        ],
        overlay: [
          'The process...',
          'Step by step',
          'Worth the effort'
        ]
      },
      {
        time: '13-17s', tag: 'After Reveal',
        action: [
          'Hold on the finished "after" shot for a beat, let it breathe',
          'Slow pan or zoom reveal of the after result'
        ],
        overlay: [
          'After.',
          'The result speaks for itself',
          'Worth every minute'
        ]
      },
      {
        time: '17-18s', tag: 'CTA',
        action: [
          'React and smile to camera, point toward the follow button'
        ],
        overlay: [
          'Follow for more {topic} transformations',
          'Which one surprised you more?'
        ]
      }
    ]
  },

  dayinthelife: {
    label: 'Day in the Life',
    totalLabel: '~28s total',
    beats: [
      {
        time: '0-2s', tag: 'Hook',
        action: [
          'Walk straight toward camera, direct address to open the day',
          'POV shot starting your day as you say the hook line'
        ],
        overlay: HOOK_LINES
      },
      {
        time: '2-8s', tag: 'Morning',
        action: [
          'Quick 1-2s clips of your morning routine tied to {topic}',
          'Time-stamped text over morning B-roll'
        ],
        overlay: [
          '7:00 AM —',
          'Morning:',
          'Starting the day with {topic}'
        ]
      },
      {
        time: '8-15s', tag: 'Midday',
        action: [
          'Show the core {topic} activity in the middle of your day',
          'Work/desk B-roll intercut with a short to-camera line'
        ],
        overlay: [
          '12:00 PM —',
          'The main event:',
          'This is where {topic} happens'
        ]
      },
      {
        time: '15-22s', tag: 'Evening',
        action: [
          'Wind-down clips — food, rest, or a second {topic}-related moment',
          'Golden-hour B-roll with a short reflective line to camera'
        ],
        overlay: [
          '6:00 PM —',
          'Winding down',
          'Still thinking about {topic}'
        ]
      },
      {
        time: '22-26s', tag: 'Recap',
        action: [
          'Rapid flash-cut recap of the day\'s best 3-4 clips, cut on-beat',
          'Speed-ramped montage of the day\'s highlights'
        ],
        overlay: [
          'That was my day.',
          'A day in the life of {topic}',
          'Recap:'
        ]
      },
      {
        time: '26-28s', tag: 'CTA',
        action: [
          'Sign off to camera with a wave or a point toward follow'
        ],
        overlay: [
          'Follow along for more days like this',
          'Want to see tomorrow?'
        ]
      }
    ]
  },

  soundtransition: {
    label: 'Trending Sound Transition',
    totalLabel: '~12s total',
    beats: [
      {
        time: '0-1s', tag: 'Hook Pose',
        action: [
          'Freeze in a starting pose or expression right before the beat drop',
          'Hold a deadpan look directly at camera, waiting for the drop'
        ],
        overlay: HOOK_LINES
      },
      {
        time: '1-3s', tag: 'Build-Up',
        action: [
          'Small building movement synced to the pre-drop rhythm',
          'Slow push-in on camera building anticipation for {topic}'
        ],
        overlay: [
          'Wait for it...',
          'Almost there...',
          '3...2...1...'
        ]
      },
      {
        time: '3-4s', tag: 'The Transition',
        action: [
          'Snap transition exactly on the beat drop — outfit, scene or object change for {topic}',
          'Hard cut or whip-pan timed to the drop, revealing the {topic} change'
        ],
        overlay: [
          'The switch',
          'Transformation',
          'Watch this'
        ]
      },
      {
        time: '4-9s', tag: 'Reveal',
        action: [
          '2-3 smaller secondary transitions showing more of {topic}',
          'Quick cuts revealing different angles or details tied to {topic}'
        ],
        overlay: [
          'Look closer',
          'Details',
          'This is the vibe'
        ]
      },
      {
        time: '9-11s', tag: 'Final Pose',
        action: [
          'Hold the final pose or result on the last strong beat',
          'Freeze frame on the completed {topic} look or result'
        ],
        overlay: [
          'Done.',
          'That\'s the vibe',
          'Final look'
        ]
      },
      {
        time: '11-12s', tag: 'CTA',
        action: [
          'Quick point to camera or follow gesture on the last note'
        ],
        overlay: [
          'Follow for more {topic} transitions',
          'Try this trend yourself'
        ]
      }
    ]
  },

  storytime: {
    label: 'Storytime',
    totalLabel: '~28s total',
    beats: [
      {
        time: '0-2s', tag: 'Hook',
        action: [
          'Face camera and tease the ending without giving it away',
          'Quick flash of the twist moment, then cut to "let me explain"'
        ],
        overlay: HOOK_LINES
      },
      {
        time: '2-6s', tag: 'Set the Scene',
        action: [
          'Talk to camera establishing when and where this happened with {topic}',
          'B-roll of the setting while you narrate in voiceover'
        ],
        overlay: [
          'So this happened...',
          'Let me set the scene',
          'It started with {topic}'
        ]
      },
      {
        time: '6-12s', tag: 'Rising Action 1',
        action: [
          'Continue the story to camera as the first complication with {topic} appears',
          'Re-enact or show the first turning point'
        ],
        overlay: [
          'Then things got weird...',
          'That\'s when it happened',
          'Little did I know...'
        ]
      },
      {
        time: '12-18s', tag: 'Rising Action 2',
        action: [
          'Escalate the story with the second beat of tension around {topic}',
          'Cut to a reaction shot or re-enactment of the complication'
        ],
        overlay: [
          'It got worse.',
          'I couldn\'t believe it',
          'This is where it gets good'
        ]
      },
      {
        time: '18-24s', tag: 'Twist',
        action: [
          'Deliver the twist directly to camera — your biggest reaction beat',
          'Reveal the twist with a hard cut and a genuine reaction'
        ],
        overlay: [
          'And then...',
          'Plot twist:',
          'Here\'s the twist'
        ]
      },
      {
        time: '24-28s', tag: 'Resolution + CTA',
        action: [
          'Wrap up the story to camera and ask a question to invite comments'
        ],
        overlay: [
          'Moral of the story?',
          'Comment your version of this',
          'Follow for more stories like this'
        ]
      }
    ]
  }
};

const els = {
  topicInput: document.getElementById('topicInput'),
  formatSelect: document.getElementById('formatSelect'),
  generateBtn: document.getElementById('generateBtn'),
  resultsWrap: document.getElementById('resultsWrap'),
  resultsMeta: document.getElementById('resultsMeta'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  copyScriptBtn: document.getElementById('copyScriptBtn'),
  shotList: document.getElementById('shotList'),
};

// Holds the last generated beat choices so "Copy Full Script"
// always matches exactly what's on screen.
let currentScript = null; // { topic, formatKey, beats: [{time, tag, action, overlay}] }

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillTopic(str, topic) {
  return str.split('{topic}').join(topic);
}

function buildBeats(formatKey, topic) {
  const format = FORMATS[formatKey];
  return format.beats.map(beat => ({
    time: beat.time,
    tag: beat.tag,
    action: fillTopic(pick(beat.action), topic),
    overlay: fillTopic(pick(beat.overlay), topic),
  }));
}

function renderScript(formatKey, topic, beats) {
  const format = FORMATS[formatKey];
  els.resultsMeta.textContent = `${format.label} · ${format.totalLabel}`;

  els.shotList.innerHTML = beats.map(beat => `
    <div class="shot-row">
      <div class="shot-time">
        <span class="time-badge">${escapeHtml(beat.time)}</span>
        <span class="beat-tag">${escapeHtml(beat.tag)}</span>
      </div>
      <div class="shot-body">
        <div class="shot-field">
          <span class="shot-field-label">On-Screen Action</span>
          <span class="shot-field-value">${escapeHtml(beat.action)}</span>
        </div>
        <div class="shot-field">
          <span class="shot-field-label">Text Overlay</span>
          <span class="shot-field-value overlay-value">${escapeHtml(beat.overlay)}</span>
        </div>
      </div>
    </div>
  `).join('');

  els.resultsWrap.hidden = false;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function generate() {
  const topic = els.topicInput.value.trim();
  if (!topic) {
    window.showToast('Please enter a Reel topic first');
    els.topicInput.focus();
    return;
  }
  const formatKey = els.formatSelect.value;
  const beats = buildBeats(formatKey, topic);
  currentScript = { topic, formatKey, beats };
  renderScript(formatKey, topic, beats);
  els.resultsWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function regenerate() {
  if (!currentScript) { generate(); return; }
  const beats = buildBeats(currentScript.formatKey, currentScript.topic);
  currentScript.beats = beats;
  renderScript(currentScript.formatKey, currentScript.topic, beats);
}

function copyScript() {
  if (!currentScript) {
    window.showToast('Generate a script first');
    return;
  }
  const format = FORMATS[currentScript.formatKey];
  const lines = [
    `REEL SCRIPT — ${currentScript.topic}`,
    `Format: ${format.label} (${format.totalLabel})`,
    ''
  ];
  currentScript.beats.forEach(beat => {
    lines.push(`[${beat.time}] ${beat.tag.toUpperCase()}`);
    lines.push(`On-screen: ${beat.action}`);
    lines.push(`Text overlay: ${beat.overlay}`);
    lines.push('');
  });
  copyToClipboard(lines.join('\n').trim(), 'Full script copied');
}

els.generateBtn.addEventListener('click', generate);
els.regenerateBtn.addEventListener('click', regenerate);
els.copyScriptBtn.addEventListener('click', copyScript);
els.topicInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') generate();
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderAffiliateBox === 'function') renderAffiliateBox('instagram');
});
