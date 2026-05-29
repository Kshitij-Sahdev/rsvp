export const THEMES = {
  dark:     { bg: '#0a0a0a', bgSurface: '#141414', text: '#e8e4dc', textDim: 'rgba(255,255,255,0.38)', border: 'rgba(255,255,255,0.07)', surface: 'rgba(255,255,255,0.04)', guide: 'rgba(255,255,255,0.06)', badge: 'rgba(255,255,255,0.22)' },
  amoled:   { bg: '#000000', bgSurface: '#0a0a0a', text: '#e8e4dc', textDim: 'rgba(255,255,255,0.35)', border: 'rgba(255,255,255,0.06)', surface: 'rgba(255,255,255,0.03)', guide: 'rgba(255,255,255,0.04)', badge: 'rgba(255,255,255,0.20)' },
  sepia:    { bg: '#1a1611', bgSurface: '#231e17', text: '#d4c5a9', textDim: 'rgba(212,197,169,0.38)', border: 'rgba(212,197,169,0.10)', surface: 'rgba(212,197,169,0.05)', guide: 'rgba(212,197,169,0.06)', badge: 'rgba(212,197,169,0.25)' },
  paper:    { bg: '#f5f1eb', bgSurface: '#eae5dd', text: '#2c2c2c', textDim: 'rgba(44,44,44,0.40)', border: 'rgba(0,0,0,0.10)', surface: 'rgba(0,0,0,0.04)', guide: 'rgba(0,0,0,0.06)', badge: 'rgba(0,0,0,0.28)' },
  graphite: { bg: '#1c1c1e', bgSurface: '#2c2c2e', text: '#d1d1d6', textDim: 'rgba(209,209,214,0.38)', border: 'rgba(255,255,255,0.08)', surface: 'rgba(255,255,255,0.05)', guide: 'rgba(255,255,255,0.06)', badge: 'rgba(255,255,255,0.24)' },
};

export const ORP_COLORS = {
  red:   { color: '#c0392b', glow: 'rgba(192,57,43,0.25)' },
  amber: { color: '#d4a017', glow: 'rgba(212,160,23,0.25)' },
  cyan:  { color: '#00b4d8', glow: 'rgba(0,180,216,0.25)' },
  lime:  { color: '#7cb518', glow: 'rgba(124,181,24,0.25)' },
};

export const FONTS = [
  { value: "'EB Garamond', serif", label: 'EB Garamond' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Literata', serif", label: 'Literata' },
  { value: "'IBM Plex Sans', sans-serif", label: 'IBM Plex Sans' },
  { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono' },
  { value: "'OpenDyslexic', sans-serif", label: 'OpenDyslexic' },
];

export const FOCUS_MODES = ['zen', 'guided', 'sentence'];

export const READING_MODES = ['rsvp', 'flow', 'teleprompter'];

export const WPM_RANGE = { min: 60, max: 1200, step: 25, default: 300 };

export const GESTURES = {
  SEEK_DELTA: 8,
  SPEED_DELTA: 25,
  LONG_PRESS_MS: 600,
  TAP_MAX_DIST: 12,
  TAP_MAX_MS: 250,
  DRAG_THRESHOLD: 15,
  MULTI_TAP_WINDOW: 350,
};

export const DEFAULT_PREFS = {
  theme: 'dark',
  orp: 'red',
  focus: 'guided',
  mode: 'rsvp',
  font: "'EB Garamond', serif",
  fontSize: 42,
  fontWeight: 400,
  letterSpacing: 0,
  contextOpacity: 20,
  sound: 'off',
  dyslexia: false,
  reduceMotion: false,
  highContrast: false,
  wpm: 300,
};

export const SAMPLE_TEXT = `Speed reading is the process of rapidly recognizing and absorbing phrases or sentences on a page all at once, rather than identifying individual words.

The amount of information we process seems to grow by the day, whether it is emails, reports and websites at work, or social media, books and magazines at home. We likely feel that we could not possibly cope with this information, let alone recall and respond to it.

RSVP, or Rapid Serial Visual Presentation, is a technique that flashes words one at a time at a fixed point on the screen. By eliminating the need for eye movement across lines, RSVP can dramatically increase your reading speed while maintaining comprehension.

The red letter you see is called the Optimal Recognition Point — where your eye naturally focuses on each word. This technique was pioneered by researchers studying how the brain processes written language, and has been refined into the elegant system you are about to experience.

Reading is not merely decoding symbols. It is the act of thought itself moving through another mind's architecture. When the interface disappears, only the ideas remain.`;
