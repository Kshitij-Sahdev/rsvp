'use client';
import { useRef, useEffect, useCallback } from 'react';

function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function TeleprompterDisplay({ token, index, engine, onBuild }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const builtRef = useRef(false);

  // Build teleprompter text
  const buildTeleprompter = useCallback(() => {
    if (!engine || !textRef.current) return;
    const total = engine.getTotal();
    let html = '';
    for (let i = 0; i < total; i++) {
      const t = engine.getToken(i);
      if (!t) continue;
      html += `<span class="tp-word" data-idx="${i}">`;
      html += escHtml(t.word) + escHtml(t.punct);
      html += '</span> ';
      if (t.sentence_end) html += ' ';
    }
    textRef.current.innerHTML = html;
    builtRef.current = true;
  }, [engine]);

  // Build on mount or when engine changes
  useEffect(() => {
    if (engine && engine.getTotal() > 0 && !builtRef.current) {
      buildTeleprompter();
    }
  }, [engine, buildTeleprompter]);

  // Expose build function to parent
  useEffect(() => {
    if (onBuild) onBuild(buildTeleprompter);
  }, [onBuild, buildTeleprompter]);

  // Update word highlighting and scroll
  useEffect(() => {
    if (!token || !textRef.current || !containerRef.current) return;

    // Update word classes
    textRef.current.querySelectorAll('.tp-word').forEach(el => {
      const wi = parseInt(el.dataset.idx);
      el.classList.toggle('active', wi === index);
      el.classList.toggle('past', wi < index);
      el.classList.toggle('future', wi > index);
    });

    // Sub-pixel smooth scroll via CSS transform
    const activeEl = textRef.current.querySelector('.tp-word.active');
    if (activeEl) {
      const container = containerRef.current;
      // We want to position the active word about 35% from the top
      const offset = activeEl.offsetTop - container.clientHeight * 0.35;
      
      // Use CSS transform for hardware accelerated, sub-pixel smooth sliding
      textRef.current.style.transform = `translate3d(0, -${offset}px, 0)`;
    }
  }, [token, index]);

  // Reset built state when unmounted
  useEffect(() => {
    return () => { builtRef.current = false; };
  }, []);

  return (
    <div className="teleprompter-container" ref={containerRef}>
      <div className="teleprompter-text" ref={textRef} />
      <div className="teleprompter-focus-line" aria-hidden="true" />
    </div>
  );
}
