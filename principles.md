# Product Spec — Speed Reading / Teleprompter Supertool

## Product Identity

A premium cognitive tool for:

* speed reading
* focused comprehension
* teleprompting
* note capture
* flow-state learning

Feels:

* invisible
* fluid
* intelligent
* tactile
* cinematic

NOT:

* productivity clutter
* ebook reader clone
* generic utility app

Core philosophy:

```text id="k1xmxz"
User should feel thought itself is moving.
```

---

# Platforms

## Primary

* Android
* iOS

## Future

* Desktop via Qt/C++

---

# Design Language

## Visual Style

Minimal.
Dark-first.
Typography-first.

Inspired by:

* Matter
* Arc Browser
* Apple Music lyrics UI
* Notion cleanliness

---

# Core Principles

## Non-Negotiables

* No clutter
* No onboarding spam
* No visible complexity
* No frame drops
* Everything reversible
* One-handed usability
* Gesture-first interaction
* Continuous autosave
* Zero accidental exits

---

# App Flow

```text id="ap4pb0"
Launch
→ Import/Paste
→ Processing
→ Reader / Teleprompter
→ Notes / Stats
```

---

# Import System

## Inputs

* PDF
* EPUB
* TXT
* DOCX
* pasted text
* URLs/articles

---

# Reader Engine

## Modes

### 1. RSVP

One word/chunk at a time.

### 2. Flow Mode

Whole sentence faintly visible.

### 3. Teleprompter

Continuous auto-scroll.

---

# Reader Layout

```text id="o3v8om"
--------------------------------

progress hairline

        foCUs

faint prev/next context

--------------------------------
```

---

# ORP Rendering

Optimal Recognition Point highlighting.

Example:

```text id="yzt9i2"
deVELOPer
```

---

# Animation System

## Philosophy

Nothing snaps.
Everything interpolates.

Motion should:

* preserve focus
* communicate state
* feel physical

---

# Reader Transitions

## Word Changes

NOT:
hard replace.

USE:

* opacity interpolation
* slight vertical drift
* micro blur dissolve
* 80–120ms easing

---

# Physics

## Horizontal Scrubbing

Inspired by:
Instagram lyric scrolling.

Features:

* momentum
* elastic resistance
* inertial glide
* precision dragging

---

## Vertical Speed Modulation

Finger velocity changes temporary reading speed.

Release:
returns smoothly to baseline.

---

# Gesture System

| Gesture           | Action                     |
| ----------------- | -------------------------- |
| Vertical drag     | temporary speed modulation |
| Horizontal drag   | timeline scrub             |
| Long press        | pause                      |
| Double tap        | word ↔ phrase mode         |
| Triple tap        | cycle focus modes          |
| Pinch             | typography scale           |
| Two finger tap    | quick settings             |
| Edge swipe        | chapter navigation         |
| Swipe down-right  | create note anchor         |
| Two finger hold   | voice note                 |
| Three finger hold | theme/color wheel          |

---

# Speed UX

## Base WPM

Persistent chosen speed.

## Dynamic Speed

Temporary gesture modulation.

Visual indicator:

```text id="o2jv14"
420 WPM
×1.3
```

Fades automatically.

---

# Intelligent Timing

Adaptive pacing engine.

Adjust timing based on:

* punctuation
* long words
* paragraph breaks
* numbers
* ALL CAPS
* quotes
* semantic density

t_{adaptive}=t_{base}\times l_{modifier}\times p_{modifier}\times s_{modifier}

---

# Semantic Chunking

Engine groups words contextually.

Example:

Instead of:

```text id="r9m6sk"
the
cat
sat
```

Use:

```text id="f4m8gh"
the cat
sat slowly
nearby
```

---

# Teleprompter Mode

## Features

* smooth continuous auto-scroll
* adjustable speed
* mirrored mode
* landscape support
* fullscreen clean mode
* remote/bluetooth controls later

---

# Teleprompter Audio Modes

## Mode A

Manual reading only.

## Mode B

Microphone-assisted pacing.

---

# Microphone-Assisted Intelligence

Speech tracking engine:

* follows speaker pace
* auto-adjusts scrolling
* detects pauses
* predicts cadence

Optional:
never forced.

---

# Teleprompter Gestures

| Gesture         | Action          |
| --------------- | --------------- |
| Vertical drag   | temporary speed |
| Horizontal drag | scroll scrub    |
| Double tap      | center reset    |
| Pinch           | text size       |
| Long press      | pause           |

---

# Notes System

## Philosophy

Capture thought without interruption.

---

# Quick Notes

Gesture:
swipe down-right.

Creates:
context anchor silently.

---

# Voice Notes

Hold two fingers:
record thought.

AI attaches:

* timestamp
* paragraph
* semantic context

---

# AI Intelligence Layer

Invisible assistant.
Never chatbot-centric.

---

# AI Features

## Reading Analytics

Detects:

* slowdown zones
* rereads
* difficult sections

---

## Smart Suggestions

Examples:

```text id="hm8xtk"
Dense paragraph detected.
Enable comprehension pacing?
```

---

## Semantic Bookmarks

Instead of:
“page 42”

Bookmarks become:

```text id="l4n2bk"
where protagonist reveals truth
```

---

# Search

Meaning-based retrieval.

Example:

```text id="s8r1la"
quote about loneliness
```

---

# Focus Modes

## Zen

Pure black minimal.

## Guided

Ghost context visible.

## Flow

Sentence-visible mode.

---

# Typography Customization

## Fonts

Support:

* SF Pro
* Inter
* IBM Plex Sans
* JetBrains Mono
* Literata
* OpenDyslexic

---

# Adjustable Typography

* font size
* weight
* spacing
* kerning
* line height

Realtime preview only.

No apply button.

---

# Theme Engine

## Editable

### Background

* AMOLED black
* sepia
* paper
* graphite

### ORP highlight

* red
* amber
* cyan
* lime

### Peripheral context opacity

---

# Accessibility

Required:

* dyslexia mode
* reduced motion
* colorblind-safe themes
* screen reader support
* dynamic type scaling
* high contrast mode

---

# Haptics

## iOS

* subtle punctuation taps
* soft pause feedback
* spring interactions

## Android

* lighter tactile feedback
* optional vibration tuning

---

# Sound Design

Optional.
Subtle only.

Examples:

* ambient airflow
* soft ticks
* quiet tactile pulses

Never gimmicky.

---

# Performance Targets

## Mandatory

* 120hz capable
* no dropped frames
* instant resume
* smooth gesture interpolation
* low memory usage

If animation hurts performance:
remove animation.

---

# Offline-First

Everything works offline except:

* AI cloud features (optional)

---

# Future Features

## Sync

Cross-device reading sync.

## Collaborative Notes

Shared annotations.

## AI Study Mode

Summaries + flashcards.

## Smart Import

Web article cleaning.

---

# Engineering Principles

## Do NOT

* overload UI
* expose technical complexity
* use excessive Material widgets
* use generic mobile templates
* block reader with dialogs

---

# UX Principles

## Reader Must Always Feel:

* calm
* fast
* fluid
* intelligent
* uninterrupted

---

# Final Product Goal

```text id="f9r7ea"
A tool so smooth and intelligent that reading feels accelerated beyond normal cognition.
```
