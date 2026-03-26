# Sequencer Design — 2026-03-17

## What it is

A real-time collaborative 16-step drum sequencer. Multiple users share a room via URL and edit the same pattern concurrently. Each user gets a unique presence color. Audio plays back locally per user.

## Stack

- Vite+ / React 19 / TypeScript / Tailwind v4
- Yjs (CRDT) + y-webrtc (P2P sync, no backend)
- Zustand (local transport state)
- Web Audio API (synthesized drums, no samples)

## Architecture

### Shared state (Yjs)

```
ydoc
└── grid: Y.Map<trackId, Y.Array<boolean>>
    // 5 tracks × 16 steps
```

Stored in a Yjs document synced via y-webrtc. No server required — WebRTC peers exchange changes directly; signaling via public `signaling.yjs.dev`.

### Local state (Zustand)

Play/stop/bpm/currentStep — not shared. Each user controls their own transport.

### Audio engine

Lookahead scheduler: `setInterval(25ms)` schedules Web Audio events 100ms ahead for rock-solid timing. Reads grid state from a `ref` (not React state) to avoid closure staleness.

### Presence

Yjs awareness protocol (built into y-webrtc). Each client sets local awareness state with `{ userId, color, displayName, lastEditedStep }`. Other clients observe changes and flash step cells when a peer edits them.

## Room sharing

`?room=<nanoid>` in the URL. Generated on first visit, preserved on reload. Copy via Share Room button.

## Backlog

- Create a new room (button to generate a fresh room ID and navigate to it)
- Enter your name (replace random adjective-noun with user-chosen display name)
- Sync transport (shared play/stop, opt-in per user via toggle — when enabled, your play/stop follows the room)
- Session persistence (y-websocket)
- Upgrade to vite-plus (latest release)
- Get a real domain and deploy
- Track mute/solo/volume
- Pattern save/load
- Drag/swipe to paint steps (mousedown on a step determines paint mode — if that step was enabled, dragging disables all touched steps; if disabled, dragging enables them; no per-step toggling mid-drag)
- Piano roll
- Synth editing (per-track controls for envelope, pitch, filter — experiment with exposing synth parameters in the UI)
- Sample-based tracks
