/*
 * rsvp_bridge.h
 * C-compatible wrapper around rsvp::Engine.
 *
 * Why this exists:
 *   Swift 5.9+ C++ interop cannot import std::function.
 *   This shim exposes the engine through C function pointers
 *   with void* context, which Swift can consume directly.
 *
 * Used by: iOS (Swift C++ interop)
 * NOT used by: Android (uses JNI), Desktop Qt (uses C++ directly)
 */

#ifndef RSVP_BRIDGE_H
#define RSVP_BRIDGE_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* ── Callback typedefs ─────────────────────────────────────────────────────── */

/*
 * Token callback — fires on the engine's timer thread.
 * Params:
 *   ctx         — opaque pointer passed back to the caller
 *   before      — text before the ORP letter (UTF-8)
 *   orp         — the ORP letter itself (single char, UTF-8)
 *   after       — text after the ORP letter (UTF-8)
 *   punct       — trailing punctuation (UTF-8)
 *   idx         — current word index (0-based)
 *   total       — total word count
 *   dur_ms      — display duration in milliseconds
 *   sentence_end — 1 if this token ends a sentence, 0 otherwise
 */
typedef void (*rsvp_token_cb)(void* ctx,
                              const char* before,
                              const char* orp,
                              const char* after,
                              const char* punct,
                              uint32_t idx,
                              uint32_t total,
                              uint32_t dur_ms,
                              int sentence_end);

/*
 * State callback — fires when playback state changes.
 * state values: 0 = Idle, 1 = Playing, 2 = Paused, 3 = Done
 */
typedef void (*rsvp_state_cb)(void* ctx, int state);

/* Done callback — fires when playback reaches the end. */
typedef void (*rsvp_done_cb)(void* ctx);

/* ── Lifecycle ─────────────────────────────────────────────────────────────── */

/* Create a new engine instance. Returns opaque pointer. */
void* rsvp_create(void);

/* Destroy an engine instance. Safe to call with NULL. */
void  rsvp_destroy(void* engine);

/* ── Playback ──────────────────────────────────────────────────────────────── */

/* Load text and set initial WPM. Stops any current playback. */
void  rsvp_load(void* engine, const char* text, int wpm);

/* Start playback. */
void  rsvp_play(void* engine);

/* Pause playback. */
void  rsvp_pause(void* engine);

/* Toggle between play and pause. */
void  rsvp_toggle(void* engine);

/* Seek by delta words (+n forward, -n backward). */
void  rsvp_seek(void* engine, int delta);

/* ── Speed / Progress ──────────────────────────────────────────────────────── */

/* Set WPM (clamped to 60–1200 by the engine). */
void  rsvp_set_wpm(void* engine, int wpm);

/* Get current WPM. */
int   rsvp_get_wpm(void* engine);

/* Get progress as 0.0–1.0. */
float rsvp_progress(void* engine);

/* Get current word index. */
uint32_t rsvp_cur(void* engine);

/* Get total word count. */
uint32_t rsvp_total(void* engine);

/* ── Callbacks ─────────────────────────────────────────────────────────────── */

/* Register token callback. Pass NULL to unregister. */
void  rsvp_set_on_token(void* engine, rsvp_token_cb cb, void* ctx);

/* Register state-change callback. Pass NULL to unregister. */
void  rsvp_set_on_state(void* engine, rsvp_state_cb cb, void* ctx);

/* Register done callback. Pass NULL to unregister. */
void  rsvp_set_on_done(void* engine, rsvp_done_cb cb, void* ctx);

#ifdef __cplusplus
}
#endif

#endif /* RSVP_BRIDGE_H */
