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

- Sync transport (shared play/stop)
- Sample-based tracks
- Piano roll
- Session persistence (y-websocket)
- Track mute/solo/volume
- Pattern save/load
