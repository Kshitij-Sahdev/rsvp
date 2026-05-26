# AGENTS.md — RSVP Reader

Every agent working in this repo reads this file first. It is the source of truth for architecture decisions, constraints, and how to move safely.

---

## What this project is

Cross-platform RSVP (Rapid Serial Visual Presentation) speed-reading app.
- Android: Jetpack Compose + Kotlin, C++ via JNI
- iOS: SwiftUI + Swift, C++ via direct Swift/C++ interop (Swift 5.9+)
- Desktop: Qt 6 + C++ (Windows, macOS, Linux)

**The C++ engine in `core/rsvp_engine.hpp` is the single source of truth for all reading logic.** Never re-implement tokenisation, ORP calculation, or timing logic in Kotlin/Swift/Qt. Always call the engine.

---

## Hard rules — never break these

1. **`core/rsvp_engine.hpp` is header-only, zero external dependencies.** No Boost, no ICU, no third-party headers. stdlib only.
2. **`on_token` fires on the engine's timer thread.** Every platform bridge MUST dispatch to the UI thread before touching any UI. Android: `Handler.post`. iOS: `DispatchQueue.main.async`. Qt: `QMetaObject::invokeMethod(..., Qt::QueuedConnection)`.
3. **C++17 only.** No C++20 features. NDK and older Xcode toolchains may not support them.
4. **No shared state between platforms.** Each platform has its own Engine instance. No cross-platform IPC.
5. **UI code never touches timing math.** Duration, ORP index, sentence detection — all of that lives in the engine. UI only renders what it receives in `Token`.

---

## File ownership — what lives where

| Path | What it is | Change freely? |
|------|-----------|----------------|
| `core/rsvp_engine.hpp` | Tokeniser, ORP, timing, playback thread | Yes, but run tests |
| `android/.../android_bridge.cpp` | JNI glue only, no logic | Yes |
| `android/.../RSVPEngine.kt` | Kotlin wrapper, JNI declarations | Yes |
| `android/.../ReaderActivity.kt` | Compose UI, gestures | Yes |
| `ios/.../RSVPEngine.swift` | Swift C++ wrapper | Yes |
| `ios/.../ReaderView.swift` | SwiftUI, gestures | Yes |
| `desktop/main.cpp` | Qt UI + direct engine calls | Yes |

---

## UI design spec (do not deviate)

Reference image: full black background, single serif word centred, one letter in red (the ORP), thin crosshair guide lines, WPM badge bottom-right in monospace. See `docs/ui-reference.png`.

- Background: `#0a0a0a`
- Word text: `#e8e4dc`, serif font (EB Garamond or system serif)
- ORP letter: `#c0392b`
- Guide lines: `rgba(255,255,255,0.06)`
- WPM badge: monospace, `rgba(255,255,255,0.22)`
- No rounded cards, no bottom sheets, no hamburger menus in the reader screen

---

## Touch gesture contract (Android + iOS)

These gestures are fixed. Do not change them without updating both platforms.

| Gesture | Action |
|---------|--------|
| Tap | play / pause |
| Swipe left | skip +8 words |
| Swipe right | skip −8 words |
| Swipe up | speed +25 WPM |
| Swipe down | speed −25 WPM |
| Long press (600ms) | back to text input |

---

## Adding a feature — checklist

1. Does it affect reading logic (timing, tokenisation, ORP)? → modify engine first, then update bridges.
2. Does it affect UI only? → modify the platform file only.
3. Does it add a new Engine method? → add to `core/rsvp_engine.hpp`, then expose in all three bridges.
4. Update `README.md` if the public API changes.

---

## What NOT to do

- Do not add platform-specific reading logic that bypasses the engine
- Do not use `new`/`delete` raw in the engine — use RAII
- Do not store `JNIEnv*` across threads — always attach/detach
- Do not ship with `Request review` policy disabled — keep human-in-the-loop for terminal commands
- Do not add dependencies to `core/` — it must stay zero-dep

---

## Parallel agent suggestions (Agent Manager)

These tasks are safe to run in parallel because they touch different files:

- Agent 1: Android UI changes (`ReaderActivity.kt`)
- Agent 2: iOS UI changes (`ReaderView.swift`)
- Agent 3: Engine improvements (`rsvp_engine.hpp`)
- Agent 4: Desktop Qt UI (`desktop/main.cpp`)

Agents should NOT run in parallel on the same file.
