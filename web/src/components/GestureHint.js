'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export default function GestureHint() {
  const [hint, setHint] = useState('');
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);

  const flash = useCallback((text) => {
    setHint(text);
    setShow(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShow(false), 800);
  }, []);

  useEffect(() => {
    window.__rsvpHint = flash;
    return () => { delete window.__rsvpHint; clearTimeout(timerRef.current); };
  }, [flash]);

  return (
    <div className={`gesture-hint-overlay ${show ? 'show' : ''}`} aria-hidden="true">
      {hint}
    </div>
  );
}

export function flashHint(text) {
  if (typeof window !== 'undefined' && window.__rsvpHint) {
    window.__rsvpHint(text);
  }
}
