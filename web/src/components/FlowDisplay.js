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

    const rawTokens = engine.getRawTokens();
    const rawIdx = token._originalIndices ? token._originalIndices[0] : index;
    const [sStart, sEnd] = engine.getSentenceIndices(rawIdx);
    const sentIdx = rawTokens[rawIdx] ? rawTokens[rawIdx].sentence_idx : 0;

    // Rebuild sentence HTML if sentence changed
    if (sentIdx !== currentSentenceRef.current) {
      currentSentenceRef.current = sentIdx;
      let html = '';
      for (let i = sStart; i <= sEnd; i++) {
        const wt = rawTokens[i];
        if (!wt) continue;
        html += `<span class="flow-word" data-idx="${i}">`;
        html += escHtml(wt.before);
        html += `<span class="flow-orp">${escHtml(wt.orp)}</span>`;
        html += escHtml(wt.after);
        html += escHtml(wt.punct);
        html += '</span> ';
      }
      sentenceRef.current.innerHTML = html;

      // Fade in
      if (!reducedMotion) {
        sentenceRef.current.style.opacity = '0';
        requestAnimationFrame(() => {
          if (sentenceRef.current) sentenceRef.current.style.opacity = '1';
        });
      }
    }

    // Highlight current word
    sentenceRef.current.querySelectorAll('.flow-word').forEach(el => {
      const wi = parseInt(el.dataset.idx);
      el.classList.toggle('current', wi === rawIdx);
      el.classList.toggle('past', wi < rawIdx);
      el.classList.toggle('future', wi > rawIdx);
    });
  }, [token, index, engine, reducedMotion]);

  return (
    <div className="mode-container">
      <div className="flow-sentence" ref={sentenceRef} />
    </div>
  );
}
