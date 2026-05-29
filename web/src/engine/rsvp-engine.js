// rsvp-engine.js — ES module port of the C++ RSVP engine
// All reading logic lives here. UI never touches timing math.

// ── ORP Algorithm ─────────────────────────────────────────────
// Optimal Recognition Point: ~35% into the word.
function orpIndex(word) {
  let len = 0, first = -1;
  for (let i = 0; i < word.length; i++) {
    if (/[a-zA-Z]/.test(word[i])) {
      if (first < 0) first = i;
      len++;
    }
  }
  if (len === 0 || first < 0) return 0;
  const pos = len <= 1 ? 0 : len <= 5 ? 1 : len <= 9 ? 2 : len <= 13 ? 3 : 4;
  let count = 0;
  for (let i = first; i < word.length; i++) {
    if (/[a-zA-Z]/.test(word[i])) {
      if (count === pos) return i;
      count++;
    }
  }
  return first;
}

// ── Adaptive Duration ─────────────────────────────────────────
function wordDur(word, wpm, flags) {
  const base = 60000 / wpm;
  let scale = 1;
  const len = word.length;
  if (len > 8) scale = 1.15;
  if (len > 13) scale = 1.30;
  for (let i = 1; i < len; i++) {
    if (/\d/.test(word[i])) { scale *= 1.20; break; }
    if (/[A-Z]/.test(word[i])) { scale *= 1.10; break; }
  }
  if (len >= 3) {
    const alphas = word.replace(/[^a-zA-Z]/g, '');
    if (alphas.length >= 3 && alphas === alphas.toUpperCase()) scale *= 1.15;
  }
  if (flags.sentenceEnd) scale *= 1.60;
  else if (flags.hasComma) scale *= 1.30;
  else if (flags.hasDash) scale *= 1.20;
  if (flags.paragraphBreak) scale *= 2.00;
  if (flags.inQuote) scale *= 1.05;
  return Math.max(50, Math.min(2000, Math.round(base * scale)));
}

// ── Small words for semantic chunking ─────────────────────────
const SMALL_WORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'at', 'to', 'by', 'of', 'for',
  'with', 'from', 'and', 'or', 'but', 'is', 'it', 'its', 'as',
  'if', 'so', 'no', 'not', 'my', 'his', 'her', 'our', 'your',
  'this', 'that', 'was', 'were', 'has', 'had', 'be', 'do', 'did',
]);

// ── Sentence-end detection ────────────────────────────────────
const SENTENCE_END_RE = /[.!?][\u201D"'\u2019)}\]]*$/;
const COMMA_RE = /[,;:]$/;
const DASH_RE = /[\u2014\u2013-]$/;

// ── Engine states ─────────────────────────────────────────────
const State = Object.freeze({
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
});

// ── RSVPEngine ────────────────────────────────────────────────
class RSVPEngine {
  constructor() {
    this._tokens = [];       // processed Token objects
    this._rawTokens = [];    // raw word strings before chunking
    this._sentenceMap = [];  // sentence_idx → [startIdx, endIdx]
    this._wpm = 300;
    this._state = State.IDLE;
    this._cur = 0;
    this._timer = null;
    this._chunkMode = false;
    this._speedMult = 1.0;
    this._targetMult = 1.0;
    this._easeRaf = null;
    this._startTime = 0;
    this._wordsRead = 0;

    // Callbacks
    this.onToken = null;   // (token, index, total) => void
    this.onState = null;   // (state) => void
    this.onDone = null;    // () => void
  }

  // ── Public API ────────────────────────────────────────────

  load(text, wpm) {
    this.stop();
    this._wpm = this._clampWpm(wpm || 300);
    this._cur = 0;
    this._wordsRead = 0;
    this._startTime = 0;
    this._speedMult = 1.0;
    this._targetMult = 1.0;
    this._tokenize(text);
    this._setState(State.PAUSED);
  }

  play() {
    if (this._tokens.length === 0) return;
    if (this._state === State.PLAYING) return;
    if (this._cur >= this._tokens.length) this._cur = 0;
    if (this._startTime === 0) this._startTime = Date.now();
    this._setState(State.PLAYING);
    this._scheduleNext();
  }

  pause() {
    if (this._state !== State.PLAYING) return;
    this._clearTimer();
    this._setState(State.PAUSED);
  }

  toggle() {
    if (this._state === State.PLAYING) this.pause();
    else this.play();
  }

  stop() {
    this._clearTimer();
    this._cancelEase();
    this._cur = 0;
    this._setState(State.IDLE);
  }

  seek(delta) {
    if (this._tokens.length === 0) return;
    const wasPlaying = this._state === State.PLAYING;
    this._clearTimer();
    this._cur = Math.max(0, Math.min(this._tokens.length - 1, this._cur + delta));
    this._emitToken();
    if (wasPlaying) this._scheduleNext();
  }

  setWpm(wpm) {
    this._wpm = this._clampWpm(wpm);
    // Recompute durations for all tokens
    for (const t of this._tokens) {
      t.dur_ms = wordDur(t.word, this._wpm, {
        sentenceEnd: t.sentence_end,
        hasComma: COMMA_RE.test(t.raw),
        hasDash: DASH_RE.test(t.raw),
        paragraphBreak: t.paragraph_break || false,
        inQuote: t.in_quote || false,
      });
    }
  }

  getWpm() { return this._wpm; }
  getState() { return this._state; }
  getCur() { return this._cur; }
  getTotal() { return this._tokens.length; }
  getProgress() { return this._tokens.length === 0 ? 0 : this._cur / (this._tokens.length - 1); }

  getToken(index) {
    if (index < 0 || index >= this._tokens.length) return null;
    return this._tokens[index];
  }

  getRawToken(index) {
    if (index < 0 || index >= this._rawTokens.length) return null;
    return this._rawTokens[index];
  }

  getRawTokens() {
    return this._rawTokens;
  }

  getSentenceIndices(index) {
    if (index < 0 || index >= this._tokens.length) return null;
    const si = this._tokens[index].sentence_idx;
    return this._sentenceMap[si] || null;
  }

  getSentence(index) {
    const indices = this.getSentenceIndices(index);
    if (!indices) return '';
    return this._tokens
      .slice(indices[0], indices[1] + 1)
      .map(t => t.raw)
      .join(' ');
  }

  setChunkMode(enabled) {
    this._chunkMode = !!enabled;
  }

  setSpeedMultiplier(mult) {
    this._targetMult = Math.max(0.25, Math.min(4.0, mult));
    this._easeToTarget();
  }

  getSpeedMultiplier() { return this._speedMult; }

  resetSpeedMultiplier() {
    this._targetMult = 1.0;
    this._easeToTarget();
  }

  getAnalytics() {
    const elapsed = this._startTime > 0 ? (Date.now() - this._startTime) / 1000 : 0;
    return {
      wordsRead: this._wordsRead,
      elapsedSec: Math.round(elapsed),
      effectiveWpm: elapsed > 0 ? Math.round((this._wordsRead / elapsed) * 60) : 0,
      progress: this.getProgress(),
      totalWords: this._tokens.length,
    };
  }

  // ── Internals ─────────────────────────────────────────────

  _clampWpm(v) { return Math.max(60, Math.min(1200, Math.round(v))); }

  _setState(s) {
    if (this._state === s) return;
    this._state = s;
    if (this.onState) this.onState(s);
  }

  _clearTimer() {
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  _cancelEase() {
    if (this._easeRaf !== null) {
      cancelAnimationFrame(this._easeRaf);
      this._easeRaf = null;
    }
  }

  _emitToken() {
    if (this._cur < this._tokens.length && this.onToken) {
      this.onToken(this._tokens[this._cur], this._cur, this._tokens.length);
    }
  }

  _scheduleNext() {
    if (this._state !== State.PLAYING) return;
    if (this._cur >= this._tokens.length) {
      this._setState(State.PAUSED);
      if (this.onDone) this.onDone();
      return;
    }
    this._emitToken();
    const t = this._tokens[this._cur];
    const delay = Math.max(20, Math.round(t.dur_ms / this._speedMult));
    this._timer = setTimeout(() => {
      this._wordsRead++;
      this._cur++;
      this._scheduleNext();
    }, delay);
  }

  // Cubic ease-out over ~300ms via requestAnimationFrame
  _easeToTarget() {
    this._cancelEase();
    const startMult = this._speedMult;
    const endMult = this._targetMult;
    const duration = 300; // ms
    const startT = performance.now();

    const step = (now) => {
      const elapsed = now - startT;
      const t = Math.min(1, elapsed / duration);
      // cubic ease-out: 1 - (1-t)^3
      const ease = 1 - Math.pow(1 - t, 3);
      this._speedMult = startMult + (endMult - startMult) * ease;
      if (t < 1) {
        this._easeRaf = requestAnimationFrame(step);
      } else {
        this._speedMult = endMult;
        this._easeRaf = null;
      }
    };
    this._easeRaf = requestAnimationFrame(step);
  }

  // ── Tokenizer ─────────────────────────────────────────────

  _tokenize(text) {
    this._tokens = [];
    this._rawTokens = [];
    this._sentenceMap = [];

    if (!text || !text.trim()) return;

    // Split into paragraphs (double newline)
    const paragraphs = text.split(/\n\s*\n/);
    let sentenceIdx = 0;
    let inQuote = false;
    let tokenIdx = 0;

    for (let pi = 0; pi < paragraphs.length; pi++) {
      const para = paragraphs[pi].trim();
      if (!para) continue;

      // Split paragraph into words
      const words = para.split(/\s+/).filter(Boolean);
      const rawWords = [];

      for (const w of words) {
        rawWords.push(w);
        this._rawTokens.push(w);
      }

      let i = 0;
      while (i < rawWords.length) {
        let raw = rawWords[i];
        let word = raw;

        // Semantic chunking: group small words with the next word
        if (this._chunkMode && i + 1 < rawWords.length) {
          const lower = raw.toLowerCase().replace(/[^a-z]/g, '');
          if (SMALL_WORDS.has(lower)) {
            const next = rawWords[i + 1];
            if ((raw.length + 1 + next.length) < 12) {
              raw = raw + ' ' + next;
              word = raw;
              i++; // skip the next word
              this._rawTokens.push(raw); // adjust — but we already pushed individually
            }
          }
        }

        // Track quote state
        for (const ch of raw) {
          if (ch === '"' || ch === '\u201C') inQuote = true;
          if (ch === '"' || ch === '\u201D') inQuote = false;
        }

        // Peel trailing punctuation
        const punctMatch = raw.match(/([.!?,;:\u2014\u2013\-\u201D"'\u2019)}\]]+)$/);
        const punct = punctMatch ? punctMatch[1] : '';
        const core = punct ? raw.slice(0, raw.length - punct.length) : raw;

        // Detect sentence end
        const sentenceEnd = SENTENCE_END_RE.test(raw);
        const paragraphBreak = (pi < paragraphs.length - 1) && (i === rawWords.length - 1);

        // Compute ORP
        const oi = orpIndex(core || raw);
        const display = core || raw;
        const before = display.slice(0, oi);
        const orp = display[oi] || '';
        const after = display.slice(oi + 1);

        // Compute duration
        const flags = {
          sentenceEnd,
          hasComma: COMMA_RE.test(raw),
          hasDash: DASH_RE.test(raw),
          paragraphBreak,
          inQuote,
        };
        const dur = wordDur(core || raw, this._wpm, flags);

        const token = {
          before,
          orp,
          after,
          punct,
          word: core || raw,
          raw,
          sentence_end: sentenceEnd,
          sentence_idx: sentenceIdx,
          paragraph_break: paragraphBreak,
          in_quote: inQuote,
          dur_ms: dur,
        };

        this._tokens.push(token);

        // Track sentence mapping
        if (!this._sentenceMap[sentenceIdx]) {
          this._sentenceMap[sentenceIdx] = [tokenIdx, tokenIdx];
        } else {
          this._sentenceMap[sentenceIdx][1] = tokenIdx;
        }

        tokenIdx++;

        // Advance sentence index after sentence end
        if (sentenceEnd) sentenceIdx++;

        i++;
      }
    }
  }
}

export default RSVPEngine;
export { orpIndex };
