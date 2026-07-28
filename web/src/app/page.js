'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import WorkspaceSidebar from '@/components/WorkspaceSidebar';
import ReaderScreen from '@/components/ReaderScreen';
import Toast, { showToast } from '@/components/Toast';
import useRSVPEngine from '@/hooks/useRSVPEngine';
import useTheme from '@/hooks/useTheme';
import { SAMPLE_TEXT } from '@/lib/constants';

export default function Home() {
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'library' | 'notes' | 'adjust'
  const [text, setText] = useState(SAMPLE_TEXT);
  const [wpm, setWpm] = useState(300);
  const [mode, setMode] = useState('rsvp');
  const [zenMode, setZenMode] = useState(false);

  // Engine state mirroring
  const [token, setToken] = useState(null);
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState('idle');

  const { engine, load } = useRSVPEngine();
  const {
    prefs, setPref,
    recentTexts, saveRecent, loadRecentText,
    notes, addNote, deleteNote, exportNotes,
  } = useTheme();

  // Load initial settings once preferences hydrate from local storage
  useEffect(() => {
    if (prefs) {
      if (prefs.wpm) {
        setWpm(prefs.wpm);
        if (engine) engine.setWpm(prefs.wpm);
      }
      if (prefs.mode) {
        setMode(prefs.mode);
      }
    }
  }, [prefs, engine]);

  // Initial text load to engine on mount
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (engine && isInitialMount.current) {
      isInitialMount.current = false;
      engine.load(text, wpm);
      setTotal(engine.getTotal());
      setToken(engine.getToken(0));
    }
  }, [engine, text, wpm]);

  // Debounced editor text updates to the speed reader engine.
  // Preserves current reading index position so users can edit text seamlessly.
  useEffect(() => {
    if (isInitialMount.current) return;

    const timer = setTimeout(() => {
      if (engine) {
        const curIndex = engine.getCur();
        engine.load(text, wpm);
        const newTotal = engine.getTotal();
        setTotal(newTotal);

        if (newTotal > 0) {
          const targetIndex = Math.min(curIndex, newTotal - 1);
          engine.seek(targetIndex);
          setIndex(targetIndex);
          setToken(engine.getToken(targetIndex));
        } else {
          setIndex(0);
          setToken(null);
        }
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [text, engine, wpm]);

  // Triggered when user starts playback or loads text
  const handleStartPlay = useCallback(() => {
    if (engine) {
      const trimmed = text.trim();
      if (!trimmed) {
        showToast('Paste some text first');
        return;
      }
      saveRecent(trimmed, wpm);
      engine.play();
    }
  }, [engine, text, wpm, saveRecent]);

  // Load a text item from the library
  const handleLoadRecent = useCallback((title) => {
    const loadedText = loadRecentText(title);
    if (loadedText) {
      setText(loadedText);
      if (engine) {
        engine.load(loadedText, wpm);
        setTotal(engine.getTotal());
        setIndex(0);
        setToken(engine.getToken(0));
        showToast(`Loaded: ${title}`);
      }
    }
  }, [loadRecentText, engine, wpm]);

  // Seeking to notes trigger
  const handleSeekToNote = useCallback((wordIdx) => {
    if (engine) {
      engine.seek(wordIdx - engine.getCur());
      showToast(`Jumped to note word`);
    }
  }, [engine]);

  // Auto-save edited text to history when user stops or completes reading
  useEffect(() => {
    if (state === 'done') {
      saveRecent(text, wpm);
    }
  }, [state, text, wpm, saveRecent]);

  // Calculate metadata
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const minutes = wordCount / wpm;
  const estReadTime = minutes < 1
    ? `${Math.round(minutes * 60)}s`
    : `${Math.ceil(minutes)}m`;

  return (
    <div className={`studio-container ${zenMode ? 'zen-mode' : ''}`} data-theme={prefs?.theme || 'dark'}>
      {/* Unified workspace panel containing Editor/Library/Notes/Settings */}
      <WorkspaceSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        text={text}
        setText={setText}
        recentTexts={recentTexts}
        onLoadRecent={handleLoadRecent}
        notes={notes}
        onDeleteNote={deleteNote}
        onExportNotes={exportNotes}
        onSeekToNote={handleSeekToNote}
        prefs={prefs}
        setPref={setPref}
        wordCount={wordCount}
        estReadTime={estReadTime}
      />

      {/* Cinematic right-side speed reader displaying RSVP, Flow, or Teleprompter */}
      {engine && (
        <ReaderScreen
          engine={engine}
          wpm={wpm}
          setWpm={setWpm}
          mode={mode}
          setMode={setMode}
          token={token}
          setToken={setToken}
          index={index}
          setIndex={setIndex}
          total={total}
          setTotal={setTotal}
          state={state}
          setState={setState}
          prefs={prefs}
          setPref={setPref}
          notes={notes}
          addNote={addNote}
          deleteNote={deleteNote}
          exportNotes={exportNotes}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          zenMode={zenMode}
          setZenMode={setZenMode}
        />
      )}

      {/* Shared visual toast element */}
      <Toast />
    </div>
  );
}
