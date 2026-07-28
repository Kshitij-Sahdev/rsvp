'use client';
import { useRef, useEffect } from 'react';

function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function FlowDisplay({ token, index, engine, reducedMotion }) {
  const sentenceRef = useRef(null);
  const currentSentenceRef = useRef(-1);

  useEffect(() => {
    if (!token || !engine || !sentenceRef.current) return;

    const indices = engine.getSentenceIndices(index);
    if (!indices) return;
    const [sStart, sEnd] = indices;
    const sentIdx = token.sentence_idx || 0;

    // Rebuild sentence HTML if sentence changed
    if (sentIdx !== currentSentenceRef.current) {
      currentSentenceRef.current = sentIdx;
      let html = '';
      for (let i = sStart; i <= sEnd; i++) {
        const wt = engine.getToken(i);
        if (!wt) continue;
        html += `<span class="flow-word" data-idx="${i}">`;
        html += escHtml(wt.before);
        html += `<span class="flow-orp">${escHtml(wt.orp)}</span>`;
        html += escHtml(wt.after);
        html += escHtml(wt.punct);
        html += '</span> ';
      }
      sentenceRef.current.innerHTML = html;

      // Cinematic drift in
      if (!reducedMotion) {
        sentenceRef.current.style.opacity = '0';
        sentenceRef.current.style.transform = 'translateY(12px) scale(0.98)';
        
        // Double RAF to ensure styles are applied before transition begins
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (sentenceRef.current) {
              sentenceRef.current.style.opacity = '1';
              sentenceRef.current.style.transform = 'translateY(0) scale(1)';
            }
          });
        });
      }
    }

    // Highlight current word
    sentenceRef.current.querySelectorAll('.flow-word').forEach(el => {
      const wi = parseInt(el.dataset.idx);
      el.classList.toggle('current', wi === index);
      el.classList.toggle('past', wi < index);
      el.classList.toggle('future', wi > index);
    });
  }, [token, index, engine, reducedMotion]);

  return (
    <div className="mode-container">
      <div className="flow-sentence" ref={sentenceRef} />
    </div>
  );
}
