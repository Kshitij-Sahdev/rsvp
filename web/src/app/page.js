'use client';
import { useState, useCallback, useRef } from 'react';
import ImportScreen from '@/components/ImportScreen';
import ReaderScreen from '@/components/ReaderScreen';
import Toast from '@/components/Toast';
import useRSVPEngine from '@/hooks/useRSVPEngine';
import useTheme from '@/hooks/useTheme';

export default function Home() {
  const [screen, setScreen] = useState('import'); // 'import' | 'reader'
  const [readerConfig, setReaderConfig] = useState({ wpm: 300, mode: 'rsvp' });

  const { engine, load, stop } = useRSVPEngine();
  const {
    prefs, setPref,
    recentTexts, saveRecent, loadRecentText,
    notes, addNote, deleteNote, exportNotes,
  } = useTheme();

  const handleStart = useCallback((text, wpm, mode) => {
    load(text, wpm);
    setReaderConfig({ wpm, mode });
    saveRecent(text, wpm);
    setScreen('reader');
  }, [load, saveRecent]);

  const handleBack = useCallback(() => {
    if (engine) engine.pause();
    setScreen('import');
  }, [engine]);

  const handleLoadRecent = useCallback((title) => {
    const text = loadRecentText(title);
    if (text) {
      handleStart(text, prefs.wpm, prefs.mode);
    }
  }, [loadRecentText, handleStart, prefs.wpm, prefs.mode]);

  return (
    <>
      {screen === 'import' && (
        <ImportScreen
          onStart={handleStart}
          recentTexts={recentTexts}
          onLoadRecent={handleLoadRecent}
          prefs={prefs}
          setPref={setPref}
        />
      )}
      {screen === 'reader' && engine && (
        <ReaderScreen
          engine={engine}
          initialWpm={readerConfig.wpm}
          initialMode={readerConfig.mode}
          prefs={prefs}
          setPref={setPref}
          notes={notes}
          addNote={addNote}
          deleteNote={deleteNote}
          exportNotes={exportNotes}
          onBack={handleBack}
        />
      )}
      <Toast />
    </>
  );
}
