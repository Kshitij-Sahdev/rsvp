'use client';

function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function timeAgo(date) {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
  return Math.floor(sec / 86400) + 'd ago';
}

export default function NotesPanel({ notes, onDeleteNote, onExportNotes, onSeekToNote, onClose }) {
  return (
    <div className="panel" role="complementary" aria-label="Notes">
      <div className="panel-header">
        <h2 className="panel-title">Notes</h2>
        <div className="panel-actions">
          <button className="panel-btn" aria-label="Export notes" onClick={onExportNotes}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <button className="panel-btn" aria-label="Close notes" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="notes-list">
        {(!notes || notes.length === 0) ? (
          <div className="notes-empty">No notes yet. Swipe ↘ during reading to capture a thought.</div>
        ) : (
          notes.map(n => (
            <div
              key={n.id}
              className="note-card"
              onClick={() => onSeekToNote && onSeekToNote(n.wordIdx)}
            >
              <div className="note-context" dangerouslySetInnerHTML={{
                __html: n.context.map(c =>
                  c.isTarget
                    ? `<span class="note-highlight">${escHtml(c.word)}</span>`
                    : escHtml(c.word)
                ).join(' ')
              }} />
              <div className="note-meta">
                <span className="note-time">{timeAgo(new Date(n.timestamp))}</span>
                <button
                  className="note-delete"
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
  );
}
