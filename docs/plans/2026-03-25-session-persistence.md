# Session Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist room patterns server-side so users can close the browser and return later to find their grid intact.

**Architecture:** Add `y-websocket` (a Yjs WebSocket provider + Node.js server with LevelDB persistence). The client connects to **both** providers simultaneously: the existing `WebrtcProvider` for low-latency P2P sync and awareness, and a new `WebsocketProvider` for server-backed persistence. The WebSocket server is the authoritative source of truth for a room's saved state — when a user opens a room URL, the server delivers any persisted doc state before the grid renders. The `isNewRoom` distinction in `RoomProvider` is removed: the server simply has or doesn't have data for a given roomId, and `initializeGrid` is already idempotent (skips tracks that exist).

**Tech Stack:** Vite 6, React 19, TypeScript, `y-websocket` (WebSocket provider + built-in LevelDB server), `y-webrtc` (still used for P2P + awareness), `yjs`

---

## Task 1: Install `y-websocket` and Add Dev Server Script

**Files:**
- Modify: `package.json`

### Step 1: Install the package

```bash
cd /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus && npm install y-websocket
```

Expected: `y-websocket` added to `dependencies` in `package.json`.

### Step 2: Add the server npm script

In `package.json`, add a `"server"` entry to the `"scripts"` block:

```json
"server": "HOST=localhost PORT=1234 YPERSISTENCE=./db node node_modules/y-websocket/bin/server.js"
```

The full `"scripts"` block should look like:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "server": "HOST=localhost PORT=1234 YPERSISTENCE=./db node node_modules/y-websocket/bin/server.js"
},
```

What this does:
- `HOST=localhost PORT=1234` — binds to localhost:1234
- `YPERSISTENCE=./db` — persists doc state to a `./db` LevelDB directory (created automatically on first run)
- `node node_modules/y-websocket/bin/server.js` — runs the built-in y-websocket server

In development you run two terminals: `npm run server` in one, `npm run dev` in the other.

### Step 3: Add `./db` to `.gitignore`

The `./db` directory is the LevelDB persistence store — it should not be committed.

Check if a `.gitignore` exists:

```bash
cat /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus/.gitignore
```

If it exists, add `/db` to it. If it doesn't exist, create it with:

```
/db
node_modules
dist
```

### Step 4: Verify the server starts

```bash
cd /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus && npm run server &
sleep 2
kill %1
```

Expected output before kill: something like `Listening on port 1234` (y-websocket prints a startup message).

### Step 5: Commit

```bash
cd /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus && git add package.json package-lock.json .gitignore && git commit -m "feat: add y-websocket dependency and dev server script"
```

---

## Task 2: Update `RoomProvider` to Use Both Providers

**Files:**
- Modify: `src/collaboration/RoomProvider.tsx`

### Step 1: Replace `src/collaboration/RoomProvider.tsx`

```tsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { WebsocketProvider } from 'y-websocket'
import { nanoid } from 'nanoid'
import { TRACKS } from '../audio/instruments'
import { STEP_COUNT } from '../config'

// In development this defaults to localhost. For production, set VITE_WS_URL
// in your environment (e.g. VITE_WS_URL=wss://your-server.com npm run build).
const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:1234'

interface RoomContextValue {
  doc: Y.Doc
  provider: WebrtcProvider | null
  grid: Y.Map<Y.Array<boolean>>
  roomId: string
}

const RoomContext = createContext<RoomContextValue | null>(null)

export function useRoom() {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRoom must be used inside RoomProvider')
  return ctx
}

function getOrCreateRoomId(): string {
  const params = new URLSearchParams(window.location.search)
  const existing = params.get('room')
  if (existing) return existing

  const id = nanoid(8)
  const url = new URL(window.location.href)
  url.searchParams.set('room', id)
  window.history.replaceState(null, '', url.toString())
  return id
}

function initializeGrid(doc: Y.Doc, grid: Y.Map<Y.Array<boolean>>) {
  doc.transact(() => {
    for (const { id } of TRACKS) {
      if (!grid.has(id)) {
        const steps = new Y.Array<boolean>()
        steps.insert(0, Array(STEP_COUNT).fill(false))
        grid.set(id, steps)
      }
    }
  })
}

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const roomId = useMemo(() => getOrCreateRoomId(), [])
  const [provider, setProvider] = useState<WebrtcProvider | null>(null)

  const doc = useMemo(() => new Y.Doc(), [])
  const grid = useMemo(() => doc.getMap<Y.Array<boolean>>('grid'), [doc])

  useEffect(() => {
    // WebSocket provider: connects to the persistence server.
    // Its 'sync' event fires once the server has delivered any saved doc state.
    // If the server is unreachable, the fallback timer handles initialization.
    const wsProvider = new WebsocketProvider(WS_URL, roomId, doc)

    // WebRTC provider: low-latency P2P sync between browser tabs + awareness (presence).
    const webrtcProvider = new WebrtcProvider(roomId, doc, {
      signaling: [
        'wss://signaling.yjs.dev',
        'wss://y-webrtc-signaling-eu.herokuapp.com',
      ],
    })

    // Initialize grid tracks once the server has delivered any persisted state.
    // initializeGrid is idempotent — it only adds tracks that don't exist yet.
    // Fallback: if WS doesn't sync within 3s (server down or first-ever visit),
    // initialize anyway so the UI is never stuck waiting.
    let done = false
    const ensureInit = () => {
      if (done) return
      done = true
      initializeGrid(doc, grid)
    }

    wsProvider.on('sync', (synced: boolean) => {
      if (synced) ensureInit()
    })
    const fallback = setTimeout(ensureInit, 3000)

    // Expose the WebRTC provider via context — usePresence uses its .awareness
    setProvider(webrtcProvider)

    return () => {
      clearTimeout(fallback)
      wsProvider.destroy()
      webrtcProvider.destroy()
      setProvider(null)
    }
  }, [roomId, doc, grid])

  return (
    <RoomContext.Provider value={{ doc, provider, grid, roomId }}>
      {children}
    </RoomContext.Provider>
  )
}
```

Key changes vs. the current file:
- Added `import { WebsocketProvider } from 'y-websocket'`
- Added `WS_URL` constant with env var override
- `getOrCreateRoomId` now returns `string` instead of `{ roomId, isNewRoom }` — the `isNewRoom` distinction is no longer needed
- `doc` is created unconditionally (no `if (isNewRoom)` initialization branch)
- Both `wsProvider` and `webrtcProvider` created in the same `useEffect`
- Grid init driven by `wsProvider.on('sync', ...)` + 3s fallback
- Both providers destroyed on cleanup

### Step 2: Verify TypeScript types

y-websocket ships its own types. Check that the import resolves:

```bash
cd /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus && npx tsc --noEmit
```

Expected: no errors. If `y-websocket` types are missing, install them:

```bash
npm install --save-dev @types/y-websocket
```

(In practice y-websocket bundles its own types, so this should not be needed.)

### Step 3: Verify build

```bash
cd /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus && npm run build
```

Expected: clean build, no TypeScript errors.

### Step 4: Manual smoke test

Open two terminals:

**Terminal 1:**
```bash
cd /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus && npm run server
```

**Terminal 2:**
```bash
npm run dev
```

Verify:
1. App loads, grid appears (server syncs empty doc → 3s fallback triggers init OR ws syncs immediately for new room)
2. Toggle a few steps, then **close the browser tab**
3. Reopen `http://localhost:5173` (same `?room=` URL)
4. The grid loads with the same steps toggled — **persistence confirmed**
5. Open a second tab to the same room URL — grid syncs in real time as before

### Step 5: Commit

```bash
cd /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus && git add src/collaboration/RoomProvider.tsx && git commit -m "feat: add WebsocketProvider for server-backed session persistence"
```
