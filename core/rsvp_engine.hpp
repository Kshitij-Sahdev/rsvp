#pragma once
#include <string>
#include <vector>
#include <functional>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <atomic>
#include <chrono>
#include <cctype>
#include <algorithm>

namespace rsvp {

// Everything the UI needs to draw one word.
struct Token {
    std::string before;       // text before the red letter
    std::string orp;          // the red letter (single char)
    std::string after;        // rest of the word
    std::string punct;        // trailing . , ! shown dimly
    uint32_t    dur_ms;       // how long to show it
    bool        sentence_end; // .!? — already baked into dur_ms
};

enum class State { Idle, Playing, Paused, Done };

// ── helpers ───────────────────────────────────────────────────────────────────

// ORP = Optimal Recognition Point, ~35% into the word.
// Returns byte index inside the string.
static int orp_index(const std::string& w) {
    int len = 0, first = -1;
    for (int i = 0; i < (int)w.size(); i++) {
        if (std::isalpha((unsigned char)w[i])) {
            if (first < 0) first = i;
            len++;
        }
    }
    if (len == 0 || first < 0) return 0;
    // position table: words up to 1, 5, 9, 13 chars → ORP at 0,1,2,3; else 4
    int pos = (len <= 1) ? 0 : (len <= 5) ? 1 : (len <= 9) ? 2 : (len <= 13) ? 3 : 4;
    int count = 0;
    for (int i = first; i < (int)w.size(); i++) {
        if (std::isalpha((unsigned char)w[i])) {
            if (count == pos) return i;
            count++;
        }
    }
    return first;
}

// Display duration in ms based on WPM and word complexity.
static uint32_t word_dur(const std::string& w, int wpm, bool sent_end) {
    float base  = 60000.f / (float)wpm;
    float scale = 1.f;
    int   len   = (int)w.size();

    if (len >  8) scale = 1.15f;
    if (len > 13) scale = 1.30f;

    // numbers and mid-word caps (proper nouns) get a small bonus
    for (int i = 1; i < len; i++) {
        if (std::isdigit((unsigned char)w[i])) { scale *= 1.20f; break; }
        if (std::isupper((unsigned char)w[i])) { scale *= 1.10f; break; }
    }
    if (sent_end) scale *= 1.60f;  // natural pause at sentence boundary

    return std::clamp((uint32_t)(base * scale), 50u, 2000u);
}

// Turn a plain-text string into a list of Tokens.
static std::vector<Token> tokenise(const std::string& text, int wpm) {
    std::vector<Token> out;
    out.reserve(text.size() / 5);

    size_t i = 0, n = text.size();
    while (i < n) {
        while (i < n && std::isspace((unsigned char)text[i])) i++;
        if (i >= n) break;

        size_t start = i;
        while (i < n && !std::isspace((unsigned char)text[i])) i++;
        std::string raw = text.substr(start, i - start);
        if (raw.empty()) continue;

        // peel trailing punctuation for the dim suffix
        size_t end = raw.size();
        while (end > 0 && std::ispunct((unsigned char)raw[end - 1])) end--;
        std::string clean = raw.substr(0, end);
        std::string trail = raw.substr(end);
        if (clean.empty()) clean = raw;

        bool sent_end = !trail.empty() &&
            (trail.back() == '.' || trail.back() == '!' ||
             trail.back() == '?' || trail.back() == ';');

        int oi = orp_index(clean);

        Token t;
        t.before       = clean.substr(0, oi);
        t.orp          = clean.substr(oi, 1);
        t.after        = (oi + 1 < (int)clean.size()) ? clean.substr(oi + 1) : "";
        t.punct        = trail;
        t.sentence_end = sent_end;
        t.dur_ms       = word_dur(clean, wpm, sent_end);
        out.push_back(std::move(t));
    }
    return out;
}

// ── Engine ────────────────────────────────────────────────────────────────────
// Thread-safe. Drives its own timer thread.
// Usage: set callbacks → load() → play()
//
// IMPORTANT: on_token fires on the timer thread.
//   Android → Handler.post to UI thread
//   iOS     → DispatchQueue.main.async
//   Qt      → QMetaObject::invokeMethod with Qt::QueuedConnection
class Engine {
public:
    std::function<void(const Token&, size_t idx, size_t total)> on_token;
    std::function<void(State)>  on_state;
    std::function<void()>       on_done;

    Engine()  = default;
    ~Engine() { stop(); }

    Engine(const Engine&)            = delete;
    Engine& operator=(const Engine&) = delete;

    void load(const std::string& text, int wpm = 300) {
        stop();
        std::lock_guard<std::mutex> lk(mu_);
        wpm_   = wpm;
        toks_  = tokenise(text, wpm);
        cur_   = 0;
        state_ = State::Idle;
    }

    void play() {
        {
            std::lock_guard<std::mutex> lk(mu_);
            if (toks_.empty())            return;
            if (state_ == State::Playing) return;
            if (state_ == State::Done)    cur_ = 0;
            state_ = State::Playing;
        }
        emit_state(State::Playing);
        start_thread();
        cv_.notify_all();
    }

    void pause() {
        {
            std::lock_guard<std::mutex> lk(mu_);
            if (state_ != State::Playing) return;
            state_ = State::Paused;
        }
        cv_.notify_all();
        emit_state(State::Paused);
    }

    void toggle() { state_ == State::Playing ? pause() : play(); }

    void stop() {
        { std::lock_guard<std::mutex> lk(mu_); quit_ = true; state_ = State::Idle; }
        cv_.notify_all();
        if (th_.joinable()) th_.join();
        quit_ = false;
    }

    // +n forward, -n backward
    void seek(int delta) {
        std::lock_guard<std::mutex> lk(mu_);
        int n = std::clamp((int)cur_ + delta, 0, (int)toks_.size() - 1);
        cur_  = (size_t)n;
    }

    // Live speed change — recomputes remaining durations immediately
    void set_wpm(int wpm) {
        std::lock_guard<std::mutex> lk(mu_);
        wpm_ = std::clamp(wpm, 60, 1200);
        for (size_t i = cur_; i < toks_.size(); i++) {
            toks_[i].dur_ms = word_dur(
                toks_[i].before + toks_[i].orp + toks_[i].after,
                wpm_, toks_[i].sentence_end);
        }
    }

    int    wpm()      const { return wpm_; }
    State  state()    const { return state_.load(); }
    size_t cur()      const { return cur_; }
    size_t total()    const { return toks_.size(); }
    float  progress() const {
        return toks_.empty() ? 0.f : (float)cur_ / (float)toks_.size();
    }

private:
    void start_thread() {
        if (!th_.joinable()) {
            quit_ = false;
            th_   = std::thread([this]{ loop(); });
        }
    }

    void loop() {
        while (true) {
            size_t   idx;
            uint32_t dur;

            {
                std::unique_lock<std::mutex> lk(mu_);
                cv_.wait(lk, [&]{ return quit_ || state_ == State::Playing; });
                if (quit_) return;

                if (cur_ >= toks_.size()) {
                    state_ = State::Done;
                    lk.unlock();
                    emit_state(State::Done);
                    if (on_done) on_done();
                    lk.lock();
                    cv_.wait(lk, [&]{ return quit_ || state_ == State::Playing; });
                    if (quit_) return;
                    continue;
                }
                idx = cur_;
                dur = toks_[cur_].dur_ms;
            }

            if (on_token) on_token(toks_[idx], idx, toks_.size());

            {
                std::unique_lock<std::mutex> lk(mu_);
                // sleep for dur, but wake early if paused/stopped
                cv_.wait_for(lk, std::chrono::milliseconds(dur),
                             [&]{ return quit_ || state_ != State::Playing; });
                if (quit_) return;
                if (state_ == State::Playing) cur_++;
            }
        }
    }

    void emit_state(State s) { if (on_state) on_state(s); }

    std::vector<Token>      toks_;
    size_t                  cur_   = 0;
    int                     wpm_   = 300;
    std::atomic<State>      state_ { State::Idle };
    std::thread             th_;
    std::mutex              mu_;
    std::condition_variable cv_;
    bool                    quit_  = false;
};

} // namespace rsvp
