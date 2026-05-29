'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export default function Toast() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const show = useCallback((msg, duration = 2000) => {
    setMessage(msg);
    setVisible(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), duration);
  }, []);

  useEffect(() => {
    window.__rsvpToast = show;
    return () => { delete window.__rsvpToast; clearTimeout(timerRef.current); };
  }, [show]);

  return (
    <div className={`toast ${visible ? 'visible' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

// Helper to show toast from anywhere
export function showToast(msg, duration) {
  if (typeof window !== 'undefined' && window.__rsvpToast) {
    window.__rsvpToast(msg, duration);
  }
}
