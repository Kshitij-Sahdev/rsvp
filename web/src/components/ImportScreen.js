'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { READING_MODES, WPM_RANGE, SAMPLE_TEXT } from '@/lib/constants';

function timeAgo(date) {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
  return Math.floor(sec / 86400) + 'd ago';
}

export default function ImportScreen({ onStart, recentTexts, onLoadRecent, prefs, setPref }) {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [wpm, setWpmLocal] = useState(prefs?.wpm || WPM_RANGE.default);
  const [mode, setMode] = useState(prefs?.mode || 'rsvp');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync WPM with prefs
  useEffect(() => {
    if (prefs?.wpm) setWpmLocal(prefs.wpm);
  }, [prefs?.wpm]);

  // Focus textarea on mount
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const handleStart = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      if (typeof window !== 'undefined' && window.__rsvpToast) {
        window.__rsvpToast('Paste some text first');
      }
      return;
    }
    if (setPref) {
      setPref('wpm', wpm);
      setPref('mode', mode);
    }
    onStart(trimmed, wpm, mode);
  }, [text, wpm, mode, onStart, setPref]);

  const handleFile = useCallback((file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'txt') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setText(e.target.result);
        if (window.__rsvpToast) window.__rsvpToast('Loaded: ' + file.name);
      };
      reader.readAsText(file);
    } else {
      if (window.__rsvpToast) window.__rsvpToast(ext.toUpperCase() + ' support coming soon');
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleStart();
    }
  }, [handleStart]);

  return (
    <div className="import-screen" onKeyDown={handleKeyDown}>
      <div className="import-header">
        <h1 className="app-title">RSVP</h1>
        <p className="tagline">speed reading · flow · focus</p>
      </div>

      <div className="import-body">
        <textarea
          ref={textareaRef}
          className="text-input"
          spellCheck="false"
          placeholder="Paste or type your text here..."
          value={text}
          onChange={e => setText(e.target.value)}
        />

        <div className="import-secondary">
          <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={e => { e.preventDefault(); setDragOver(true); }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="drop-zone-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="12" y2="12"/>
                <line x1="15" y1="15" x2="12" y2="12"/>
              </svg>
            </div>
            <span className="drop-text">Drop file or <u>browse</u></span>
            <span className="drop-formats">TXT · PDF · EPUB · DOCX</span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".txt,.pdf,.epub,.docx"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }}
            />
          </div>
        </div>
      </div>

      <div className="import-controls">
        <div className="mode-tabs">
          {READING_MODES.map(m => (
            <button
              key={m}
              className={`mode-tab ${mode === m ? 'active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="wpm-row">
          <div className="wpm-control">
            <label htmlFor="wpm-slider">WPM</label>
            <input
              type="range"
              id="wpm-slider"
              min={WPM_RANGE.min}
              max={WPM_RANGE.max}
              step={WPM_RANGE.step}
              value={wpm}
              onChange={e => setWpmLocal(Number(e.target.value))}
            />
            <span className="wpm-val">{wpm}</span>
          </div>
        </div>

        <button className="start-btn" onClick={handleStart}>
          <span className="btn-icon">▶</span>
          <span className="btn-text">BEGIN</span>
        </button>
      </div>

      <div className="import-footer">
        <p className="gesture-help gesture-help-desktop">
          <kbd>Space</kbd> play/pause · <kbd>←</kbd><kbd>→</kbd> seek · <kbd>↑</kbd><kbd>↓</kbd> speed · <kbd>Esc</kbd> back · <kbd>F</kbd> fullscreen
        </p>
        <p className="gesture-help gesture-help-mobile">
          tap: play/pause · drag ↔: scrub · drag ↕: speed · long press: back
        </p>
      </div>

      {recentTexts && recentTexts.length > 0 && (
        <div className="recent-section">
          <h3 className="recent-title">Recent</h3>
          <div className="recent-list">
            {recentTexts.map((r, i) => (
              <div
                key={i}
                className="recent-item"
                onClick={() => onLoadRecent && onLoadRecent(r.title)}
              >
                <span className="recent-item-text">{r.preview}</span>
                <span className="recent-item-time">{timeAgo(new Date(r.timestamp))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
