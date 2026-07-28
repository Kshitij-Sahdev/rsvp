'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import RSVPDisplay from './RSVPDisplay';
import FlowDisplay from './FlowDisplay';
import TeleprompterDisplay from './TeleprompterDisplay';
import ProgressBar from './ProgressBar';
import WpmBadge from './WpmBadge';
import GestureHint, { flashHint } from './GestureHint';
import { showToast } from './Toast';
import useGestures from '@/hooks/useGestures';
import { GESTURES, FOCUS_MODES, READING_MODES, WPM_RANGE } from '@/lib/constants';

export default function ReaderScreen({
  engine,
  wpm,
  setWpm,
  mode,
  setMode,
  token,
  setToken,
  index,
  setIndex,
  total,
  setTotal,
  state,
  setState,
  prefs,
  setPref,
  notes,
  addNote,
  deleteNote,
  exportNotes,
  activeTab,
  setActiveTab,
  zenMode,
  setZenMode,
}) {
  const [multiplier, setMultiplier] = useState(1.0);
  const [stateVisible, setStateVisible] = useState(false);
  const [wpmInput, setWpmInput] = useState(String(wpm));

  const readerRef = useRef(null);
  const stateTimerRef = useRef(null);
  const teleBuilderRef = useRef(null);

  // Sync wpmInput with wpm
  useEffect(() => {
    setWpmInput(String(wpm));
  }, [wpm]);

  // Set up engine callbacks
  useEffect(() => {
    if (!engine) return;

    engine.onToken = (t, idx, tot) => {
      setToken(t);
      setIndex(idx);
      setTotal(tot);
    };

    engine.onState = (s) => {
      setState(s);
      setStateVisible(true);
      clearTimeout(stateTimerRef.current);
      const dur = s === 'done' ? 5000 : s === 'paused' ? 2000 : 900;
      stateTimerRef.current = setTimeout(() => setStateVisible(false), dur);
    };

    engine.onDone = () => {
      const a = engine.getAnalytics();
      showToast(`Done! ${a.wordsRead} words in ${a.elapsedSec}s · ${a.effectiveWpm} WPM`);
    };

    return () => {
      engine.onToken = null;
      engine.onState = null;
      engine.onDone = null;
      clearTimeout(stateTimerRef.current);
    };
  }, [engine, setToken, setIndex, setTotal, setState]);

  // Re-build teleprompter when mode switches
  useEffect(() => {
    if (mode === 'teleprompter' && teleBuilderRef.current) {
      teleBuilderRef.current();
    }
  }, [mode]);

  // Capture note
  const captureNote = useCallback(() => {
    if (!engine) return;
    const idx = engine.getCur();
    const t = engine.getToken(idx);
    if (!t) return;

    const tot = engine.getTotal();
    const ctxStart = Math.max(0, idx - 5);
    const ctxEnd = Math.min(tot - 1, idx + 5);
    const contextWords = [];
    for (let i = ctxStart; i <= ctxEnd; i++) {
      const ct = engine.getToken(i);
      if (ct) contextWords.push({ word: ct.word + (ct.punct || ''), isTarget: i === idx });
    }

    addNote({
      id: Date.now(),
      wordIdx: idx,
      word: t.word,
      context: contextWords,
      timestamp: new Date().toISOString(),
    });
    showToast('📌 Note captured');
  }, [engine, addNote]);

  // Focus mode cycle
  const cycleFocusMode = useCallback(() => {
    const current = prefs?.focus || 'guided';
    const idx = FOCUS_MODES.indexOf(current);
    const next = FOCUS_MODES[(idx + 1) % FOCUS_MODES.length];
    setPref('focus', next);
    flashHint(next.charAt(0).toUpperCase() + next.slice(1) + ' Mode');
  }, [prefs?.focus, setPref]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  // Update speed safely
  const updateWpm = useCallback((val) => {
    const numeric = Math.max(60, Math.min(1200, Math.round(Number(val))));
    setWpm(numeric);
    if (engine) engine.setWpm(numeric);
    if (setPref) setPref('wpm', numeric);
  }, [engine, setWpm, setPref]);

  const handleWpmInputChange = (e) => {
    setWpmInput(e.target.value);
  };

  const handleWpmInputBlur = () => {
    updateWpm(wpmInput);
  };

  const handleWpmInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      updateWpm(wpmInput);
      e.target.blur();
    }
  };

  // Progress scrubbing slider handler
  const handleScrubChange = (e) => {
    if (!engine) return;
    const targetIdx = Number(e.target.value);
    const delta = targetIdx - engine.getCur();
    engine.seek(delta);
  };

  // Gesture bindings matching hooks/useGestures.js callbacks
  const gestureHandlers = {
    onTap: () => { if (engine) engine.toggle(); },
    onDoubleTap: () => {
      if (engine) {
        const chunked = !engine._chunkMode;
        engine.setChunkMode(chunked);
        flashHint(chunked ? 'Phrase Mode ON' : 'Word Mode');
        showToast(chunked ? 'Phrase mode enabled' : 'Word-by-word mode');
      }
    },
    onTripleTap: cycleFocusMode,
    onLongPress: () => {
      if (engine) {
        engine.seek(-engine.getCur()); // Restart text
        flashHint('↩ Restarted');
        showToast('Restarted text');
      }
    },
    onHorizontalDrag: (dx) => {
      if (!engine) return;
      const width = readerRef.current?.clientWidth || 800;
      const wordsPerPixel = engine.getTotal() / width;
      const seekDelta = Math.round(dx * wordsPerPixel * 0.3);
      if (Math.abs(seekDelta) >= 1) {
        engine.seek(seekDelta);
        flashHint((seekDelta >= 0 ? '→ +' : '← ') + Math.abs(seekDelta));
      }
    },
    onVerticalDrag: (dy) => {
      if (!engine) return;
      const mult = 1.0 + (-dy / 200);
      const clamped = Math.max(0.25, Math.min(4.0, mult));
      engine.setSpeedMultiplier(clamped);
      setMultiplier(clamped);
      flashHint('×' + clamped.toFixed(1));
    },
    onDragEnd: (axis, velocity) => {
      if (axis === 'vertical' && engine) {
        engine.resetSpeedMultiplier();
        setTimeout(() => setMultiplier(1.0), 400);
      } else if (axis === 'horizontal' && engine) {
        let v = velocity * 80;
        const friction = 0.92;
        const applyMomentum = () => {
          v *= friction;
          if (Math.abs(v) < 0.5) return;
          const delta = Math.round(v * 0.05);
          if (delta !== 0) engine.seek(delta);
          requestAnimationFrame(applyMomentum);
        };
        if (Math.abs(velocity) > 0.05) requestAnimationFrame(applyMomentum);
      }
    },
    onDiagonalSwipe: captureNote,
    onPinch: (scale) => {
      if (!prefs) return;
      const newSize = Math.max(20, Math.min(80, Math.round(prefs.fontSize * scale)));
      setPref('fontSize', newSize);
    },
    
    // Keyboard handlers (called inside useGestures.js)
    onSeek: (delta) => {
      if (engine) {
        engine.seek(delta);
        flashHint((delta >= 0 ? '→ +' : '← ') + Math.abs(delta));
      }
    },
    onSpeedChange: (delta) => {
      if (engine) {
        const nextWpm = Math.max(60, Math.min(1200, wpm + delta));
        updateWpm(nextWpm);
        flashHint((delta >= 0 ? '↑ ' : '↓ ') + nextWpm + ' WPM');
      }
    },
    onBack: () => {
      // Toggle Zen Mode on ESC
      setZenMode(v => !v);
      flashHint(zenMode ? 'Dashboard Mode' : 'Zen Focus Mode');
    },
    onFullscreen: toggleFullscreen,
    onModeSwitch: (modeIdx) => {
      const modes = ['rsvp', 'flow', 'teleprompter'];
      const targetMode = modes[modeIdx];
      if (targetMode) {
        setMode(targetMode);
        if (setPref) setPref('mode', targetMode);
        flashHint(targetMode.toUpperCase());
      }
    },
    onCycleFocus: cycleFocusMode,
    onToggleNotes: () => {
      setZenMode(false);
      setActiveTab('notes');
      flashHint('Notes panel opened');
    },
    onToggleSettings: () => {
      setZenMode(false);
      setActiveTab('adjust');
      flashHint('Settings panel opened');
    }
  };

  useGestures(readerRef, gestureHandlers, { enabled: true, keyboard: true });

  const progress = total > 0 ? index / (total - 1 || 1) : 0;

  return (
    <div className="studio-canvas" ref={readerRef} aria-live="polite">
      {/* Cinematic Grid Guides */}
      <div className="crosshair-v" aria-hidden="true" />
      <div className="crosshair-h" aria-hidden="true" />
      <div className="orp-tick orp-tick-top" aria-hidden="true" />
      <div className="orp-tick orp-tick-bottom" aria-hidden="true" />

      {/* active reading display modes */}
      {mode === 'rsvp' && (
        <RSVPDisplay
          token={token}
          index={index}
          total={total}
          engine={engine}
          reducedMotion={prefs?.reduceMotion}
        />
      )}

      {mode === 'flow' && (
        <FlowDisplay
          token={token}
          index={index}
          engine={engine}
          reducedMotion={prefs?.reduceMotion}
        />
      )}

      {mode === 'teleprompter' && (
        <TeleprompterDisplay
          token={token}
          index={index}
          engine={engine}
          onBuild={(fn) => { teleBuilderRef.current = fn; }}
        />
      )}

      {/* Top Floating Controls */}
      <div className="canvas-top-bar">
        <div className="canvas-top-left">
          <button
            className="reader-btn"
            onClick={() => setZenMode(v => !v)}
            title={zenMode ? 'Show Sidebar' : 'Zen Focus Mode (Hide Sidebar)'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {zenMode ? (
                <>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <polyline points="14 10 12 12 14 14" />
                </>
              ) : (
                <>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <polyline points="12 10 14 12 12 14" />
                </>
              )}
            </svg>
            <span>{zenMode ? 'STUDIO' : 'ZEN'}</span>
          </button>
          <div className="badge-state">{state.toUpperCase()}</div>
        </div>

        {/* Display modes switch inside reader overlay */}
        <div className="canvas-top-right">
          <div className="speed-preset-pills" style={{ marginRight: '6px' }}>
            {READING_MODES.map(m => (
              <button
                key={m}
                className={`preset-pill ${mode === m ? 'active' : ''}`}
                onClick={() => {
                  setMode(m);
                  if (setPref) setPref('mode', m);
                }}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="reader-btn" onClick={toggleFullscreen} title="Toggle Fullscreen">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Gestures hint text flashes */}
      <GestureHint />

      {/* Bottom Floating Control Panel */}
      <div className="canvas-bottom-bar">
        {/* Scrubbing slider */}
        <div className="scrub-bar-container">
          <input
            type="range"
            className="scrub-slider"
            min={0}
            max={total > 0 ? total - 1 : 0}
            value={index}
            onChange={handleScrubChange}
            title="Drag or click to seek words"
          />
          <span className="progress-timestamp">
            {index + 1} / {total}
          </span>
        </div>

        {/* Playback Controls Row */}
        <div className="controls-main-row">
          {/* Main buttons: Seek back, play/pause, seek forward, restart */}
          <div className="playback-controls">
            <button
              className="playback-btn"
              onClick={() => { if (engine) engine.seek(-1); }}
              title="Previous Word"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="19 20 9 12 19 4 19 20" />
                <line x1="5" y1="19" x2="5" y2="5" />
              </svg>
            </button>

            <button
              className="playback-btn"
              onClick={() => { if (engine) engine.seek(-GESTURES.SEEK_DELTA); }}
              title={`Rewind ${GESTURES.SEEK_DELTA} words`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 19 2 12 11 5 11 19" />
                <polygon points="22 19 13 12 22 5 22 19" />
              </svg>
            </button>

            <button
              className="play-btn-circle"
              onClick={() => { if (engine) engine.toggle(); }}
              title="Spacebar (Play/Pause)"
            >
              {state === 'playing' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="5" height="16" />
                  <rect x="15" y="4" width="5" height="16" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>

            <button
              className="playback-btn"
              onClick={() => { if (engine) engine.seek(GESTURES.SEEK_DELTA); }}
              title={`Forward ${GESTURES.SEEK_DELTA} words`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 19 22 12 13 5 13 19" />
                <polygon points="2 19 11 12 2 5 2 19" />
              </svg>
            </button>

            <button
              className="playback-btn"
              onClick={() => { if (engine) engine.seek(1); }}
              title="Next Word"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </button>

            <button
              className="playback-btn"
              style={{ marginLeft: '6px' }}
              onClick={() => { if (engine) engine.seek(-engine.getCur()); }}
              title="Restart reading"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </div>

          {/* Speed Presets & Precise WPM editor */}
          <div className="speed-controls-group">
            {/* Speed preset pills */}
            <div className="speed-preset-pills">
              {[200, 350, 500, 700].map(val => (
                <button
                  key={val}
                  className={`preset-pill ${wpm === val ? 'active' : ''}`}
                  onClick={() => updateWpm(val)}
                  title={`Set speed to ${val} WPM`}
                >
                  {val}
                </button>
              ))}
            </div>

            {/* Slider and direct input */}
            <div className="wpm-adjuster-row">
              <label htmlFor="canvas-wpm-slider">SPEED</label>
              <input
                type="range"
                id="canvas-wpm-slider"
                className="wpm-slider-small"
                min={WPM_RANGE.min}
                max={WPM_RANGE.max}
                step={WPM_RANGE.step}
                value={wpm}
                onChange={(e) => updateWpm(Number(e.target.value))}
              />
              <input
                type="text"
                className="wpm-text-input"
                value={wpmInput}
                onChange={handleWpmInputChange}
                onBlur={handleWpmInputBlur}
                onKeyDown={handleWpmInputKeyDown}
                title="Type a precise WPM speed and press Enter"
              />
              <span>WPM</span>
            </div>

            {/* Badge details */}
            <div className="badge-row">
              <WpmBadge wpm={wpm} multiplier={multiplier} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
