'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { FONTS, ORP_COLORS, READING_MODES, WPM_RANGE } from '@/lib/constants';

function timeAgo(date) {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
  return Math.floor(sec / 86400) + 'd ago';
}

function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function WorkspaceSidebar({
  activeTab,
  setActiveTab,
  text,
  setText,
  recentTexts,
  onLoadRecent,
  notes,
  onDeleteNote,
  onExportNotes,
  onSeekToNote,
  prefs,
  setPref,
  wordCount,
  estReadTime,
}) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

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
      if (window.__rsvpToast) window.__rsvpToast(ext.toUpperCase() + ' support coming soon. Please use TXT.');
    }
  }, [setText]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  // Clean / format text: removes excess blank lines, normalizes quotes
  const formatText = useCallback(() => {
    let formatted = text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')             // collapse multiple spaces
      .replace(/\n\s*\n\s*\n+/g, '\n\n')   // collapse triple newlines to double
      .replace(/[\u2018\u2019]/g, "'")     // normalize curly single quotes
      .replace(/[\u201C\u201D]/g, '"');    // normalize curly double quotes
    setText(formatted.trim());
    if (window.__rsvpToast) window.__rsvpToast('✨ Text formatted');
  }, [text, setText]);

  const clearText = useCallback(() => {
    if (confirm('Clear editor text?')) {
      setText('');
    }
  }, [setText]);

  const triggerExportNotes = useCallback(() => {
    const exportedText = onExportNotes();
    if (!exportedText.trim()) {
      if (window.__rsvpToast) window.__rsvpToast('No notes to export');
      return;
    }
    const blob = new Blob([exportedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rsvp-notes-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    if (window.__rsvpToast) window.__rsvpToast('📥 Exported notes successfully');
  }, [onExportNotes]);

  return (
    <aside className="studio-sidebar" aria-label="Workspace Studio">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand-row">
          <h1 className="sidebar-brand">RSVP STUDIO</h1>
          <span className="badge-item">v1.2</span>
        </div>
        <p className="sidebar-tagline">speed reading · focus · precision</p>
      </div>

      {/* Tabs Menu */}
      <div className="sidebar-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'editor'}
          className={`sidebar-tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          Editor
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'library'}
          className={`sidebar-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          Library
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'notes'}
          className={`sidebar-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Notes ({notes.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'adjust'}
          className={`sidebar-tab-btn ${activeTab === 'adjust' ? 'active' : ''}`}
          onClick={() => setActiveTab('adjust')}
        >
          Adjust
        </button>
      </div>

      {/* Panels content */}
      <div className="sidebar-panels">
        {/* 📝 EDITOR PANEL */}
        <div className={`sidebar-panel ${activeTab === 'editor' ? 'active' : ''}`} role="tabpanel">
          <div className="editor-workspace">
            <div className="editor-meta">
              <span>{wordCount} words · est. {estReadTime}</span>
              <div className="editor-actions">
                <button className="btn-small" onClick={formatText} title="Format and clean spacing">Format</button>
                <button className="btn-small" onClick={clearText} title="Clear text editor">Clear</button>
              </div>
            </div>
            <textarea
              className="editor-textarea"
              placeholder="Paste, load, or type text here... it will automatically update in the speed reader."
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck="false"
            />
            <div
              className={`sidebar-drop-zone ${dragOver ? 'drag-over' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={e => { e.preventDefault(); setDragOver(true); }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span className="sidebar-drop-text">Drop a .txt file or <u>browse</u></span>
              <input
                type="file"
                ref={fileInputRef}
                accept=".txt"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }}
              />
            </div>
          </div>
        </div>

        {/* 📚 LIBRARY PANEL */}
        <div className={`sidebar-panel ${activeTab === 'library' ? 'active' : ''}`} role="tabpanel">
          <div className="library-workspace">
            <div className="library-section">
              <h3 className="library-section-title">Recent Reading History</h3>
              <div className="library-list">
                {(!recentTexts || recentTexts.length === 0) ? (
                  <div className="notes-stream-empty">No reading history yet. Type in Editor to save item.</div>
                ) : (
                  recentTexts.map((r) => (
                    <div
                      key={r.id}
                      className="library-item"
                      onClick={() => onLoadRecent(r.title)}
                    >
                      <div className="library-item-header">
                        <span className="library-item-title">{r.title}</span>
                        <span className="library-item-meta">{timeAgo(new Date(r.timestamp))}</span>
                      </div>
                      <p className="library-item-preview">{r.preview}</p>
                      <div className="library-item-meta" style={{ marginTop: '4px' }}>
                        <span>{r.wordCount} words</span>
                        <span>Saved at {r.wpm} WPM</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 📌 NOTES PANEL */}
        <div className={`sidebar-panel ${activeTab === 'notes' ? 'active' : ''}`} role="tabpanel">
          <div className="notes-workspace">
            <div className="notes-header-actions">
              <h3 className="library-section-title">Saved Annotations</h3>
              {notes.length > 0 && (
                <button className="btn-small" onClick={triggerExportNotes} style={{ fontSize: '0.62rem', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 6px' }}>
                  Export Notes (.txt)
                </button>
              )}
            </div>
            <div className="notes-stream">
              {(!notes || notes.length === 0) ? (
                <div className="notes-stream-empty">
                  No notes saved yet.<br />Swipe ↘ or press <kbd>Shift + N</kbd> during reading to bookmark a word with its context.
                </div>
              ) : (
                notes.map((n) => (
                  <div
                    key={n.id}
                    className="note-studio-card"
                    onClick={() => onSeekToNote(n.wordIdx)}
                  >
                    <div className="note-studio-context" dangerouslySetInnerHTML={{
                      __html: n.context.map(c =>
                        c.isTarget
                          ? `<span class="note-studio-highlight">${escHtml(c.word)}</span>`
                          : escHtml(c.word)
                      ).join(' ')
                    }} />
                    <div className="note-studio-meta">
                      <span className="note-studio-time">{timeAgo(new Date(n.timestamp))}</span>
                      <button
                        className="note-studio-delete"
                        onClick={(e) => { e.stopPropagation(); onDeleteNote(n.id); }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ⚙️ ADJUST/SETTINGS PANEL */}
        <div className={`sidebar-panel ${activeTab === 'adjust' ? 'active' : ''}`} role="tabpanel">
          {prefs && (
            <div className="adjustments-workspace">
              {/* Theme selection */}
              <div className="settings-section">
                <h4 className="library-section-title">Visual Theme</h4>
                <div className="pill-group">
                  {['dark', 'amoled', 'sepia', 'paper', 'graphite'].map(t => (
                    <button
                      key={t}
                      className={`pill ${prefs.theme === t ? 'active' : ''}`}
                      onClick={() => setPref('theme', t)}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* ORP Highlights selection */}
              <div className="settings-section">
                <h4 className="library-section-title">ORP Highlight Color</h4>
                <div className="swatch-group">
                  {Object.keys(ORP_COLORS).map(k => (
                    <button
                      key={k}
                      className={`swatch ${prefs.orp === k ? 'active' : ''}`}
                      style={{ '--sw': ORP_COLORS[k].color }}
                      aria-label={k}
                      onClick={() => setPref('orp', k)}
                    />
                  ))}
                </div>
              </div>

              {/* Focus mode selection */}
              <div className="settings-section">
                <h4 className="library-section-title">Focus Mode</h4>
                <div className="pill-group">
                  {['zen', 'guided', 'sentence'].map(m => (
                    <button
                      key={m}
                      className={`pill ${prefs.focus === m ? 'active' : ''}`}
                      onClick={() => setPref('focus', m)}
                    >
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography controls */}
              <div className="settings-section">
                <h4 className="library-section-title">Typography</h4>
                <div className="select-row">
                  <label htmlFor="studio-font-select">Font</label>
                  <select
                    id="studio-font-select"
                    className="settings-select"
                    value={prefs.font}
                    onChange={e => setPref('font', e.target.value)}
                  >
                    {FONTS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div className="slider-row" style={{ marginTop: '8px' }}>
                  <label htmlFor="studio-font-size">Size</label>
                  <input
                    type="range" id="studio-font-size"
                    min="20" max="80" value={prefs.fontSize}
                    onChange={e => setPref('fontSize', Number(e.target.value))}
                  />
                  <span className="slider-val">{prefs.fontSize}px</span>
                </div>

                <div className="slider-row">
                  <label htmlFor="studio-font-weight">Weight</label>
                  <input
                    type="range" id="studio-font-weight"
                    min="300" max="700" step="100" value={prefs.fontWeight}
                    onChange={e => setPref('fontWeight', Number(e.target.value))}
                  />
                  <span className="slider-val">{prefs.fontWeight}</span>
                </div>

                <div className="slider-row">
                  <label htmlFor="studio-letter-spacing">Spacing</label>
                  <input
                    type="range" id="studio-letter-spacing"
                    min="-2" max="10" step="0.5" value={prefs.letterSpacing}
                    onChange={e => setPref('letterSpacing', Number(e.target.value))}
                  />
                  <span className="slider-val">{prefs.letterSpacing}px</span>
                </div>

                <div className="slider-row">
                  <label htmlFor="studio-context-opacity">Context</label>
                  <input
                    type="range" id="studio-context-opacity"
                    min="0" max="50" value={prefs.contextOpacity}
                    onChange={e => setPref('contextOpacity', Number(e.target.value))}
                  />
                  <span className="slider-val">{(prefs.contextOpacity / 100).toFixed(2)}</span>
                </div>
              </div>

              {/* Sound mode selection */}
              <div className="settings-section">
                <h4 className="library-section-title">Sound FX</h4>
                <div className="pill-group">
                  {['off', 'tick', 'ambient'].map(s => (
                    <button
                      key={s}
                      className={`pill ${prefs.sound === s ? 'active' : ''}`}
                      onClick={() => setPref('sound', s)}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accessibility toggles */}
              <div className="settings-section">
                <h4 className="library-section-title">Accessibility</h4>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={prefs.dyslexia}
                    onChange={e => setPref('dyslexia', e.target.checked)}
                  />
                  <span>Dyslexia-friendly font</span>
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={prefs.reduceMotion}
                    onChange={e => setPref('reduceMotion', e.target.checked)}
                  />
                  <span>Reduced motion animations</span>
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={prefs.highContrast}
                    onChange={e => setPref('highContrast', e.target.checked)}
                  />
                  <span>High contrast colors</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
