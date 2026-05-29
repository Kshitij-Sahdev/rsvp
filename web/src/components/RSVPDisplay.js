'use client';
import { useRef, useEffect, useCallback } from 'react';

export default function RSVPDisplay({ token, index, total, engine, reducedMotion }) {
  const wordRef = useRef(null);

  // Animate word entry
  useEffect(() => {
    if (!wordRef.current || reducedMotion || !token) return;
    const el = wordRef.current;
    el.classList.add('word-enter');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.remove('word-enter');
      });
    });
  }, [token, reducedMotion]);

  // Get context words
  const prevToken = engine && index > 0 ? engine.getToken(index - 1) : null;
  const nextToken = engine && index < total - 1 ? engine.getToken(index + 1) : null;

  return (
    <div className="word-container">
      <div className="context-word" aria-hidden="true">
        {prevToken ? prevToken.word + (prevToken.punct || '') : '\u00A0'}
      </div>
      <div className="word-display" ref={wordRef} role="timer" aria-atomic="true">
        <span className="before">{token?.before || ''}</span>
        <span className="orp">{token?.orp || ''}</span>
        <span className="after">{token?.after || ''}</span>
        <span className="punct">{token?.punct || ''}</span>
      </div>
      <div className="context-word" aria-hidden="true">
        {nextToken ? nextToken.word + (nextToken.punct || '') : '\u00A0'}
      </div>
    </div>
  );
}
