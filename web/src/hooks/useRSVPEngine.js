'use client';
import { useRef, useCallback, useEffect } from 'react';
import RSVPEngine from '@/engine/rsvp-engine';

/**
 * useRSVPEngine — manages a single RSVPEngine instance across renders.
 *
 * Returns stable callbacks that delegate to the engine.
 * Does NOT own any UI state — the consuming component should wire
 * engine.onToken / engine.onState / engine.onDone to its own state.
 */
export default function useRSVPEngine() {
  const engineRef = useRef(null);

  // Lazily create the engine on first access
  if (!engineRef.current) {
    engineRef.current = new RSVPEngine();
  }

  const engine = engineRef.current;

  /* ── Stable API wrappers ───────────────────────────────── */

  const load = useCallback((text, wpm) => {
    engine.load(text, wpm);
  }, [engine]);

  const play = useCallback(() => {
    engine.play();
  }, [engine]);

  const pause = useCallback(() => {
    engine.pause();
  }, [engine]);

  const toggle = useCallback(() => {
    engine.toggle();
  }, [engine]);

  const stop = useCallback(() => {
    engine.stop();
  }, [engine]);

  const seek = useCallback((delta) => {
    engine.seek(delta);
  }, [engine]);

  const setWpm = useCallback((wpm) => {
    engine.setWpm(wpm);
  }, [engine]);

  const setChunkMode = useCallback((enabled) => {
    engine.setChunkMode(enabled);
  }, [engine]);

  /* ── Cleanup on unmount ────────────────────────────────── */

  useEffect(() => {
    return () => {
      engine.stop();
    };
  }, [engine]);

  return {
    engine,
    load,
    play,
    pause,
    toggle,
    stop,
    seek,
    setWpm,
    setChunkMode,
  };
}
