'use client';
import { useRef, useEffect, useCallback } from 'react';

function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function FlowDisplay({ token, index, engine }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const builtRef = useRef(false);

  const buildStream = useCallback(() => {
    if (!engine || !textRef.current) return;
    const total = engine.getTotal();
    let html = '';
    for (let i = 0; i < total; i++) {
      const t = engine.getToken(i);
      if (!t) continue;
      html += `<span class="stream-word" data-idx="${i}">`;
      html += escHtml(t.before);
      html += `<span class="flow-orp">${escHtml(t.orp)}</span>`;
      html += escHtml(t.after);
      html += escHtml(t.punct);
      html += '</span> ';
    }
    textRef.current.innerHTML = html;
    builtRef.current = true;
  }, [engine]);

  useEffect(() => {
    if (engine && engine.getTotal() > 0 && !builtRef.current) {
      buildStream();
    }
  }, [engine, buildStream]);

  useEffect(() => {
    return () => { builtRef.current = false; };
  }, []);

  useEffect(() => {
    if (!token || !textRef.current || !containerRef.current) return;

    textRef.current.querySelectorAll('.stream-word').forEach(el => {
      const wi = parseInt(el.dataset.idx);
      el.classList.toggle('active', wi === index);
      el.classList.toggle('past', wi < index);
      el.classList.toggle('future', wi > index);
    });

    const activeEl = textRef.current.querySelector('.stream-word.active');
    if (activeEl) {
      const container = containerRef.current;
      const offset = activeEl.offsetLeft - (container.clientWidth / 2) + (activeEl.clientWidth / 2);
      textRef.current.style.transform = `translate3d(-${offset}px, 0, 0)`;
    }
  }, [token, index]);

  return (
    <div className="stream-container" ref={containerRef}>
      <div className="stream-text" ref={textRef} />
    </div>
  );
}

