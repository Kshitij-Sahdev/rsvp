'use client';
import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_PREFS, THEMES, ORP_COLORS, FONTS } from '@/lib/constants';

const PREFS_KEY = 'rsvp-prefs';
const RECENT_KEY = 'rsvp-recent';
const NOTES_KEY = 'rsvp-notes';
const MAX_RECENT = 10;

/* ── Safe localStorage helpers ──────────────────────────── */

function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded or unavailable — ignore */
  }
}

/**
 * useTheme — manages all user preferences, recent texts, and notes.
 *
 * SSR-safe: initial state is always DEFAULT_PREFS.
 * localStorage is only read inside useEffect (client-only).
 */
export default function useTheme() {
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS });
  const [recentTexts, setRecentTexts] = useState([]);
  const [notes, setNotes] = useState([]);

  /* ═══════════════════════════════════════════════════════════
   *  MOUNT — hydrate from localStorage + detect system prefs
   * ═══════════════════════════════════════════════════════════ */

  useEffect(() => {
    const saved = storageGet(PREFS_KEY, {});
    const merged = { ...DEFAULT_PREFS, ...saved };

    // Detect system preferences
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && !saved.reduceMotion) {
        merged.reduceMotion = true;
      }
      if (window.matchMedia('(prefers-color-scheme: light)').matches && !saved.theme) {
        merged.theme = 'paper';
      }
    } catch {
      /* matchMedia unavailable — keep defaults */
    }

    setPrefs(merged);
    storageSet(PREFS_KEY, merged);

    // Load recent texts
    setRecentTexts(storageGet(RECENT_KEY, []));

    // Load notes
    setNotes(storageGet(NOTES_KEY, []));
  }, []);

  /* ═══════════════════════════════════════════════════════════
   *  APPLY prefs to the DOM whenever they change
   * ═══════════════════════════════════════════════════════════ */

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const body = document.body;
    const root = document.documentElement;

    // ── CSS custom properties (typography) ─────────────────
    root.style.setProperty('--reader-font', prefs.font);
    root.style.setProperty('--reader-font-size', `${prefs.fontSize}px`);
    root.style.setProperty('--reader-font-weight', String(prefs.fontWeight));
    root.style.setProperty('--reader-letter-spacing', `${prefs.letterSpacing}px`);
    root.style.setProperty('--context-opacity', String(prefs.contextOpacity / 100));

    // ── Theme colors ──────────────────────────────────────
    const themeColors = THEMES[prefs.theme] || THEMES.dark;
    root.style.setProperty('--bg', themeColors.bg);
    root.style.setProperty('--bg-surface', themeColors.bgSurface);
    root.style.setProperty('--text', themeColors.text);
    root.style.setProperty('--text-dim', themeColors.textDim);
    root.style.setProperty('--border', themeColors.border);
    root.style.setProperty('--surface', themeColors.surface);
    root.style.setProperty('--guide', themeColors.guide);
    root.style.setProperty('--badge', themeColors.badge);

    // ── ORP color ─────────────────────────────────────────
    const orpColors = ORP_COLORS[prefs.orp] || ORP_COLORS.red;
    root.style.setProperty('--orp', orpColors.color);
    root.style.setProperty('--orp-glow', orpColors.glow);

    // ── Data attributes ───────────────────────────────────
    body.setAttribute('data-theme', prefs.theme);
    body.setAttribute('data-orp', prefs.orp);
    body.setAttribute('data-focus', prefs.focus);

    // ── Accessibility class names ─────────────────────────
    body.classList.toggle('reduced-motion', !!prefs.reduceMotion);
    body.classList.toggle('high-contrast', !!prefs.highContrast);
    body.classList.toggle('dyslexia-mode', !!prefs.dyslexia);
  }, [prefs]);

  /* ═══════════════════════════════════════════════════════════
   *  SET A SINGLE PREFERENCE
   * ═══════════════════════════════════════════════════════════ */

  const setPref = useCallback((key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      storageSet(PREFS_KEY, next);
      return next;
    });
  }, []);

  /* ═══════════════════════════════════════════════════════════
   *  RECENT TEXTS
   * ═══════════════════════════════════════════════════════════ */

  const saveRecent = useCallback((text, wpm) => {
    setRecentTexts((prev) => {
      // Derive a title from the first line / first N chars
      const firstLine = text.split('\n').find((l) => l.trim()) || '';
      const title = firstLine.slice(0, 60).trim() || 'Untitled';

      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title,
        preview: text.slice(0, 120).replace(/\n/g, ' '),
        text,
        wpm,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        timestamp: Date.now(),
      };

      // Remove duplicate by title, add to front, cap at MAX_RECENT
      const deduped = prev.filter((r) => r.title !== title);
      const next = [entry, ...deduped].slice(0, MAX_RECENT);
      storageSet(RECENT_KEY, next);
      return next;
    });
  }, []);

  const loadRecentText = useCallback((title) => {
    const recents = storageGet(RECENT_KEY, []);
    const match = recents.find((r) => r.title === title);
    return match ? match.text : null;
  }, []);

  /* ═══════════════════════════════════════════════════════════
   *  NOTES
   * ═══════════════════════════════════════════════════════════ */

  const addNote = useCallback((note) => {
    setNotes((prev) => {
      // Preserve the full note object from ReaderScreen (id, wordIdx, word, context, timestamp)
      const entry = typeof note === 'string'
        ? { id: Date.now(), word: null, context: [], text: note, timestamp: new Date().toISOString() }
        : { ...note };
      const next = [entry, ...prev];
      storageSet(NOTES_KEY, next);
      return next;
    });
  }, []);

  const deleteNote = useCallback((id) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      storageSet(NOTES_KEY, next);
      return next;
    });
  }, []);

  const exportNotes = useCallback(() => {
    const lines = notes.map((n) => {
      const date = new Date(n.timestamp).toLocaleString();
      const ctx = n.word ? ` [at "${n.word}"]` : '';
      return `[${date}]${ctx}\n${n.text}\n`;
    });
    return lines.join('\n---\n\n');
  }, [notes]);

  /* ═══════════════════════════════════════════════════════════ */

  return {
    prefs,
    setPref,
    recentTexts,
    saveRecent,
    loadRecentText,
    notes,
    addNote,
    deleteNote,
    exportNotes,
  };
}
