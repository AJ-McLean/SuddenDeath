# SuddenDeath --- Voice-Orchestrated AI Interrogation Engine

## Overview

SuddenDeath is a voice-driven interactive questioning system powered by
ElevenLabs TTS.

It generates theatrical, high-intensity prompts using pre-generated
voice segments combined with live-generated LLM content.

The core design constraint:

> Dynamic question audio must only begin generating when the "pre"
> segment starts playing.

This allows dynamic, context-aware follow-up questions in the future
without introducing noticeable latency.

------------------------------------------------------------------------

# System Architecture

The system is intentionally divided into three layers:

## 1. Context Layer (`/Context`)

Editable narrative source-of-truth.

Contains: - `templates.mjs` --- all scripted Wheatley dialogue - test
question sets - future personality modes / script variants

This layer contains **no logic**, only text.

If tone or structure changes, this is the only place that should be
edited.

------------------------------------------------------------------------

## 2. Orchestration Layer (`/Code`)

Controls execution flow.

Responsibilities: - Load templates - Play pre audio - Trigger dynamic
question generation - Play generated question - Play post audio - Handle
sequencing and timing - (Future) manage answer evaluation + feedback
logic

This layer contains: - `pregen.mjs` --- pre-generate static pre/post
clips - `run_batch.mjs` --- run interactive sequences

This layer must never contain hardcoded dialogue.

------------------------------------------------------------------------

## 3. Media Layer

Handles: - ElevenLabs TTS - Audio playback (mpv for localhost) - File
caching - Temporary audio management

Currently configured:

-   **Voice ID:** `dTtuO9q1gaF6JeIDjwri`
-   **Model:** `eleven_v3`
-   **Output format:** `mp3_44100_128`

These parameters must remain consistent across all generation scripts.

------------------------------------------------------------------------

# Execution Flow

For each question:

1.  Play pre-recorded `pre` audio.
2.  As soon as playback starts, begin generating dynamic question audio.
3.  When pre finishes:
    -   If question is ready → play it.
    -   If not ready → (future: play countdown).
4.  Play post audio.
5.  Repeat.

The key invariant:

Dynamic audio generation must never begin before pre playback starts.

------------------------------------------------------------------------

# File Structure

    Wheatly/
    ├── Audio/
    │   ├── Pre-Audio/
    │   ├── Post-Audio/
    │   └── Cache/ (future)
    ├── Context/
    │   └── templates.mjs
    ├── Code/
    │   ├── pregen.mjs
    │   ├── run_batch.mjs
    │   └── (future modules)
    ├── package.json
    └── README.md

------------------------------------------------------------------------

# Design Principles

## 1. Separation of Content and Logic

Dialogue lives in `/Context`.\
Execution lives in `/Code`.

Never mix them.

------------------------------------------------------------------------

## 2. Deterministic Audio Parameters

Voice ID, model, and format must remain identical across:

-   pre generation
-   dynamic generation
-   feedback generation

If changed, all static assets must be regenerated.

------------------------------------------------------------------------

## 3. Latency Masking via Pre Segment

The pre segment exists to hide TTS latency.

This is intentional.

Do not generate dynamic audio before pre playback begins.

------------------------------------------------------------------------

## 4. Scalability Path

Future expansions may include:

-   Mic input capture
-   Transcription
-   Answer evaluation
-   Duration-aware responses
-   Dynamic follow-up generation
-   Audio stitching into single output file
-   Web-based playback
-   Real-time streaming TTS

The current architecture is designed so these can be added without
restructuring the project.

------------------------------------------------------------------------

# How to Run

## Pre-generate static audio

From `/Code`:

``` bash
node pregen.mjs
```

## Run interactive batch

``` bash
node run_batch.mjs
```

------------------------------------------------------------------------

# Known Constraints

-   Playback currently uses `mpv`.
-   Dynamic audio is generated fully before playback.
-   No streaming TTS yet.
-   No caching layer yet.
-   No session logging yet.

------------------------------------------------------------------------

# Future Improvements

1.  Audio caching via content hash\
2.  Structured session logging\
3.  Countdown buffer integration\
4.  Response-length-aware branching\
5.  Real streaming playback\
6.  Web client

------------------------------------------------------------------------

# For Claude (AI Collaborator Notes)

When modifying this project:

-   Do not change generation timing logic without preserving latency
    masking.
-   Do not move templates out of `/Context`.
-   Do not introduce hardcoded dialogue into orchestration scripts.
-   Maintain consistent TTS parameters across all scripts.
-   Prefer modular additions over structural rewrites.
