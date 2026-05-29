'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import RSVPDisplay from './RSVPDisplay';
import FlowDisplay from './FlowDisplay';
import TeleprompterDisplay from './TeleprompterDisplay';
import SettingsDrawer from './SettingsDrawer';
import NotesPanel from './NotesPanel';
import ProgressBar from './ProgressBar';
import WpmBadge from './WpmBadge';
import GestureHint, { flashHint } from './GestureHint';
import { showToast } from './Toast';
import useGestures from '@/hooks/useGestures';
import { GESTURES, FOCUS_MODES } from '@/lib/constants';

export default function ReaderScreen({ engine, initialWpm, initialMode, prefs, setPref, notes, addNote, deleteNote, exportNotes, onBack }) {
  const [token, setToken] = useState(null);
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState('idle');
  const [wpm, setWpm] = useState(initialWpm || 300);
  const [mode, setMode] = useState(initialMode || 'rsvp');
  const [multiplier, setMultiplier] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [stateVisible, setStateVisible] = useState(false);

  const readerRef = useRef(null);
  const stateTimerRef = useRef(null);
  const teleBuilderRef = useRef(null);

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
      showToast(`Done! ${a.words_read} words in ${a.duration_sec}s · ${a.wpm_actual} WPM actual`);
    };

    return () => {
      engine.onToken = null;
      engine.onState = null;
      engine.onDone = null;
      clearTimeout(stateTimerRef.current);
    };
  }, [engine]);

  // Play on mount
  useEffect(() => {
    if (engine) {
      setTotal(engine.getTotal());
      setTimeout(() => engine.play(), 250);
    }
    return () => { if (engine) engine.pause(); };
  }, [engine]);

  // Teleprompter build
  useEffect(() => {
    if (mode === 'teleprompter' && teleBuilderRef.current) {
      teleBuilderRef.current();
    }
  }, [mode]);

  // Mode change
  const handleSetMode = useCallback((m) => {
    setMode(m);
    if (setPref) setPref('mode', m);
  }, [setPref]);

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

  // Focus mode cycling
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

  // Gesture handlers
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
    onLongPress: onBack,
    onHorizontalDrag: (dx) => {
      if (!engine) return;
      const wordsPerPixel = engine.getTotal() / (readerRef.current?.clientWidth || 800);
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
        // Momentum
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
    // Keyboard handlers
    onKeySpace: () => { if (engine) engine.toggle(); },
    onKeyLeft: () => {
      if (engine) { engine.seek(-GESTURES.SEEK_DELTA); flashHint('← −' + GESTURES.SEEK_DELTA); }
    },
    onKeyRight: () => {
      if (engine) { engine.seek(GESTURES.SEEK_DELTA); flashHint('→ +' + GESTURES.SEEK_DELTA); }
    },
    onKeyUp: () => {
      if (engine) {
        const newWpm = Math.min(1200, wpm + GESTURES.SPEED_DELTA);
        setWpm(newWpm);
        engine.setWpm(newWpm);
        flashHint('↑ ' + newWpm + ' WPM');
      }
    },
    onKeyDown: () => {
      if (engine) {
        const newWpm = Math.max(60, wpm - GESTURES.SPEED_DELTA);
        setWpm(newWpm);
        engine.setWpm(newWpm);
        flashHint('↓ ' + newWpm + ' WPM');
      }
    },
    onKeyEscape: () => {
      if (showSettings) setShowSettings(false);
      else if (showNotes) setShowNotes(false);
      else onBack();
    },
    onKeyF: toggleFullscreen,
    onKey1: () => { handleSetMode('rsvp'); flashHint('RSVP'); },
    onKey2: () => { handleSetMode('flow'); flashHint('FLOW'); },
    onKey3: () => { handleSetMode('teleprompter'); flashHint('TELEPROMPTER'); },
    onKeyM: cycleFocusMode,
    onKeyN: () => setShowNotes(v => !v),
    onKeyS: () => setShowSettings(v => !v),
  };

  useGestures(readerRef, gestureHandlers, { enabled: true, keyboard: true });

  const progress = total > 0 ? (index + 1) / total : 0;

  return (
    <div className="reader-screen" ref={readerRef} aria-live="polite">
      {/* Crosshair guides */}
      <div className="crosshair-v" aria-hidden="true" />
      <div className="crosshair-h" aria-hidden="true" />
      <div className="orp-tick orp-tick-top" aria-hidden="true" />
      <div className="orp-tick orp-tick-bottom" aria-hidden="true" />

      {/* RSVP Mode */}
      {mode === 'rsvp' && (
        <RSVPDisplay
          token={token}
          index={index}
          total={total}
          engine={engine}
          reducedMotion={prefs?.reduceMotion}
        />
      )}

      {/* Flow Mode */}
      {mode === 'flow' && (
        <FlowDisplay
          token={token}
          index={index}
          engine={engine}
          reducedMotion={prefs?.reduceMotion}
        />
      )}

      {/* Teleprompter Mode */}
      {mode === 'teleprompter' && (
        <TeleprompterDisplay
          token={token}
          index={index}
          engine={engine}
          onBuild={(fn) => { teleBuilderRef.current = fn; }}
        />
      )}

      {/* Top bar */}
      <div className="reader-top-bar">
        <button className="reader-btn" aria-label="Back to input" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          <span>ESC</span>
        </button>
        <div className={`state-badge ${stateVisible ? 'visible' : ''}`} aria-live="assertive">
          {state.toUpperCase()}
        </div>
        <div className="reader-top-right">
          <button className="reader-btn" aria-label="Toggle notes" onClick={() => setShowNotes(v => !v)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </button>
          <button className="reader-btn" aria-label="Open settings" onClick={() => setShowSettings(v => !v)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="reader-bottom-bar">
        <div className="reader-badge">{index + 1} / {total}</div>
        <div className="reader-badge mode-indicator">{mode.toUpperCase()}</div>
        <WpmBadge wpm={wpm} multiplier={multiplier} />
      </div>

      {/* Gesture hint */}
      <GestureHint />

      {/* Progress bar */}
      <ProgressBar progress={progress} />

      {/* Settings Drawer */}
      {showSettings && (
        <SettingsDrawer
          prefs={prefs}
          setPref={setPref}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Notes Panel */}
      {showNotes && (
        <NotesPanel
          notes={notes}
          onDeleteNote={deleteNote}
          onExportNotes={exportNotes}
          onSeekToNote={(idx) => {
            if (engine) {
              engine.seek(idx - engine.getCur());
              setShowNotes(false);
            }
          }}
          onClose={() => setShowNotes(false)}
        />
      )}
    </div>
  );
}
