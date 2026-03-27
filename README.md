# Jam

A real-time multiplayer step sequencer for the browser. Load the same room URL with friends and you're instantly jamming together — paint beats on a shared 16-step grid across eight drum and synth tracks, see each other's cursors as colored presence indicators, and optionally lock your transport so everyone's play/stop is synchronized. Built with React, Yjs (CRDT-based sync), WebRTC for low-latency peer-to-peer state, and a self-hosted WebSocket server on Fly.io for persistence between sessions.

## Demo

<!-- TODO: add demo video -->

## Running locally

```bash
npm install
npm run dev        # Vite dev server at http://localhost:5173
npm run server     # y-websocket + WebRTC signaling server at ws://localhost:1234
```
