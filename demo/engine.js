/* ═══════════════════════════════════════════════════════════════════
   RSVP Engine — Faithful JS port of core/rsvp_engine.hpp
   Enhanced with: semantic chunking, adaptive timing, reading modes,
   analytics tracking, speed multiplier
   ═══════════════════════════════════════════════════════════════════ */

(function() {
'use strict';

// ── ORP Algorithm ─────────────────────────────────────────────────
// Optimal Recognition Point: ~35% into the word.
// Position table matches the C++ engine exactly.
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

// ── Adaptive Duration ─────────────────────────────────────────────
// Enhanced beyond the C++ engine with additional heuristics.
function wordDur(word, wpm, flags) {
    const base = 60000 / wpm;
    let scale = 1;
    const len = word.length;

    // Length bonuses
    if (len > 8)  scale = 1.15;
    if (len > 13) scale = 1.30;

    // Digit or mid-word caps (proper nouns)
    for (let i = 1; i < len; i++) {
        if (/\d/.test(word[i])) { scale *= 1.20; break; }
        if (/[A-Z]/.test(word[i])) { scale *= 1.10; break; }
    }

    // ALL CAPS (3+ alphabetic chars)
    if (len >= 3) {
        const alphas = word.replace(/[^a-zA-Z]/g, '');
        if (alphas.length >= 3 && alphas === alphas.toUpperCase()) {
            scale *= 1.15;
        }
    }

    // Punctuation pauses
    if (flags.sentenceEnd) scale *= 1.60;
    else if (flags.hasComma)  scale *= 1.30;
    else if (flags.hasDash)   scale *= 1.20;

    // Paragraph break
    if (flags.paragraphBreak) scale *= 2.00;

    // Inside quotes
    if (flags.inQuote) scale *= 1.05;

    return Math.max(50, Math.min(2000, Math.round(base * scale)));
}

// ── Tokenizer ─────────────────────────────────────────────────────
// Splits text into Token objects with ORP info and adaptive durations.
function tokenise(text, wpm) {
    const tokens = [];
    if (!text || !text.trim()) return tokens;

    // Detect paragraph breaks (double newline positions in original text)
    const paragraphBreaks = new Set();
    let charIdx = 0;
    const words = [];
    let inQuote = false;
    let sentenceIdx = 0;

    // First pass: extract word positions and detect paragraph breaks
    const rawParts = text.split(/(\s+)/);
    let wordIndex = 0;
    for (const part of rawParts) {
        if (/\S/.test(part)) {
            words.push({ raw: part, charPos: charIdx, paragraphBreak: false });
            wordIndex++;
        } else {
            // Check for paragraph break (double newline)
            if (/\n\s*\n/.test(part) && words.length > 0) {
                // Mark next word as after paragraph break
                paragraphBreaks.add(words.length);
            }
        }
        charIdx += part.length;
    }

    // Second pass: build tokens
    for (let w = 0; w < words.length; w++) {
        const raw = words[w].raw;

        // Peel trailing punctuation
        let end = raw.length;
        while (end > 0 && /[^\w]/.test(raw[end - 1])) end--;
        let clean = raw.substring(0, end);
        let trail = raw.substring(end);
        if (!clean) { clean = raw; trail = ''; }

        // Track quotes
        const quoteChars = (raw.match(/["'"']/g) || []).length;
        if (quoteChars % 2 !== 0) inQuote = !inQuote;

        // Detect sentence end
        const sentEnd = trail.length > 0 && /[.!?;]/.test(trail[trail.length - 1]);
        const hasComma = trail.includes(',') || trail.includes(':');
        const hasDash = trail.includes('—') || trail.includes('–') || trail.includes('-');
        const isParagraphBreak = paragraphBreaks.has(w);

        const oi = orpIndex(clean);

        const token = {
            before: clean.substring(0, oi),
            orp: clean.substring(oi, oi + 1),
            after: oi + 1 < clean.length ? clean.substring(oi + 1) : '',
            punct: trail,
            word: clean,
            raw: raw,
            sentence_end: sentEnd,
            sentence_idx: sentenceIdx,
            dur_ms: wordDur(clean, wpm, {
                sentenceEnd: sentEnd,
                hasComma: hasComma,
                hasDash: hasDash,
                paragraphBreak: isParagraphBreak,
                inQuote: inQuote
            })
        };

        tokens.push(token);

        // Advance sentence index on sentence end
        if (sentEnd) sentenceIdx++;
    }

    return tokens;
}

// ── Semantic Chunking ─────────────────────────────────────────────
// Groups small words (articles, prepositions) with their next word.
const CHUNK_WORDS = new Set([
    'the','a','an','in','on','at','to','by','of','for','with','from',
    'and','or','but','is','it','its','as','if','so','no','not','my',
    'his','her','our','your','this','that','was','were','has','had',
    'be','do','did'
]);

function applyChunking(tokens) {
    const chunked = [];
    let i = 0;
    while (i < tokens.length) {
        const t = tokens[i];
        if (i + 1 < tokens.length &&
            CHUNK_WORDS.has(t.word.toLowerCase()) &&
            t.word.length + tokens[i+1].word.length < 12 &&
            !t.sentence_end) {
            // Merge this word with next
            const next = tokens[i + 1];
            const combined = t.word + ' ' + next.word;
            const oi = orpIndex(combined);
            chunked.push({
                before: combined.substring(0, oi),
                orp: combined.substring(oi, oi + 1),
                after: oi + 1 < combined.length ? combined.substring(oi + 1) : '',
                punct: next.punct,
                word: combined,
                raw: t.raw + ' ' + next.raw,
                sentence_end: next.sentence_end,
                sentence_idx: t.sentence_idx,
                dur_ms: Math.round((t.dur_ms + next.dur_ms) * 0.75),
                _originalIndices: [i, i + 1]
            });
            i += 2;
        } else {
            chunked.push({ ...t, _originalIndices: [i] });
            i++;
        }
    }
    return chunked;
}

// ── Engine ────────────────────────────────────────────────────────
class RSVPEngine {
    constructor() {
        this.tokens = [];
        this._rawTokens = [];
        this.cur = 0;
        this.wpm = 300;
        this._state = 'idle';
        this._timer = null;
        this._chunkMode = false;
        this._speedMultiplier = 1.0;
        this._targetMultiplier = 1.0;
        this._multAnimFrame = null;

        // Analytics
        this._analytics = {
            startTime: 0,
            wordsRead: 0,
            seekBacks: 0,
            pauseCount: 0,
            actualDurations: [],
            lastTickTime: 0
        };

        // Callbacks
        this.onToken = null;
        this.onState = null;
        this.onDone = null;
    }

    load(text, wpm) {
        this.stop();
        this.wpm = wpm || 300;
        this._rawTokens = tokenise(text, this.wpm);
        this.tokens = this._chunkMode ? applyChunking(this._rawTokens) : this._rawTokens;
        this.cur = 0;
        this._state = 'idle';
        this._speedMultiplier = 1.0;
        this._analytics = {
            startTime: 0,
            wordsRead: 0,
            seekBacks: 0,
            pauseCount: 0,
            actualDurations: [],
            lastTickTime: 0
        };
    }

    play() {
        if (!this.tokens.length) return;
        if (this._state === 'playing') return;
        if (this._state === 'done') this.cur = 0;
        this._state = 'playing';
        if (!this._analytics.startTime) this._analytics.startTime = performance.now();
        this._emitState('playing');
        this._tick();
    }

    pause() {
        if (this._state !== 'playing') return;
        this._state = 'paused';
        clearTimeout(this._timer);
        this._timer = null;
        this._analytics.pauseCount++;
        this._emitState('paused');
    }

    toggle() {
        this._state === 'playing' ? this.pause() : this.play();
    }

    stop() {
        clearTimeout(this._timer);
        this._timer = null;
        this._state = 'idle';
        if (this._multAnimFrame) {
            cancelAnimationFrame(this._multAnimFrame);
            this._multAnimFrame = null;
        }
    }

    seek(delta) {
        if (!this.tokens.length) return;
        const oldCur = this.cur;
        this.cur = Math.max(0, Math.min(this.tokens.length - 1, this.cur + delta));

        if (delta < 0) this._analytics.seekBacks++;

        // If paused or idle, show preview
        if (this._state !== 'playing' && this.tokens.length > 0) {
            const t = this.tokens[this.cur];
            if (this.onToken) this.onToken(t, this.cur, this.tokens.length);
        }
    }

    setWpm(wpm) {
        this.wpm = Math.max(60, Math.min(1200, wpm));
        // Recompute remaining durations
        for (let i = this.cur; i < this.tokens.length; i++) {
            const t = this.tokens[i];
            // Re-tokenize duration
            const sentEnd = t.sentence_end;
            const hasComma = t.punct && (t.punct.includes(',') || t.punct.includes(':'));
            const hasDash = t.punct && (t.punct.includes('—') || t.punct.includes('–'));
            t.dur_ms = wordDur(t.word, this.wpm, {
                sentenceEnd: sentEnd,
                hasComma: hasComma,
                hasDash: hasDash,
                paragraphBreak: false,
                inQuote: false
            });
        }
    }

    getWpm() { return this.wpm; }
    getState() { return this._state; }
    getCur() { return this.cur; }
    getTotal() { return this.tokens.length; }
    getProgress() { return this.tokens.length ? this.cur / this.tokens.length : 0; }

    getToken(index) {
        if (index < 0 || index >= this.tokens.length) return null;
        return this.tokens[index];
    }

    getRawToken(index) {
        if (index < 0 || index >= this._rawTokens.length) return null;
        return this._rawTokens[index];
    }

    getRawTokens() { return this._rawTokens; }

    getSentenceIndices(index) {
        if (!this._rawTokens.length) return [0, 0];
        const t = index < this._rawTokens.length ? this._rawTokens[index] : this._rawTokens[this._rawTokens.length - 1];
        const sid = t.sentence_idx;
        let start = index, end = index;
        while (start > 0 && this._rawTokens[start - 1].sentence_idx === sid) start--;
        while (end < this._rawTokens.length - 1 && this._rawTokens[end + 1].sentence_idx === sid) end++;
        // Include current if it ends the sentence
        return [start, end];
    }

    getSentence(index) {
        const [s, e] = this.getSentenceIndices(index);
        return this._rawTokens.slice(s, e + 1);
    }

    setChunkMode(enabled) {
        const wasPlaying = this._state === 'playing';
        if (wasPlaying) this.pause();

        this._chunkMode = enabled;
        if (this._rawTokens.length) {
            const progress = this.getProgress();
            this.tokens = enabled ? applyChunking(this._rawTokens) : this._rawTokens;
            this.cur = Math.min(Math.round(progress * this.tokens.length), this.tokens.length - 1);
        }

        if (wasPlaying) this.play();
    }

    setSpeedMultiplier(mult) {
        this._speedMultiplier = Math.max(0.25, Math.min(4.0, mult));
    }

    getSpeedMultiplier() { return this._speedMultiplier; }

    resetSpeedMultiplier() {
        // Smoothly interpolate back to 1.0
        if (this._multAnimFrame) cancelAnimationFrame(this._multAnimFrame);

        const startMult = this._speedMultiplier;
        const startTime = performance.now();
        const duration = 300; // ms

        const animate = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - t, 3);
            this._speedMultiplier = startMult + (1.0 - startMult) * eased;

            if (t < 1) {
                this._multAnimFrame = requestAnimationFrame(animate);
            } else {
                this._speedMultiplier = 1.0;
                this._multAnimFrame = null;
            }
        };
        this._multAnimFrame = requestAnimationFrame(animate);
    }

    getAnalytics() {
        const elapsed = this._analytics.startTime
            ? (performance.now() - this._analytics.startTime) / 1000
            : 0;
        const wordsRead = this._analytics.wordsRead;
        const actualWpm = elapsed > 0 ? Math.round((wordsRead / elapsed) * 60) : 0;

        return {
            wpm_actual: actualWpm,
            wpm_target: this.wpm,
            duration_sec: Math.round(elapsed),
            words_read: wordsRead,
            total_words: this.tokens.length,
            seek_backs: this._analytics.seekBacks,
            pause_count: this._analytics.pauseCount,
            completion_pct: this.tokens.length ? Math.round((wordsRead / this.tokens.length) * 100) : 0
        };
    }

    // ── Private ───────────────────────────────────────────────────
    _tick() {
        if (this._state !== 'playing') return;
        if (this.cur >= this.tokens.length) {
            this._state = 'done';
            this._emitState('done');
            if (this.onDone) this.onDone();
            return;
        }

        const t = this.tokens[this.cur];
        const now = performance.now();

        // Track actual duration of previous word
        if (this._analytics.lastTickTime > 0 && this.cur > 0) {
            this._analytics.actualDurations.push(now - this._analytics.lastTickTime);
        }
        this._analytics.lastTickTime = now;

        if (this.onToken) this.onToken(t, this.cur, this.tokens.length);

        // Effective duration with speed multiplier
        const effectiveDur = Math.max(20, Math.round(t.dur_ms / this._speedMultiplier));

        this._timer = setTimeout(() => {
            this.cur++;
            this._analytics.wordsRead++;
            this._tick();
        }, effectiveDur);
    }

    _emitState(state) {
        if (this.onState) this.onState(state);
    }
}

// Export to global scope
window.RSVPEngine = RSVPEngine;

})();
