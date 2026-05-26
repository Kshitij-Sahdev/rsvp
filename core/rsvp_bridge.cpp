/*
 * rsvp_bridge.cpp
 * Implementation of the C bridge for rsvp::Engine.
 *
 * Translates between C function pointers (+ void* context)
 * and the engine's std::function callbacks.
 */

#include "rsvp_bridge.h"
#include "rsvp_engine.hpp"

#include <string>

/* ── Internal wrapper holding engine + callback context ────────────────────── */

struct rsvp_handle {
    rsvp::Engine engine;

    rsvp_token_cb  token_cb  = nullptr;
    void*          token_ctx = nullptr;

    rsvp_state_cb  state_cb  = nullptr;
    void*          state_ctx = nullptr;

    rsvp_done_cb   done_cb   = nullptr;
    void*          done_ctx  = nullptr;
};

/* ── Helper: wire engine callbacks to the C function pointers ──────────────── */

static void wire_callbacks(rsvp_handle* h) {
    h->engine.on_token = [h](const rsvp::Token& t, size_t idx, size_t total) {
        if (h->token_cb) {
            h->token_cb(h->token_ctx,
                        t.before.c_str(),
                        t.orp.c_str(),
                        t.after.c_str(),
                        t.punct.c_str(),
                        (uint32_t)idx,
                        (uint32_t)total,
                        t.dur_ms,
                        t.sentence_end ? 1 : 0);
        }
    };

    h->engine.on_state = [h](rsvp::State s) {
        if (h->state_cb) {
            h->state_cb(h->state_ctx, (int)s);
        }
    };

    h->engine.on_done = [h]() {
        if (h->done_cb) {
            h->done_cb(h->done_ctx);
        }
    };
}

/* ── Lifecycle ─────────────────────────────────────────────────────────────── */

extern "C" {

void* rsvp_create(void) {
    auto* h = new rsvp_handle();
    wire_callbacks(h);
    return h;
}

void rsvp_destroy(void* engine) {
    if (!engine) return;
    auto* h = static_cast<rsvp_handle*>(engine);
    // Stop playback before destruction to avoid callback on deleted object
    h->engine.stop();
    delete h;
}

/* ── Playback ──────────────────────────────────────────────────────────────── */

void rsvp_load(void* engine, const char* text, int wpm) {
    if (!engine || !text) return;
    auto* h = static_cast<rsvp_handle*>(engine);
    h->engine.load(std::string(text), wpm);
}

void rsvp_play(void* engine) {
    if (!engine) return;
    static_cast<rsvp_handle*>(engine)->engine.play();
}

void rsvp_pause(void* engine) {
    if (!engine) return;
    static_cast<rsvp_handle*>(engine)->engine.pause();
}

void rsvp_toggle(void* engine) {
    if (!engine) return;
    static_cast<rsvp_handle*>(engine)->engine.toggle();
}

void rsvp_seek(void* engine, int delta) {
    if (!engine) return;
    static_cast<rsvp_handle*>(engine)->engine.seek(delta);
}

/* ── Speed / Progress ──────────────────────────────────────────────────────── */

void rsvp_set_wpm(void* engine, int wpm) {
    if (!engine) return;
    static_cast<rsvp_handle*>(engine)->engine.set_wpm(wpm);
}

int rsvp_get_wpm(void* engine) {
    if (!engine) return 300;
    return static_cast<rsvp_handle*>(engine)->engine.wpm();
}

float rsvp_progress(void* engine) {
    if (!engine) return 0.f;
    return static_cast<rsvp_handle*>(engine)->engine.progress();
}

uint32_t rsvp_cur(void* engine) {
    if (!engine) return 0;
    return (uint32_t)static_cast<rsvp_handle*>(engine)->engine.cur();
}

uint32_t rsvp_total(void* engine) {
    if (!engine) return 0;
    return (uint32_t)static_cast<rsvp_handle*>(engine)->engine.total();
}

/* ── Callbacks ─────────────────────────────────────────────────────────────── */

void rsvp_set_on_token(void* engine, rsvp_token_cb cb, void* ctx) {
    if (!engine) return;
    auto* h = static_cast<rsvp_handle*>(engine);
    h->token_cb  = cb;
    h->token_ctx = ctx;
    // Re-wire so the engine lambda picks up the new cb/ctx
    wire_callbacks(h);
}

void rsvp_set_on_state(void* engine, rsvp_state_cb cb, void* ctx) {
    if (!engine) return;
    auto* h = static_cast<rsvp_handle*>(engine);
    h->state_cb  = cb;
    h->state_ctx = ctx;
    wire_callbacks(h);
}

void rsvp_set_on_done(void* engine, rsvp_done_cb cb, void* ctx) {
    if (!engine) return;
    auto* h = static_cast<rsvp_handle*>(engine);
    h->done_cb  = cb;
    h->done_ctx = ctx;
    wire_callbacks(h);
}

} /* extern "C" */
