#ifndef RSVP_BRIDGE_H
#define RSVP_BRIDGE_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* ── Callback signatures ──────────────────────────────────────────────────── */

typedef void (*rsvp_token_cb)(void* ctx,
                              const char* before,
                              const char* orp,
                              const char* after,
                              const char* punct,
                              uint32_t    dur_ms,
                              int         sentence_end);

typedef void (*rsvp_state_cb)(void* ctx, int state);
typedef void (*rsvp_done_cb)(void* ctx);

/* ── Lifecycle ────────────────────────────────────────────────────────────── */

void* rsvp_create(void);
void  rsvp_destroy(void* engine);

/* ── Playback control ─────────────────────────────────────────────────────── */

void  rsvp_load(void* engine, const char* text, int wpm);
void  rsvp_play(void* engine);
void  rsvp_pause(void* engine);
void  rsvp_toggle(void* engine);
void  rsvp_seek(void* engine, int delta);

/* ── WPM ──────────────────────────────────────────────────────────────────── */

void  rsvp_set_wpm(void* engine, int wpm);
int   rsvp_get_wpm(void* engine);

/* ── Progress ─────────────────────────────────────────────────────────────── */

float rsvp_progress(void* engine);

/* ── Callbacks ────────────────────────────────────────────────────────────── */

void  rsvp_set_on_token(void* engine, rsvp_token_cb cb, void* ctx);
void  rsvp_set_on_state(void* engine, rsvp_state_cb cb, void* ctx);
void  rsvp_set_on_done(void* engine, rsvp_done_cb  cb, void* ctx);

#ifdef __cplusplus
}
#endif

#endif /* RSVP_BRIDGE_H */
