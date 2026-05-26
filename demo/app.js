/* ═══════════════════════════════════════════════════════════════════
   RSVP Reader — Application Controller
   Gestures, Import, Themes, Notes, Sound, Storage
   ═══════════════════════════════════════════════════════════════════ */

(function() {
'use strict';

// ── DOM Refs ──────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
    body: document.body,
    // Import
    importScreen:    $('import-screen'),
    textInput:       $('text-input'),
    startBtn:        $('start-btn'),
    wpmSlider:       $('wpm-slider'),
    wpmVal:          $('wpm-val'),
    modeTabs:        $('mode-tabs'),
    dropZone:        $('drop-zone'),
    fileInput:       $('file-input'),
    recentSection:   $('recent-section'),
    recentList:      $('recent-list'),
    // Reader
    readerScreen:    $('reader-screen'),
    wordContainer:   $('word-container'),
    wordDisplay:     $('word-display'),
    contextPrev:     $('context-prev'),
    contextNext:     $('context-next'),
    flowContainer:   $('flow-container'),
    flowSentence:    $('flow-sentence'),
    teleContainer:   $('teleprompter-container'),
    teleText:        $('teleprompter-text'),
    backBtn:         $('back-btn'),
    wpmBadge:        $('wpm-badge'),
    speedMult:       $('speed-multiplier'),
    progressBadge:   $('progress-badge'),
    stateBadge:      $('state-badge'),
    modeBadge:       $('mode-indicator'),
    gestureHint:     $('gesture-hint'),
    progressBar:     $('progress-bar'),
    notesToggle:     $('notes-toggle'),
    settingsToggle:  $('settings-toggle'),
    // Settings
    settingsOverlay: $('settings-overlay'),
    settingsDrawer:  $('settings-drawer'),
    themeOptions:    $('theme-options'),
    orpOptions:      $('orp-options'),
    focusOptions:    $('focus-options'),
    fontSelect:      $('font-select'),
    fontSize:        $('font-size'),
    fontSizeVal:     $('font-size-val'),
    fontWeight:      $('font-weight'),
    fontWeightVal:   $('font-weight-val'),
    letterSpacing:   $('letter-spacing'),
    letterSpacingVal:$('letter-spacing-val'),
    contextOpacity:  $('context-opacity'),
    contextOpacityVal:$('context-opacity-val'),
    soundOptions:    $('sound-options'),
    dyslexiaToggle:  $('dyslexia-toggle'),
    reduceMotion:    $('reduce-motion-toggle'),
    highContrast:    $('high-contrast-toggle'),
    // Notes
    notesPanel:      $('notes-panel'),
    notesList:       $('notes-list'),
    notesClose:      $('notes-close'),
    notesExport:     $('notes-export'),
    // Toast
    toast:           $('toast'),
};

const beforeSpan = dom.wordDisplay.querySelector('.before');
const orpSpan    = dom.wordDisplay.querySelector('.orp');
const afterSpan  = dom.wordDisplay.querySelector('.after');
const punctSpan  = dom.wordDisplay.querySelector('.punct');

// ── State ─────────────────────────────────────────────────────────
const engine = new window.RSVPEngine();
let currentWpm = 300;
let currentMode = 'rsvp';
let notes = [];
let soundMode = 'off';
let audioCtx = null;
let ambientNode = null;
let _toastTimer = null;
let _stateTimer = null;
let _hintTimer = null;
let _autoSaveInterval = null;
let _currentFlowSentence = -1;

// ── Toast ─────────────────────────────────────────────────────────
function showToast(msg, dur) {
    dur = dur || 2000;
    dom.toast.textContent = msg;
    dom.toast.classList.add('visible');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => dom.toast.classList.remove('visible'), dur);
}

// ── Gesture Hint ──────────────────────────────────────────────────
function flashHint(text) {
    dom.gestureHint.textContent = text;
    dom.gestureHint.classList.add('show');
    clearTimeout(_hintTimer);
    _hintTimer = setTimeout(() => dom.gestureHint.classList.remove('show'), 800);
}

// ── Screen Navigation ─────────────────────────────────────────────
function showReader() {
    const text = dom.textInput.value.trim();
    if (!text) { showToast('Paste some text first'); return; }

    currentWpm = parseInt(dom.wpmSlider.value) || 300;
    engine.load(text, currentWpm);
    dom.wpmBadge.textContent = currentWpm + ' WPM';
    dom.progressBadge.textContent = '0 / ' + engine.getTotal();
    dom.progressBar.style.width = '0%';

    // Clear previous word
    beforeSpan.textContent = '';
    orpSpan.textContent = '';
    afterSpan.textContent = '';
    punctSpan.textContent = '';
    dom.contextPrev.textContent = '';
    dom.contextNext.textContent = '';

    // Set mode
    updateModeDisplay();

    // Build teleprompter / flow text if needed
    if (currentMode === 'teleprompter') buildTeleprompter();
    if (currentMode === 'flow') _currentFlowSentence = -1;

    // Transition
    dom.importScreen.classList.add('hidden');
    dom.readerScreen.classList.remove('hidden');

    // Save to recent
    saveRecent(text);

    // Start auto-save
    _autoSaveInterval = setInterval(() => savePosition(), 10000);

    // Small delay then play
    setTimeout(() => engine.play(), 250);
}

function showImport() {
    engine.pause();
    clearInterval(_autoSaveInterval);
    dom.readerScreen.classList.add('hidden');
    dom.importScreen.classList.remove('hidden');
    dom.importScreen.style.animation = 'none';
    dom.importScreen.offsetHeight; // reflow
    dom.importScreen.style.animation = '';
    closeSettings();
    closeNotes();
}

// ── Mode Management ───────────────────────────────────────────────
function setMode(mode) {
    currentMode = mode;
    dom.body.setAttribute('data-mode', mode);
    dom.modeBadge.textContent = mode.toUpperCase();

    // Update tabs
    $$('.mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));

    updateModeDisplay();

    if (mode === 'teleprompter' && engine.getTotal() > 0) buildTeleprompter();
    if (mode === 'flow') _currentFlowSentence = -1;
}

function updateModeDisplay() {
    const isRsvp = currentMode === 'rsvp';
    const isFlow = currentMode === 'flow';
    const isTele = currentMode === 'teleprompter';

    dom.wordContainer.classList.toggle('hidden', !isRsvp);
    dom.flowContainer.classList.toggle('hidden', !isFlow);
    dom.teleContainer.classList.toggle('hidden', !isTele);
}

// ── Engine Callbacks ──────────────────────────────────────────────
engine.onToken = function(t, idx, total) {
    if (currentMode === 'rsvp') {
        updateRSVPDisplay(t, idx, total);
    } else if (currentMode === 'flow') {
        updateFlowDisplay(t, idx, total);
    } else if (currentMode === 'teleprompter') {
        updateTeleprompterDisplay(t, idx, total);
    }

    // Common updates
    dom.progressBadge.textContent = (idx + 1) + ' / ' + total;
    dom.progressBar.style.width = ((idx + 1) / total * 100) + '%';

    // Sound
    playTickSound(t);
};

engine.onState = function(state) {
    dom.stateBadge.textContent = state.toUpperCase();
    dom.stateBadge.classList.add('visible');
    clearTimeout(_stateTimer);
    const dur = state === 'done' ? 5000 : state === 'paused' ? 2000 : 900;
    _stateTimer = setTimeout(() => dom.stateBadge.classList.remove('visible'), dur);
};

engine.onDone = function() {
    const a = engine.getAnalytics();
    showToast('Done! ' + a.words_read + ' words in ' + a.duration_sec + 's · ' + a.wpm_actual + ' WPM actual');
};

// ── RSVP Display ──────────────────────────────────────────────────
function updateRSVPDisplay(t, idx, total) {
    // Word transition animation
    if (!dom.body.classList.contains('reduced-motion')) {
        dom.wordDisplay.classList.add('word-enter');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                dom.wordDisplay.classList.remove('word-enter');
            });
        });
    }

    beforeSpan.textContent = t.before;
    orpSpan.textContent = t.orp;
    afterSpan.textContent = t.after;
    punctSpan.textContent = t.punct;

    // Context words (guided mode)
    if (idx > 0) {
        const prev = engine.getToken(idx - 1);
        dom.contextPrev.textContent = prev ? prev.word + (prev.punct || '') : '';
    } else {
        dom.contextPrev.textContent = '';
    }
    if (idx < total - 1) {
        const next = engine.getToken(idx + 1);
        dom.contextNext.textContent = next ? next.word + (next.punct || '') : '';
    } else {
        dom.contextNext.textContent = '';
    }
}

// ── Flow Display ──────────────────────────────────────────────────
function updateFlowDisplay(t, idx, total) {
    // Map chunked index to raw index for sentence lookup
    const rawTokens = engine.getRawTokens();
    const rawIdx = t._originalIndices ? t._originalIndices[0] : idx;
    const [sStart, sEnd] = engine.getSentenceIndices(rawIdx);
    const sentIdx = rawTokens[rawIdx] ? rawTokens[rawIdx].sentence_idx : 0;

    // Rebuild sentence HTML if sentence changed
    if (sentIdx !== _currentFlowSentence) {
        _currentFlowSentence = sentIdx;
        let html = '';
        for (let i = sStart; i <= sEnd; i++) {
            const wt = rawTokens[i];
            if (!wt) continue;
            html += '<span class="flow-word" data-idx="' + i + '">';
            html += wt.before;
            html += '<span class="flow-orp">' + escHtml(wt.orp) + '</span>';
            html += escHtml(wt.after);
            html += escHtml(wt.punct);
            html += '</span> ';
        }
        dom.flowSentence.innerHTML = html;

        // Fade in
        if (!dom.body.classList.contains('reduced-motion')) {
            dom.flowSentence.style.opacity = '0';
            requestAnimationFrame(() => { dom.flowSentence.style.opacity = '1'; });
        }
    }

    // Highlight current word
    dom.flowSentence.querySelectorAll('.flow-word').forEach(el => {
        const wi = parseInt(el.dataset.idx);
        el.classList.toggle('current', wi === rawIdx);
        el.classList.toggle('past', wi < rawIdx);
        el.classList.toggle('future', wi > rawIdx);
    });
}

// ── Teleprompter Display ──────────────────────────────────────────
function buildTeleprompter() {
    const rawTokens = engine.getRawTokens();
    let html = '';
    for (let i = 0; i < rawTokens.length; i++) {
        const t = rawTokens[i];
        html += '<span class="tp-word" data-idx="' + i + '">';
        html += escHtml(t.word) + escHtml(t.punct);
        html += '</span> ';
        if (t.sentence_end) html += ' ';
    }
    dom.teleText.innerHTML = html;
}

function updateTeleprompterDisplay(t, idx, total) {
    const rawIdx = t._originalIndices ? t._originalIndices[0] : idx;

    // Update word classes
    dom.teleText.querySelectorAll('.tp-word').forEach(el => {
        const wi = parseInt(el.dataset.idx);
        el.classList.toggle('active', wi === rawIdx);
        el.classList.toggle('past', wi < rawIdx);
    });

    // Scroll to active word
    const activeEl = dom.teleText.querySelector('.tp-word.active');
    if (activeEl) {
        const container = dom.teleContainer;
        const targetScroll = activeEl.offsetTop - container.clientHeight * 0.35;
        container.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
}

// ── Gesture System ────────────────────────────────────────────────
(function initGestures() {
    const el = dom.readerScreen;
    let startX = 0, startY = 0, startTime = 0;
    let isDragging = false, dragAxis = null;
    let tapCount = 0, tapTimer = null;
    let longPressTimer = null;
    let lastVelocityX = 0, lastVelocityY = 0;
    let lastMoveX = 0, lastMoveY = 0, lastMoveTime = 0;
    let momentumFrame = null;

    // Pinch state
    let pinchStartDist = 0;
    let pinchStartSize = 42;
    let isPinching = false;
    let activePointers = new Map();

    el.addEventListener('pointerdown', onDown, { passive: false });
    el.addEventListener('pointermove', onMove, { passive: false });
    el.addEventListener('pointerup', onUp, { passive: false });
    el.addEventListener('pointercancel', onUp, { passive: false });

    function onDown(e) {
        // Ignore buttons
        if (e.target.closest('.reader-btn, .panel-btn, .reader-top-bar button')) return;

        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        el.setPointerCapture(e.pointerId);

        // Pinch detection
        if (activePointers.size === 2) {
            const pts = Array.from(activePointers.values());
            pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            pinchStartSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--reader-font-size')) || 42;
            isPinching = true;
            clearTimeout(longPressTimer);
            return;
        }

        if (activePointers.size > 2) return;

        startX = e.clientX;
        startY = e.clientY;
        startTime = Date.now();
        isDragging = false;
        dragAxis = null;
        lastMoveX = e.clientX;
        lastMoveY = e.clientY;
        lastMoveTime = Date.now();
        lastVelocityX = 0;
        lastVelocityY = 0;

        if (momentumFrame) { cancelAnimationFrame(momentumFrame); momentumFrame = null; }

        // Long press
        longPressTimer = setTimeout(() => {
            if (!isDragging) {
                showImport();
                longPressTimer = null;
            }
        }, 600);
    }

    function onMove(e) {
        if (!activePointers.has(e.pointerId)) return;
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // Pinch
        if (isPinching && activePointers.size >= 2) {
            const pts = Array.from(activePointers.values());
            const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            const scale = dist / pinchStartDist;
            const newSize = Math.max(20, Math.min(80, Math.round(pinchStartSize * scale)));
            document.documentElement.style.setProperty('--reader-font-size', newSize + 'px');
            dom.fontSize.value = newSize;
            dom.fontSizeVal.textContent = newSize + 'px';
            return;
        }

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const dist = Math.hypot(dx, dy);

        // Track velocity
        const now = Date.now();
        const dt = now - lastMoveTime;
        if (dt > 0) {
            lastVelocityX = (e.clientX - lastMoveX) / dt;
            lastVelocityY = (e.clientY - lastMoveY) / dt;
        }
        lastMoveX = e.clientX;
        lastMoveY = e.clientY;
        lastMoveTime = now;

        if (dist > 15 && !isDragging) {
            isDragging = true;
            clearTimeout(longPressTimer);
            // Determine axis
            dragAxis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        }

        if (!isDragging) return;

        if (dragAxis === 'horizontal') {
            // Timeline scrub: map dx to word seek
            const wordsPerPixel = engine.getTotal() / el.clientWidth;
            const seekDelta = Math.round(dx * wordsPerPixel * 0.3);
            if (Math.abs(seekDelta) >= 1) {
                engine.seek(seekDelta - (engine.getCur() - Math.round(engine.getProgress() * engine.getTotal())));
                flashHint((seekDelta >= 0 ? '→ +' : '← ') + Math.abs(seekDelta));
            }
        } else if (dragAxis === 'vertical') {
            // Speed modulation: map dy to multiplier
            // Up = faster (negative dy = positive mult), Down = slower
            const mult = 1.0 + (-dy / 200);
            const clamped = Math.max(0.25, Math.min(4.0, mult));
            engine.setSpeedMultiplier(clamped);
            dom.speedMult.textContent = '×' + clamped.toFixed(1);
            dom.speedMult.classList.add('visible');
            flashHint('×' + clamped.toFixed(1));
        }
    }

    function onUp(e) {
        activePointers.delete(e.pointerId);
        clearTimeout(longPressTimer);

        // End pinch
        if (isPinching && activePointers.size < 2) {
            isPinching = false;
            savePref('fontSize', dom.fontSize.value);
            return;
        }

        if (activePointers.size > 0) return;

        const elapsed = Date.now() - startTime;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const dist = Math.hypot(dx, dy);

        if (isDragging) {
            if (dragAxis === 'vertical') {
                // Spring back speed multiplier
                engine.resetSpeedMultiplier();
                setTimeout(() => dom.speedMult.classList.remove('visible'), 400);
            } else if (dragAxis === 'horizontal') {
                // Momentum
                applyMomentum(lastVelocityX);
            }
            isDragging = false;
            return;
        }

        // Check for diagonal swipe (note capture) — even short ones
        if (dist > 30 && dx > 20 && dy > 20) {
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            if (angle > 20 && angle < 70) {
                captureNote();
                return;
            }
        }

        // Two-finger tap → settings (handled via tap count with 2 pointers)
        // Single tap handling with multi-tap detection
        if (elapsed < 250 && dist < 12) {
            tapCount++;
            clearTimeout(tapTimer);
            tapTimer = setTimeout(() => {
                if (tapCount === 1) {
                    engine.toggle();
                } else if (tapCount === 2) {
                    const chunked = !engine._chunkMode;
                    engine.setChunkMode(chunked);
                    flashHint(chunked ? 'Phrase Mode ON' : 'Word Mode');
                    showToast(chunked ? 'Phrase mode enabled' : 'Word-by-word mode');
                } else if (tapCount >= 3) {
                    cycleFocusMode();
                }
                tapCount = 0;
            }, 350);
        }
    }

    function applyMomentum(vel) {
        if (Math.abs(vel) < 0.05) return;
        const friction = 0.92;
        let v = vel * 80; // scale up

        function frame() {
            v *= friction;
            if (Math.abs(v) < 0.5) { momentumFrame = null; return; }
            const delta = Math.round(v * 0.05);
            if (delta !== 0) engine.seek(delta);
            momentumFrame = requestAnimationFrame(frame);
        }
        momentumFrame = requestAnimationFrame(frame);
    }
})();

// ── Keyboard Shortcuts ────────────────────────────────────────────
document.addEventListener('keydown', function(e) {
    const onReader = !dom.readerScreen.classList.contains('hidden');
    const onImport = !dom.importScreen.classList.contains('hidden');

    // Import screen shortcuts
    if (onImport) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            showReader();
        }
        return;
    }

    if (!onReader) return;

    // Don't intercept if settings/notes has focus
    if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.type !== 'range') return;
    if (document.activeElement && document.activeElement.tagName === 'SELECT') return;

    switch (e.key) {
        case ' ':
            e.preventDefault();
            engine.toggle();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            engine.seek(-8);
            flashHint('← −8');
            break;
        case 'ArrowRight':
            e.preventDefault();
            engine.seek(8);
            flashHint('→ +8');
            break;
        case 'ArrowUp':
            e.preventDefault();
            currentWpm = Math.min(1200, currentWpm + 25);
            engine.setWpm(currentWpm);
            dom.wpmBadge.textContent = currentWpm + ' WPM';
            dom.wpmSlider.value = currentWpm;
            dom.wpmVal.textContent = currentWpm;
            flashHint('↑ ' + currentWpm + ' WPM');
            break;
        case 'ArrowDown':
            e.preventDefault();
            currentWpm = Math.max(60, currentWpm - 25);
            engine.setWpm(currentWpm);
            dom.wpmBadge.textContent = currentWpm + ' WPM';
            dom.wpmSlider.value = currentWpm;
            dom.wpmVal.textContent = currentWpm;
            flashHint('↓ ' + currentWpm + ' WPM');
            break;
        case 'Escape':
            if (!dom.settingsDrawer.classList.contains('hidden')) closeSettings();
            else if (!dom.notesPanel.classList.contains('hidden')) closeNotes();
            else showImport();
            break;
        case '1':
            setMode('rsvp');
            flashHint('RSVP');
            break;
        case '2':
            setMode('flow');
            flashHint('FLOW');
            break;
        case '3':
            setMode('teleprompter');
            flashHint('TELEPROMPTER');
            break;
        case 'f': case 'F':
            toggleFullscreen();
            break;
        case 'm': case 'M':
            cycleFocusMode();
            break;
        case 'n': case 'N':
            toggleNotes();
            break;
        case 's': case 'S':
            if (!e.ctrlKey && !e.metaKey) toggleSettings();
            break;
    }
});

// ── Focus Mode Cycling ────────────────────────────────────────────
function cycleFocusMode() {
    const modes = ['zen', 'guided', 'sentence'];
    const current = dom.body.getAttribute('data-focus') || 'guided';
    const idx = modes.indexOf(current);
    const next = modes[(idx + 1) % modes.length];
    setFocusMode(next);
    flashHint(next.charAt(0).toUpperCase() + next.slice(1) + ' Mode');
}

function setFocusMode(mode) {
    dom.body.setAttribute('data-focus', mode);
    $$('#focus-options .pill').forEach(b => b.classList.toggle('active', b.dataset.focus === mode));
    savePref('focus', mode);
}

// ── Fullscreen ────────────────────────────────────────────────────
function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    } else {
        document.documentElement.requestFullscreen().catch(() => {});
    }
}

// ── Settings Drawer ───────────────────────────────────────────────
function toggleSettings() {
    dom.settingsDrawer.classList.contains('hidden') ? openSettings() : closeSettings();
}

function openSettings() {
    dom.settingsOverlay.classList.remove('hidden');
    dom.settingsDrawer.classList.remove('hidden');
}

function closeSettings() {
    dom.settingsOverlay.classList.add('hidden');
    dom.settingsDrawer.classList.add('hidden');
}

// ── Notes Panel ───────────────────────────────────────────────────
function toggleNotes() {
    dom.notesPanel.classList.contains('hidden') ? openNotes() : closeNotes();
}
function openNotes() { dom.notesPanel.classList.remove('hidden'); renderNotes(); }
function closeNotes() { dom.notesPanel.classList.add('hidden'); }

function captureNote() {
    const idx = engine.getCur();
    const t = engine.getToken(idx);
    if (!t) return;

    // Get surrounding context
    const total = engine.getTotal();
    const contextStart = Math.max(0, idx - 5);
    const contextEnd = Math.min(total - 1, idx + 5);
    let contextWords = [];
    for (let i = contextStart; i <= contextEnd; i++) {
        const ct = engine.getToken(i);
        if (ct) contextWords.push({ word: ct.word + (ct.punct || ''), isTarget: i === idx });
    }

    const note = {
        id: Date.now(),
        wordIdx: idx,
        word: t.word,
        context: contextWords,
        timestamp: new Date().toISOString()
    };

    notes.push(note);
    showToast('📌 Note captured');
    renderNotes();
    saveNotes();
}

function renderNotes() {
    if (!notes.length) {
        dom.notesList.innerHTML = '<div class="notes-empty">No notes yet. Swipe ↘ during reading to capture a thought.</div>';
        return;
    }

    dom.notesList.innerHTML = notes.map(n => {
        const ctx = n.context.map(c =>
            c.isTarget ? '<span class="note-highlight">' + escHtml(c.word) + '</span>' : escHtml(c.word)
        ).join(' ');
        const ago = timeAgo(new Date(n.timestamp));
        return '<div class="note-card" data-word-idx="' + n.wordIdx + '">' +
            '<div class="note-context">' + ctx + '</div>' +
            '<div class="note-meta">' +
            '<span class="note-time">' + ago + '</span>' +
            '<button class="note-delete" data-id="' + n.id + '">✕</button>' +
            '</div></div>';
    }).join('');

    // Click to seek
    dom.notesList.querySelectorAll('.note-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.classList.contains('note-delete')) return;
            const idx = parseInt(this.dataset.wordIdx);
            engine.seek(idx - engine.getCur());
            closeNotes();
        });
    });

    // Delete
    dom.notesList.querySelectorAll('.note-delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            notes = notes.filter(n => n.id !== id);
            renderNotes();
            saveNotes();
        });
    });
}

function exportNotes() {
    if (!notes.length) { showToast('No notes to export'); return; }
    let text = 'RSVP Reader — Notes\n' + '='.repeat(40) + '\n\n';
    notes.forEach((n, i) => {
        const ctx = n.context.map(c => c.isTarget ? '[' + c.word + ']' : c.word).join(' ');
        text += (i + 1) + '. ' + ctx + '\n   Word: ' + n.word + ' (position ' + n.wordIdx + ')\n   ' + new Date(n.timestamp).toLocaleString() + '\n\n';
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rsvp-notes.txt';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Notes exported');
}

// ── Sound System ──────────────────────────────────────────────────
function initAudio() {
    if (audioCtx) return;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { /* no audio support */ }
}

function playTickSound(token) {
    if (soundMode === 'off' || !audioCtx) return;
    if (soundMode !== 'tick') return;

    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (token.sentence_end) {
            osc.frequency.value = 400;
            gain.gain.value = 0.04;
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.008);
        } else {
            osc.frequency.value = 800;
            gain.gain.value = 0.02;
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.003);
        }

        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.015);
    } catch(e) { /* ignore audio errors */ }
}

function startAmbient() {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;
    stopAmbient();

    try {
        const bufferSize = audioCtx.sampleRate * 2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;

        ambientNode = audioCtx.createBufferSource();
        ambientNode.buffer = buffer;
        ambientNode.loop = true;

        const gain = audioCtx.createGain();
        gain.gain.value = 0.008;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        ambientNode.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        ambientNode.start();
    } catch(e) { /* ignore */ }
}

function stopAmbient() {
    if (ambientNode) {
        try { ambientNode.stop(); } catch(e) {}
        ambientNode = null;
    }
}

function setSoundMode(mode) {
    soundMode = mode;
    $$('#sound-options .pill').forEach(b => b.classList.toggle('active', b.dataset.sound === mode));
    savePref('sound', mode);

    if (mode === 'ambient') {
        initAudio();
        startAmbient();
    } else {
        stopAmbient();
        if (mode === 'tick') initAudio();
    }
}

// ── Import: File Handling ─────────────────────────────────────────
function handleFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'txt') {
        const reader = new FileReader();
        reader.onload = (e) => {
            dom.textInput.value = e.target.result;
            showToast('Loaded: ' + file.name);
        };
        reader.readAsText(file);
    } else if (ext === 'pdf') {
        loadPDF(file);
    } else if (ext === 'epub' || ext === 'docx') {
        showToast(ext.toUpperCase() + ' support coming soon');
    } else {
        showToast('Unsupported file type');
    }
}

async function loadPDF(file) {
    showToast('Loading PDF...');
    try {
        // Lazy load pdf.js
        if (!window.pdfjsLib) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
            script.type = 'module';

            // Use dynamic import instead
            const pdfjsModule = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
            window.pdfjsLib = pdfjsModule;
            pdfjsModule.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + '\n\n';
        }

        dom.textInput.value = text.trim();
        showToast('PDF loaded: ' + pdf.numPages + ' pages');
    } catch(e) {
        console.error('PDF load error:', e);
        showToast('Failed to load PDF. Try pasting text directly.');
    }
}

// ── File Drop Zone ────────────────────────────────────────────────
dom.dropZone.addEventListener('click', () => dom.fileInput.click());
dom.fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
});

dom.dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dom.dropZone.classList.add('drag-over');
});
dom.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.dropZone.classList.add('drag-over');
});
dom.dropZone.addEventListener('dragleave', () => {
    dom.dropZone.classList.remove('drag-over');
});
dom.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dom.dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

// ── Theme Manager ─────────────────────────────────────────────────
dom.themeOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme]');
    if (!btn) return;
    const theme = btn.dataset.theme;
    dom.body.setAttribute('data-theme', theme);
    $$('#theme-options .pill').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
    savePref('theme', theme);
});

dom.orpOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-orp]');
    if (!btn) return;
    const orp = btn.dataset.orp;
    dom.body.setAttribute('data-orp', orp);
    $$('#orp-options .swatch').forEach(b => b.classList.toggle('active', b.dataset.orp === orp));
    savePref('orp', orp);
});

dom.focusOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-focus]');
    if (!btn) return;
    setFocusMode(btn.dataset.focus);
});

dom.soundOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sound]');
    if (!btn) return;
    setSoundMode(btn.dataset.sound);
});

// ── Typography Controls ───────────────────────────────────────────
dom.fontSelect.addEventListener('change', function() {
    document.documentElement.style.setProperty('--reader-font', this.value);
    savePref('font', this.value);
});

dom.fontSize.addEventListener('input', function() {
    document.documentElement.style.setProperty('--reader-font-size', this.value + 'px');
    dom.fontSizeVal.textContent = this.value + 'px';
    savePref('fontSize', this.value);
});

dom.fontWeight.addEventListener('input', function() {
    document.documentElement.style.setProperty('--reader-font-weight', this.value);
    dom.fontWeightVal.textContent = this.value;
    savePref('fontWeight', this.value);
});

dom.letterSpacing.addEventListener('input', function() {
    document.documentElement.style.setProperty('--reader-letter-spacing', this.value + 'px');
    dom.letterSpacingVal.textContent = this.value + 'px';
    savePref('letterSpacing', this.value);
});

dom.contextOpacity.addEventListener('input', function() {
    const val = (this.value / 100).toFixed(2);
    document.documentElement.style.setProperty('--context-opacity', val);
    dom.contextOpacityVal.textContent = val;
    savePref('contextOpacity', this.value);
});

// ── Accessibility Toggles ─────────────────────────────────────────
dom.dyslexiaToggle.addEventListener('change', function() {
    if (this.checked) {
        document.documentElement.style.setProperty('--reader-font', "'OpenDyslexic', sans-serif");
        document.documentElement.style.setProperty('--reader-letter-spacing', '2px');
        dom.fontSelect.value = "'OpenDyslexic', sans-serif";
    } else {
        document.documentElement.style.setProperty('--reader-font', "'EB Garamond', serif");
        document.documentElement.style.setProperty('--reader-letter-spacing', '0px');
        dom.fontSelect.value = "'EB Garamond', serif";
    }
    savePref('dyslexia', this.checked);
});

dom.reduceMotion.addEventListener('change', function() {
    dom.body.classList.toggle('reduced-motion', this.checked);
    savePref('reduceMotion', this.checked);
});

dom.highContrast.addEventListener('change', function() {
    dom.body.classList.toggle('high-contrast', this.checked);
    savePref('highContrast', this.checked);
});

// ── Button Bindings ───────────────────────────────────────────────
dom.startBtn.addEventListener('click', showReader);
dom.backBtn.addEventListener('click', showImport);
dom.settingsToggle.addEventListener('click', toggleSettings);
dom.settingsOverlay.addEventListener('click', closeSettings);
dom.notesToggle.addEventListener('click', toggleNotes);
dom.notesClose.addEventListener('click', closeNotes);
dom.notesExport.addEventListener('click', exportNotes);

dom.wpmSlider.addEventListener('input', function() {
    dom.wpmVal.textContent = this.value;
});

// Mode tabs on import screen
dom.modeTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.mode-tab');
    if (!tab) return;
    setMode(tab.dataset.mode);
});

// ── Storage (localStorage) ────────────────────────────────────────
function savePref(key, value) {
    try { localStorage.setItem('rsvp_' + key, JSON.stringify(value)); } catch(e) {}
}

function loadPref(key, fallback) {
    try {
        const v = localStorage.getItem('rsvp_' + key);
        return v !== null ? JSON.parse(v) : fallback;
    } catch(e) { return fallback; }
}

function saveRecent(text) {
    try {
        let recent = JSON.parse(localStorage.getItem('rsvp_recent') || '[]');
        const title = text.substring(0, 50).replace(/\s+/g, ' ').trim();
        const preview = text.substring(0, 150).replace(/\s+/g, ' ').trim();

        // Don't duplicate
        recent = recent.filter(r => r.title !== title);
        recent.unshift({ title, preview, timestamp: Date.now(), wpm: currentWpm });
        if (recent.length > 10) recent = recent.slice(0, 10);
        localStorage.setItem('rsvp_recent', JSON.stringify(recent));
        // Also save full text keyed by title
        localStorage.setItem('rsvp_text_' + title, text);
        loadRecentList();
    } catch(e) {}
}

function savePosition() {
    try {
        savePref('lastPosition', engine.getCur());
        savePref('lastWpm', currentWpm);
    } catch(e) {}
}

function saveNotes() {
    try { localStorage.setItem('rsvp_notes', JSON.stringify(notes)); } catch(e) {}
}

function loadRecentList() {
    try {
        const recent = JSON.parse(localStorage.getItem('rsvp_recent') || '[]');
        if (!recent.length) {
            dom.recentSection.classList.add('hidden');
            return;
        }
        dom.recentSection.classList.remove('hidden');
        dom.recentList.innerHTML = recent.map(r => {
            return '<div class="recent-item" data-title="' + escAttr(r.title) + '">' +
                '<span class="recent-item-text">' + escHtml(r.preview) + '</span>' +
                '<span class="recent-item-time">' + timeAgo(new Date(r.timestamp)) + '</span>' +
                '</div>';
        }).join('');

        dom.recentList.querySelectorAll('.recent-item').forEach(item => {
            item.addEventListener('click', function() {
                const title = this.dataset.title;
                const text = localStorage.getItem('rsvp_text_' + title);
                if (text) {
                    dom.textInput.value = text;
                    showReader();
                }
            });
        });
    } catch(e) {}
}

// ── Restore Preferences ──────────────────────────────────────────
function restorePreferences() {
    const theme = loadPref('theme', 'dark');
    dom.body.setAttribute('data-theme', theme);
    $$('#theme-options .pill').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));

    const orp = loadPref('orp', 'red');
    dom.body.setAttribute('data-orp', orp);
    $$('#orp-options .swatch').forEach(b => b.classList.toggle('active', b.dataset.orp === orp));

    const focus = loadPref('focus', 'guided');
    dom.body.setAttribute('data-focus', focus);
    $$('#focus-options .pill').forEach(b => b.classList.toggle('active', b.dataset.focus === focus));

    const font = loadPref('font', "'EB Garamond', serif");
    document.documentElement.style.setProperty('--reader-font', font);
    dom.fontSelect.value = font;

    const fSize = loadPref('fontSize', '42');
    document.documentElement.style.setProperty('--reader-font-size', fSize + 'px');
    dom.fontSize.value = fSize;
    dom.fontSizeVal.textContent = fSize + 'px';

    const fWeight = loadPref('fontWeight', '400');
    document.documentElement.style.setProperty('--reader-font-weight', fWeight);
    dom.fontWeight.value = fWeight;
    dom.fontWeightVal.textContent = fWeight;

    const fSpacing = loadPref('letterSpacing', '0');
    document.documentElement.style.setProperty('--reader-letter-spacing', fSpacing + 'px');
    dom.letterSpacing.value = fSpacing;
    dom.letterSpacingVal.textContent = fSpacing + 'px';

    const cOpacity = loadPref('contextOpacity', '20');
    document.documentElement.style.setProperty('--context-opacity', (cOpacity / 100).toFixed(2));
    dom.contextOpacity.value = cOpacity;
    dom.contextOpacityVal.textContent = (cOpacity / 100).toFixed(2);

    const wpm = loadPref('lastWpm', 300);
    currentWpm = wpm;
    dom.wpmSlider.value = wpm;
    dom.wpmVal.textContent = wpm;

    const sound = loadPref('sound', 'off');
    setSoundMode(sound);

    const dyslexia = loadPref('dyslexia', false);
    dom.dyslexiaToggle.checked = dyslexia;
    if (dyslexia) dom.dyslexiaToggle.dispatchEvent(new Event('change'));

    const rm = loadPref('reduceMotion', false);
    dom.reduceMotion.checked = rm;
    if (rm) dom.body.classList.add('reduced-motion');

    const hc = loadPref('highContrast', false);
    dom.highContrast.checked = hc;
    if (hc) dom.body.classList.add('high-contrast');

    // Load notes
    try { notes = JSON.parse(localStorage.getItem('rsvp_notes') || '[]'); } catch(e) { notes = []; }

    // Load recent list
    loadRecentList();
}

// ── Utilities ─────────────────────────────────────────────────────
function escHtml(s) {
    if (!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
    return escHtml(s).replace(/'/g, '&#39;');
}

function timeAgo(date) {
    const sec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (sec < 60) return 'just now';
    if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
    if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
    return Math.floor(sec / 86400) + 'd ago';
}

// ── System Preferences ────────────────────────────────────────────
function detectSystemPrefs() {
    // Reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        dom.body.classList.add('reduced-motion');
        dom.reduceMotion.checked = true;
    }

    // Prefers color scheme
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        const theme = loadPref('theme', null);
        if (!theme) {
            dom.body.setAttribute('data-theme', 'paper');
            $$('#theme-options .pill').forEach(b => b.classList.toggle('active', b.dataset.theme === 'paper'));
        }
    }
}

// ── Init ──────────────────────────────────────────────────────────
function init() {
    detectSystemPrefs();
    restorePreferences();

    // Focus textarea on load
    setTimeout(() => dom.textInput.focus(), 100);
}

// Wait for DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

})();
