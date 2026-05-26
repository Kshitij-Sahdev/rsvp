# RSVP Reader

Cross-platform speed reader. One C++ core, thin native UI on Android (Jetpack Compose) and iOS (SwiftUI), Qt on desktop.

## What it does

- Flashes words one at a time at the Optimal Recognition Point (ORP) — the red letter that anchors your eye
- TTS synced to the RSVP word stream
- Smart timing: longer pause on sentence ends, numbers, long words
- Touch gestures: tap = play/pause, swipe L/R = skip words, swipe U/D = change speed
- Read queue: save articles from share sheet, reads offline

---

## Project layout

```
rsvp_reader/
├── core/
│   ├── rsvp_engine.hpp      ← the whole engine, single header, no deps
│   └── CMakeLists.txt
│
├── android/
│   ├── app/src/main/
│   │   ├── cpp/
│   │   │   ├── android_bridge.cpp   ← JNI glue
│   │   │   └── CMakeLists.txt
│   │   └── kotlin/com/yourapp/rsvp/
│   │       ├── RSVPEngine.kt        ← Kotlin wrapper
│   │       └── ReaderActivity.kt   ← Compose UI
│   └── build.gradle
│
├── ios/
│   └── RSVPReader/
│       ├── RSVPEngine.swift         ← Swift wrapper (direct C++ interop)
│       └── ReaderView.swift         ← SwiftUI
│
├── desktop/
│   ├── main.cpp                     ← Qt entry + UI
│   └── CMakeLists.txt
│
├── .agents/                         ← Antigravity agent config (READ THIS)
│   ├── rules/
│   │   ├── architecture.md
│   │   └── cpp-style.md
│   ├── skills/
│   │   ├── engine-internals.md
│   │   ├── android-jni.md
│   │   └── ios-interop.md
│   └── workflows/
│       ├── add-feature.md
│       ├── port-to-platform.md
│       └── fix-timing-bug.md
│
└── AGENTS.md                        ← top-level agent brief
```

---

## Building

### Prerequisites

| Platform | Needs |
|----------|-------|
| Android  | Android Studio, NDK r25+, CMake 3.22+ |
| iOS      | Xcode 15+, Swift 5.9+ (for C++ interop) |
| Desktop  | Qt 6.5+, CMake 3.22+, C++17 compiler |

### Core (shared, no build needed)
`core/rsvp_engine.hpp` is header-only. Every platform just includes it.

### Android
```bash
cd android
./gradlew assembleDebug
```

### iOS
Open `ios/RSVPReader.xcodeproj` in Xcode, select a simulator, hit Run.

### Desktop
```bash
cd desktop
cmake -B build -DCMAKE_PREFIX_PATH=/path/to/Qt6
cmake --build build
./build/rsvp_reader
```

---

## How the engine works (quick ref)

1. `rsvp::Engine::load(text, wpm)` — tokenises text, computes ORP + durations
2. `engine.play()` — starts internal timer thread
3. Timer fires `on_token(Token, idx, total)` for each word — **this fires on the timer thread, dispatch to UI thread yourself**
4. `Token` has: `before`, `orp` (red letter), `after`, `punct`, `dur_ms`
5. `engine.set_wpm(n)` — live speed change, recomputes remaining durations
6. `engine.seek(±n)` — jump words
7. `engine.toggle()` — play/pause

---

## Antigravity setup

1. Install Antigravity from https://antigravity.google/download
2. Open this folder as a workspace (`agy .` or File → Open Folder)
3. Agents will auto-read `.agents/` — no extra config needed
4. Recommended autonomy mode: **Review-driven development**
5. For big tasks use Agent Manager (parallel agents). For quick fixes use Editor View inline.

See `AGENTS.md` for the full agent brief.
