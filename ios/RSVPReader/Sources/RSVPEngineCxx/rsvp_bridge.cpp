#include "rsvp_engine.hpp"
#include "rsvp_bridge.h"

/* ── Internal wrapper holding the engine + user callbacks ─────────────────── */

struct rsvp_handle {
    rsvp::Engine  engine;
    rsvp_token_cb token_cb  = nullptr;
    void*         token_ctx = nullptr;
    rsvp_state_cb state_cb  = nullptr;
    void*         state_ctx = nullptr;
    rsvp_done_cb  done_cb   = nullptr;
    void*         done_ctx  = nullptr;
};

/* ── Lifecycle ────────────────────────────────────────────────────────────── */

extern "C" void* rsvp_create(void) {
    auto* h = new rsvp_handle();
    return static_cast<void*>(h);
}

extern "C" void rsvp_destroy(void* engine) {
    if (!engine) return;
    auto* h = static_cast<rsvp_handle*>(engine);
    h->engine.stop();
    delete h;
}

/* ── Playback control ─────────────────────────────────────────────────────── */

extern "C" void rsvp_load(void* engine, const char* text, int wpm) {
    if (!engine || !text) return;
    auto* h = static_cast<rsvp_handle*>(engine);
    h->engine.load(std::string(text), wpm);
}

extern "C" void rsvp_play(void* engine) {
    if (!engine) return;
    static_cast<rsvp_handle*>(engine)->engine.play();
}

extern "C" void rsvp_pause(void* engine) {
    if (!engine) return;
    static_cast<rsvp_handle*>(engine)->engine.pause();
}

extern "C" void rsvp_toggle(void* engine) {
    if (!engine) return;
    static_cast<rsvp_handle*>(engine)->engine.toggle();
}

extern "C" void rsvp_seek(void* engine, int delta) {
    if (!engine) return;
    static_cast<rsvp_handle*>(engine)->engine.seek(delta);
}

/* ── WPM ──────────────────────────────────────────────────────────────────── */

extern "C" void rsvp_set_wpm(void* engine, int wpm) {
    if (!engine) return;
    static_cast<rsvp_handle*>(engine)->engine.set_wpm(wpm);
}

extern "C" int rsvp_get_wpm(void* engine) {
    if (!engine) return 300;
    return static_cast<rsvp_handle*>(engine)->engine.wpm();
}

/* ── Progress ─────────────────────────────────────────────────────────────── */

extern "C" float rsvp_progress(void* engine) {
    if (!engine) return 0.0f;
    return static_cast<rsvp_handle*>(engine)->engine.progress();
}

/* ── Callbacks ────────────────────────────────────────────────────────────── */

extern "C" void rsvp_set_on_token(void* engine, rsvp_token_cb cb, void* ctx) {
    if (!engine) return;
    auto* h = static_cast<rsvp_handle*>(engine);
    h->token_cb  = cb;
    h->token_ctx = ctx;

    if (cb) {
        h->engine.on_token = [h](const rsvp::Token& tok, size_t /*idx*/, size_t /*total*/) {
            h->token_cb(h->token_ctx,
                        tok.before.c_str(),
                        tok.orp.c_str(),
                        tok.after.c_str(),
                        tok.punct.c_str(),
                        tok.dur_ms,
                        tok.sentence_end ? 1 : 0);
        };
    } else {
        h->engine.on_token = nullptr;
    }
}

extern "C" void rsvp_set_on_state(void* engine, rsvp_state_cb cb, void* ctx) {
    if (!engine) return;
    auto* h = static_cast<rsvp_handle*>(engine);
    h->state_cb  = cb;
    h->state_ctx = ctx;

    if (cb) {
        h->engine.on_state = [h](rsvp::State s) {
            h->state_cb(h->state_ctx, static_cast<int>(s));
        };
    } else {
        h->engine.on_state = nullptr;
    }
}

extern "C" void rsvp_set_on_done(void* engine, rsvp_done_cb cb, void* ctx) {
    if (!engine) return;
    auto* h = static_cast<rsvp_handle*>(engine);
    h->done_cb  = cb;
    h->done_ctx = ctx;

    if (cb) {
        h->engine.on_done = [h]() {
            h->done_cb(h->done_ctx);
        };
    } else {
        h->engine.on_done = nullptr;
    }
}
