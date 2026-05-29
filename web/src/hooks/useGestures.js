'use client';
import { useEffect, useRef, useCallback } from 'react';
import { GESTURES } from '@/lib/constants';

/**
 * useGestures — unified touch + keyboard gesture handling.
 *
 * @param {React.RefObject} ref — element to attach pointer listeners to
 * @param {Object} handlers — { onTap, onDoubleTap, onTripleTap, onLongPress,
 *   onHorizontalDrag, onVerticalDrag, onDragEnd, onDiagonalSwipe, onPinch }
 * @param {Object} options — { enabled: true, keyboard: false }
 */
export default function useGestures(ref, handlers, options = {}) {
  const { enabled = true, keyboard = false } = options;

  // Keep handlers in a ref so the effect closure always sees the latest
  const h = useRef(handlers);
  h.current = handlers;

  /* ═══════════════════════════════════════════════════════════
   *  POINTER EVENTS
   * ═══════════════════════════════════════════════════════════ */

  useEffect(() => {
    const el = ref?.current;
    if (!el || !enabled) return;

    // ── State ──────────────────────────────────────────────
    let pointers = new Map();        // pointerId → { x, y, time }
    let startX = 0, startY = 0;
    let startTime = 0;
    let longPressTimer = null;
    let tapTimer = null;
    let tapCount = 0;
    let isDragging = false;
    let dragAxis = null;             // 'x' | 'y' | null
    let lastMoveX = 0, lastMoveY = 0;
    let lastMoveTime = 0;
    let velocityX = 0, velocityY = 0;
    let longPressFired = false;
    let initialPinchDist = null;

    // ── Helpers ────────────────────────────────────────────

    function isIgnored(e) {
      const t = e.target;
      if (!t) return false;
      return t.closest('.reader-btn, .panel-btn, button, a, input, textarea, select') !== null;
    }

    function dist(x1, y1, x2, y2) {
      return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    function angleDeg(dx, dy) {
      // Returns 0–360, 0 = right, 90 = down
      const rad = Math.atan2(dy, dx);
      return ((rad * 180 / Math.PI) + 360) % 360;
    }

    function pinchDistance() {
      if (pointers.size < 2) return null;
      const pts = Array.from(pointers.values());
      return dist(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
    }

    function clearLongPress() {
      if (longPressTimer !== null) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }

    function clearTapTimer() {
      if (tapTimer !== null) {
        clearTimeout(tapTimer);
        tapTimer = null;
      }
    }

    // ── Pointer Down ───────────────────────────────────────

    function onPointerDown(e) {
      if (isIgnored(e)) return;

      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, time: Date.now() });

      try { el.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }

      // Two-pointer → pinch start
      if (pointers.size === 2) {
        clearLongPress();
        initialPinchDist = pinchDistance();
        return;
      }

      // Single pointer start
      if (pointers.size === 1) {
        startX = e.clientX;
        startY = e.clientY;
        startTime = Date.now();
        lastMoveX = e.clientX;
        lastMoveY = e.clientY;
        lastMoveTime = startTime;
        velocityX = 0;
        velocityY = 0;
        isDragging = false;
        dragAxis = null;
        longPressFired = false;

        // Start long-press timer
        clearLongPress();
        longPressTimer = setTimeout(() => {
          if (!isDragging && pointers.size === 1) {
            longPressFired = true;
            if (h.current.onLongPress) h.current.onLongPress();
          }
        }, GESTURES.LONG_PRESS_MS);
      }
    }

    // ── Pointer Move ───────────────────────────────────────

    function onPointerMove(e) {
      if (!pointers.has(e.pointerId)) return;

      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, time: Date.now() });

      // Pinch
      if (pointers.size >= 2 && initialPinchDist !== null) {
        const d = pinchDistance();
        if (d !== null && h.current.onPinch) {
          h.current.onPinch(d / initialPinchDist);
        }
        return;
      }

      // Single-pointer drag
      if (pointers.size !== 1) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const d = dist(startX, startY, e.clientX, e.clientY);

      // Determine drag axis once threshold is crossed
      if (!isDragging && d >= GESTURES.DRAG_THRESHOLD) {
        isDragging = true;
        clearLongPress();
        dragAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }

      if (!isDragging) return;

      // Compute velocity
      const now = Date.now();
      const dt = now - lastMoveTime;
      if (dt > 0) {
        velocityX = (e.clientX - lastMoveX) / dt;
        velocityY = (e.clientY - lastMoveY) / dt;
      }
      lastMoveX = e.clientX;
      lastMoveY = e.clientY;
      lastMoveTime = now;

      if (dragAxis === 'x' && h.current.onHorizontalDrag) {
        h.current.onHorizontalDrag(dx, velocityX);
      } else if (dragAxis === 'y' && h.current.onVerticalDrag) {
        h.current.onVerticalDrag(dy, velocityY);
      }
    }

    // ── Pointer Up ─────────────────────────────────────────

    function onPointerUp(e) {
      pointers.delete(e.pointerId);

      try { el.releasePointerCapture(e.pointerId); } catch (_) { /* noop */ }

      clearLongPress();

      // If pointers remain (pinch ending) — reset pinch baseline
      if (pointers.size >= 1) {
        initialPinchDist = null;
        return;
      }

      // All pointers lifted
      initialPinchDist = null;

      // Was it a drag?
      if (isDragging) {
        // Check for diagonal swipe (↘ direction: 20-70 degrees)
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const d = dist(startX, startY, e.clientX, e.clientY);
        const angle = angleDeg(dx, dy);

        if (d > 30 && angle >= 20 && angle <= 70 && h.current.onDiagonalSwipe) {
          h.current.onDiagonalSwipe({ dx, dy, angle, distance: d });
        }

        if (h.current.onDragEnd) {
          h.current.onDragEnd(dragAxis, dragAxis === 'x' ? velocityX : velocityY);
        }

        isDragging = false;
        dragAxis = null;
        return;
      }

      // Long press already fired — skip tap
      if (longPressFired) return;

      // Tap detection
      const elapsed = Date.now() - startTime;
      const travelDist = dist(startX, startY, e.clientX, e.clientY);

      if (elapsed > GESTURES.TAP_MAX_MS || travelDist > GESTURES.TAP_MAX_DIST) return;

      tapCount++;
      clearTapTimer();

      tapTimer = setTimeout(() => {
        const count = tapCount;
        tapCount = 0;

        if (count >= 3 && h.current.onTripleTap) {
          h.current.onTripleTap();
        } else if (count === 2 && h.current.onDoubleTap) {
          h.current.onDoubleTap();
        } else if (count === 1 && h.current.onTap) {
          h.current.onTap();
        }
      }, GESTURES.MULTI_TAP_WINDOW);
    }

    // ── Pointer Cancel ─────────────────────────────────────

    function onPointerCancel(e) {
      pointers.delete(e.pointerId);
      clearLongPress();
      clearTapTimer();
      isDragging = false;
      dragAxis = null;
      initialPinchDist = null;
    }

    // ── Attach ─────────────────────────────────────────────

    el.addEventListener('pointerdown', onPointerDown, { passive: true });
    el.addEventListener('pointermove', onPointerMove, { passive: true });
    el.addEventListener('pointerup', onPointerUp, { passive: true });
    el.addEventListener('pointercancel', onPointerCancel, { passive: true });

    // Prevent context menu on long press
    function preventCtx(e) { e.preventDefault(); }
    el.addEventListener('contextmenu', preventCtx);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerCancel);
      el.removeEventListener('contextmenu', preventCtx);
      clearLongPress();
      clearTapTimer();
    };
  }, [ref, enabled]);

  /* ═══════════════════════════════════════════════════════════
   *  KEYBOARD SHORTCUTS
   * ═══════════════════════════════════════════════════════════ */

  useEffect(() => {
    if (!enabled || !keyboard) return;

    function onKeyDown(e) {
      // Don't intercept when user is typing in an input
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.target?.isContentEditable) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (h.current.onTap) h.current.onTap();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (h.current.onSeek) h.current.onSeek(-GESTURES.SEEK_DELTA);
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (h.current.onSeek) h.current.onSeek(GESTURES.SEEK_DELTA);
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (h.current.onSpeedChange) h.current.onSpeedChange(GESTURES.SPEED_DELTA);
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (h.current.onSpeedChange) h.current.onSpeedChange(-GESTURES.SPEED_DELTA);
          break;

        case 'Escape':
          e.preventDefault();
          if (h.current.onBack) h.current.onBack();
          break;

        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (h.current.onFullscreen) h.current.onFullscreen();
          }
          break;

        case '1':
          e.preventDefault();
          if (h.current.onModeSwitch) h.current.onModeSwitch(0);
          break;

        case '2':
          e.preventDefault();
          if (h.current.onModeSwitch) h.current.onModeSwitch(1);
          break;

        case '3':
          e.preventDefault();
          if (h.current.onModeSwitch) h.current.onModeSwitch(2);
          break;

        case 'm':
        case 'M':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (h.current.onCycleFocus) h.current.onCycleFocus();
          }
          break;

        case 'n':
        case 'N':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (h.current.onToggleNotes) h.current.onToggleNotes();
          }
          break;

        case 's':
        case 'S':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (h.current.onToggleSettings) h.current.onToggleSettings();
          }
          break;

        default:
          break;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, keyboard]);
}
