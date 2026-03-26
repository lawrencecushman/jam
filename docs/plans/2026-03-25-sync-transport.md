# Sync Transport Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add opt-in shared play/stop so users who enable "Sync" have their transport follow the room — any synced user's play or stop command is broadcast and applied to all other synced users.

**Architecture:** A new `useSyncTransport` hook owns a `Y.Map('transport')` in the existing Yjs doc and exposes sync-aware `syncPlay`/`syncStop` alongside a `syncEnabled` toggle. The Yjs observer skips local changes (`event.transaction.local`) to avoid double-firing; it only reacts to remote changes, calling the existing Zustand `play()`/`stop()` actions. When a user enables sync mid-session, the hook immediately syncs them to the current shared state. The `Transport` component gets two new props (`syncEnabled`, `onToggleSync`) and renders a small toggle button.

**Tech Stack:** Vite 6, React 19, TypeScript 5.7, Yjs 13.6 (`Y.Map`, `Y.YMapEvent`), Zustand, existing `useTransport` store

---

## Task 1: `useSyncTransport` Hook

**Files:**
- Create: `src/collaboration/useSyncTransport.ts`

### Step 1: Create `src/collaboration/useSyncTransport.ts`

```typescript
import * as Y from 'yjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRoom } from './RoomProvider'
import { useTransport } from '../store/useTransport'

export function useSyncTransport() {
  const { doc } = useRoom()
  const { play, stop } = useTransport()
  const [syncEnabled, setSyncEnabled] = useState(false)

  // Stable ref so the observer closure never captures a stale value
  const syncEnabledRef = useRef(syncEnabled)
  syncEnabledRef.current = syncEnabled

  const transportMap = doc.getMap<boolean>('transport')

  // React to REMOTE transport changes when sync is enabled
  useEffect(() => {
    const observer = (event: Y.YMapEvent<boolean>) => {
      if (event.transaction.local) return // our own write, already applied locally
      if (!syncEnabledRef.current) return
      const sharedIsPlaying = transportMap.get('isPlaying')
      if (sharedIsPlaying === true) play()
      else if (sharedIsPlaying === false) stop()
    }

    transportMap.observe(observer)
    return () => transportMap.unobserve(observer)
  }, [transportMap, play, stop])

  // Sync-aware play: broadcast + start local engine
  const syncPlay = useCallback(() => {
    if (syncEnabled) {
      transportMap.set('isPlaying', true)
    }
    play()
  }, [syncEnabled, transportMap, play])

  // Sync-aware stop: broadcast + stop local engine
  const syncStop = useCallback(() => {
    if (syncEnabled) {
      transportMap.set('isPlaying', false)
    }
    stop()
  }, [syncEnabled, transportMap, stop])

  // Toggle sync; when enabling, immediately snap to current shared state
  const toggleSync = useCallback(() => {
    setSyncEnabled((prev) => {
      const next = !prev
      if (next) {
        const sharedIsPlaying = transportMap.get('isPlaying')
        if (sharedIsPlaying === true) play()
        else if (sharedIsPlaying === false) stop()
      }
      return next
    })
  }, [transportMap, play, stop])

  return { syncEnabled, toggleSync, syncPlay, syncStop }
}
```

Key design decisions:
- `syncEnabledRef` keeps the observer closure from going stale without re-subscribing
- `event.transaction.local` prevents double-firing when the local user triggers a change
- `toggleSync` snaps to current shared state on enable — if peers are playing when you turn sync on, you start playing immediately
- `Y.Map('transport')` lives in the existing Yjs doc; no extra provider needed

### Step 2: Verify build

```bash
cd /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus && npm run build
```

Expected: clean build. Hook is created but not yet wired to UI.

### Step 3: Commit

```bash
cd /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus && git add src/collaboration/useSyncTransport.ts && git commit -m "feat: add useSyncTransport hook for opt-in shared play/stop"
```

---

## Task 2: Sync Toggle UI + Sequencer Wiring

**Files:**
- Modify: `src/components/Sequencer/Transport.tsx`
- Modify: `src/components/Sequencer/Sequencer.tsx`

### Step 1: Update `Transport.tsx`

Replace `src/components/Sequencer/Transport.tsx`:

```tsx
import { STEP_COUNT } from '../../config'

interface TransportProps {
  isPlaying: boolean
  bpm: number
  currentStep: number
  syncEnabled: boolean
  onPlay: () => void
  onStop: () => void
  onBpmChange: (bpm: number) => void
  onToggleSync: () => void
}

export function Transport({
  isPlaying,
  bpm,
  currentStep,
  syncEnabled,
  onPlay,
  onStop,
  onBpmChange,
  onToggleSync,
}: TransportProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <button
        onClick={isPlaying ? onStop : onPlay}
        className={[
          'px-5 py-2 rounded font-mono text-sm font-semibold transition-colors',
          isPlaying
            ? 'bg-red-500 hover:bg-red-400 text-white'
            : 'bg-emerald-500 hover:bg-emerald-400 text-black',
        ].join(' ')}
      >
        {isPlaying ? '■ Stop' : '▶ Play'}
      </button>

      <div className="flex items-center gap-2">
        <label htmlFor="bpm-input" className="text-xs text-zinc-400 font-mono">BPM</label>
        <input
          id="bpm-input"
          type="number"
          min={40}
          max={240}
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm font-mono text-zinc-100 text-center"
        />
      </div>

      {/* Step indicator dots */}
      <div className="flex gap-1">
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <div
            key={i}
            className={[
              'w-2 h-2 rounded-full transition-colors duration-75',
              i === currentStep ? 'bg-emerald-400' : 'bg-zinc-700',
            ].join(' ')}
          />
        ))}
      </div>

      <button
        onClick={onToggleSync}
        title={syncEnabled ? 'Sync on — your play/stop is shared with the room' : 'Sync off — your transport is independent'}
        className={[
          'px-3 py-1 rounded text-xs font-mono border transition-colors',
          syncEnabled
            ? 'border-blue-600 text-blue-400 bg-blue-950'
            : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500',
        ].join(' ')}
      >
        {syncEnabled ? '⟳ Sync On' : '⟳ Sync Off'}
      </button>
    </div>
  )
}
```

Changes vs. original:
- Added `syncEnabled: boolean` and `onToggleSync: () => void` props
- Added sync toggle button at the end of the transport row; blue/highlighted when on, muted when off
- Tooltip explains the behavior on hover

### Step 2: Update `Sequencer.tsx`

Replace `src/components/Sequencer/Sequencer.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { Grid } from './Grid'
import { Transport } from './Transport'
import { useTransport } from '../../store/useTransport'
import { useSharedGrid } from '../../collaboration/useSharedState'
import { usePresence } from '../../collaboration/usePresence'
import { useSyncTransport } from '../../collaboration/useSyncTransport'
import { PresenceBar } from '../PresenceBar'
import { NameInput } from '../NameInput'
import { TrackId } from '../../audio/instruments'
import { STEP_COUNT } from '../../config'

export function Sequencer() {
  const { grid, paintStep } = useSharedGrid()
  const gridRef = useRef(grid)
  gridRef.current = grid

  const { isPlaying, currentStep, bpm, initEngine, setBpm } = useTransport()
  const { users, flashes, notifyEdit } = usePresence()
  const { syncEnabled, toggleSync, syncPlay, syncStop } = useSyncTransport()

  useEffect(() => {
    initEngine(() => gridRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handlePaint(trackId: TrackId, stepIndex: number, value: boolean) {
    paintStep(trackId, stepIndex, value)
    notifyEdit(trackId, stepIndex)
  }

  // Convert flat flash map to per-track presence color arrays for Grid
  const presenceFlashes: Partial<Record<TrackId, (string | null)[]>> = {}
  for (const [key, color] of Object.entries(flashes)) {
    const [trackId, stepStr] = key.split(':')
    const stepIndex = Number(stepStr)
    if (!presenceFlashes[trackId as TrackId]) {
      presenceFlashes[trackId as TrackId] = Array(STEP_COUNT).fill(null)
    }
    presenceFlashes[trackId as TrackId]![stepIndex] = color ?? null
  }

  return (
    <div className="flex flex-col gap-6 p-6 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl">
      <div className="flex items-center justify-between">
        <Transport
          isPlaying={isPlaying}
          bpm={bpm}
          currentStep={currentStep}
          syncEnabled={syncEnabled}
          onPlay={syncPlay}
          onStop={syncStop}
          onBpmChange={setBpm}
          onToggleSync={toggleSync}
        />
        <div className="flex items-center gap-3">
          <NameInput />
          <PresenceBar users={users} />
        </div>
      </div>
      <Grid
        grid={grid}
        currentStep={currentStep}
        presenceFlashes={presenceFlashes}
        onPaint={handlePaint}
      />
    </div>
  )
}
```

Changes vs. original:
- Import `useSyncTransport`
- Destructure `play`/`stop` replaced by `syncPlay`/`syncStop`/`toggleSync`/`syncEnabled` from `useSyncTransport`
- `play`/`stop` removed from `useTransport` destructuring (engine still uses them internally via the hook)
- Transport props: `onPlay={syncPlay}`, `onStop={syncStop}`, `syncEnabled={syncEnabled}`, `onToggleSync={toggleSync}`

### Step 3: Verify build

```bash
cd /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus && npm run build
```

Expected: clean build, no TypeScript errors.

### Step 4: Visual check

```bash
npm run dev
```

1. Transport row now has `⟳ Sync Off` button at the right end (muted/dark)
2. Click `⟳ Sync Off` → turns to `⟳ Sync On` (blue highlight)
3. Hover shows tooltip explaining the behavior
4. Two tabs, same room:
   - Both have Sync Off → play/stop in one tab has no effect on other ✓
   - Tab A enables Sync, Tab B enables Sync → Tab A clicks Play → Tab B also starts playing ✓
   - Tab A clicks Stop → Tab B also stops ✓
   - Tab B enables Sync while Tab A is already playing → Tab B immediately starts playing ✓
   - Tab B disables Sync → Tab A clicking Stop/Play no longer affects Tab B ✓

### Step 5: Commit

```bash
cd /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus && git add src/components/Sequencer/Transport.tsx src/components/Sequencer/Sequencer.tsx && git commit -m "feat: add sync transport toggle to Transport UI"
```
