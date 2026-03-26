# Drag Paint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users click-and-drag (or touch-and-swipe) across step buttons to paint multiple steps at once; the first step touched determines paint mode (enables if off, disables if on), and every subsequent step the pointer enters is set to that same value — no per-step toggling mid-drag.

**Architecture:** Add `paintStep` (set-to-value) alongside `toggleStep` in `useSharedGrid`. Replace the `onToggle` prop chain (Grid→TrackRow→StepButton) with `onPointerDown`+`onPointerEnter` props. Drag state lives in a `ref` inside `Grid` (zero re-renders mid-drag). A `window` pointerup listener ends the drag even when the pointer is released outside the grid. `touch-action: none` on each button prevents mobile scroll from hijacking the swipe.

**Tech Stack:** Vite 6, React 19, TypeScript 5.7, Tailwind v4, Pointer Events API (native browser)

---

## Task 1: Add `paintStep` to `useSharedGrid`

**Files:**
- Modify: `src/collaboration/useSharedState.ts`

### Step 1: Add `paintStep` callback

Open `src/collaboration/useSharedState.ts`. Add the `paintStep` callback after `toggleStep` and include it in the return value.

Replace the file with:

```typescript
import { useCallback, useEffect, useState } from 'react'
import * as Y from 'yjs'
import { useRoom } from './RoomProvider'
import { TrackId, TRACKS } from '../audio/instruments'
import { STEP_COUNT } from '../config'

type Grid = Record<TrackId, boolean[]>

function yGridToSnapshot(yGrid: Y.Map<Y.Array<boolean>>): Grid {
  return Object.fromEntries(
    TRACKS.map(({ id }) => {
      const yArr = yGrid.get(id)
      return [id, yArr ? yArr.toArray() : Array(STEP_COUNT).fill(false)]
    })
  ) as Grid
}

export function useSharedGrid() {
  const { grid, doc } = useRoom()
  const [snapshot, setSnapshot] = useState<Grid>(() => yGridToSnapshot(grid))

  useEffect(() => {
    // Re-snapshot on any change to the map or nested arrays
    const observer = () => setSnapshot(yGridToSnapshot(grid))
    grid.observeDeep(observer)
    return () => grid.unobserveDeep(observer)
  }, [grid])

  const toggleStep = useCallback(
    (trackId: TrackId, stepIndex: number) => {
      const yArr = grid.get(trackId)
      if (!yArr) return
      const current = yArr.get(stepIndex)
      doc.transact(() => {
        yArr.delete(stepIndex, 1)
        yArr.insert(stepIndex, [!current])
      })
    },
    [grid, doc]
  )

  const paintStep = useCallback(
    (trackId: TrackId, stepIndex: number, value: boolean) => {
      const yArr = grid.get(trackId)
      if (!yArr) return
      if (yArr.get(stepIndex) === value) return // already correct, skip CRDT write
      doc.transact(() => {
        yArr.delete(stepIndex, 1)
        yArr.insert(stepIndex, [value])
      })
    },
    [grid, doc]
  )

  return { grid: snapshot, toggleStep, paintStep }
}
```

### Step 2: Verify build

```bash
cd /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus && npm run build
```

Expected: clean build. `paintStep` is exported but not yet wired to UI, so no behavior change.

### Step 3: Commit

```bash
cd /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus && git add src/collaboration/useSharedState.ts && git commit -m "feat: add paintStep to useSharedGrid for drag-paint support"
```

---

## Task 2: Add Drag Support to Grid Components

**Files:**
- Modify: `src/components/Sequencer/StepButton.tsx`
- Modify: `src/components/Sequencer/TrackRow.tsx`
- Modify: `src/components/Sequencer/Grid.tsx`
- Modify: `src/components/Sequencer/Sequencer.tsx`

### Step 1: Update `StepButton.tsx`

Replace `src/components/Sequencer/StepButton.tsx`:

```tsx
interface StepButtonProps {
  active: boolean
  isCurrent: boolean
  presenceColor?: string | null
  onPointerDown: () => void
  onPointerEnter: () => void
}

export function StepButton({ active, isCurrent, presenceColor, onPointerDown, onPointerEnter }: StepButtonProps) {
  return (
    <button
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      style={{
        touchAction: 'none',
        ...(presenceColor ? { boxShadow: `0 0 0 2px ${presenceColor}` } : {}),
      }}
      className={[
        'w-8 h-8 rounded-sm border transition-all duration-75 cursor-pointer select-none',
        active
          ? 'bg-emerald-400 border-emerald-300 shadow-lg shadow-emerald-400/30'
          : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700',
        isCurrent && active
          ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-950'
          : isCurrent
          ? 'ring-2 ring-zinc-400 ring-offset-1 ring-offset-zinc-950'
          : '',
      ].join(' ')}
      aria-pressed={active}
    />
  )
}
```

Changes vs. original:
- `onClick` → `onPointerDown` + `onPointerEnter` (two separate props)
- `style` now includes `touchAction: 'none'` to block scroll during swipe
- Added `select-none` class to prevent text selection during drag

### Step 2: Update `TrackRow.tsx`

Replace `src/components/Sequencer/TrackRow.tsx`:

```tsx
import { StepButton } from './StepButton'

interface TrackRowProps {
  label: string
  steps: boolean[]
  currentStep: number
  presenceColors?: (string | null)[]
  onPointerDown: (stepIndex: number) => void
  onPointerEnter: (stepIndex: number) => void
}

export function TrackRow({ label, steps, currentStep, presenceColors, onPointerDown, onPointerEnter }: TrackRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-right text-xs text-zinc-400 font-mono shrink-0">{label}</span>
      <div className="flex gap-1">
        {steps.map((active, i) => (
          <StepButton
            key={i}
            active={active}
            isCurrent={currentStep === i}
            presenceColor={presenceColors?.[i] ?? null}
            onPointerDown={() => onPointerDown(i)}
            onPointerEnter={() => onPointerEnter(i)}
          />
        ))}
      </div>
    </div>
  )
}
```

Changes vs. original: `onToggle` → `onPointerDown` + `onPointerEnter`.

### Step 3: Update `Grid.tsx`

Replace `src/components/Sequencer/Grid.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { TrackRow } from './TrackRow'
import { TRACKS, TrackId } from '../../audio/instruments'

interface GridProps {
  grid: Record<TrackId, boolean[]>
  currentStep: number
  presenceFlashes?: Partial<Record<TrackId, (string | null)[]>>
  onPaint: (trackId: TrackId, stepIndex: number, value: boolean) => void
}

export function Grid({ grid, currentStep, presenceFlashes, onPaint }: GridProps) {
  const dragRef = useRef<{ paintMode: boolean } | null>(null)

  useEffect(() => {
    const endDrag = () => { dragRef.current = null }
    window.addEventListener('pointerup', endDrag)
    return () => window.removeEventListener('pointerup', endDrag)
  }, [])

  function handlePointerDown(trackId: TrackId, stepIndex: number) {
    const currentValue = grid[trackId][stepIndex]
    const paintMode = !currentValue
    dragRef.current = { paintMode }
    onPaint(trackId, stepIndex, paintMode)
  }

  function handlePointerEnter(trackId: TrackId, stepIndex: number) {
    if (!dragRef.current) return
    onPaint(trackId, stepIndex, dragRef.current.paintMode)
  }

  return (
    <div className="flex flex-col gap-2">
      {TRACKS.map(({ id, label }) => (
        <TrackRow
          key={id}
          label={label}
          steps={grid[id]}
          currentStep={currentStep}
          presenceColors={presenceFlashes?.[id]}
          onPointerDown={(stepIndex) => handlePointerDown(id, stepIndex)}
          onPointerEnter={(stepIndex) => handlePointerEnter(id, stepIndex)}
        />
      ))}
    </div>
  )
}
```

Changes vs. original:
- `onToggle` → `onPaint(trackId, stepIndex, value: boolean)`
- `dragRef` tracks paint mode during a drag session (null = not dragging)
- `useEffect` registers a global `pointerup` listener to end drag even if released outside the grid
- `handlePointerDown`: reads current step value, inverts it as paint mode, starts drag, applies immediately
- `handlePointerEnter`: applies paint mode to entered step if drag is active

### Step 4: Update `Sequencer.tsx`

Replace `src/components/Sequencer/Sequencer.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { Grid } from './Grid'
import { Transport } from './Transport'
import { useTransport } from '../../store/useTransport'
import { useSharedGrid } from '../../collaboration/useSharedState'
import { usePresence } from '../../collaboration/usePresence'
import { PresenceBar } from '../PresenceBar'
import { NameInput } from '../NameInput'
import { TrackId } from '../../audio/instruments'
import { STEP_COUNT } from '../../config'

export function Sequencer() {
  const { grid, paintStep } = useSharedGrid()
  const gridRef = useRef(grid)
  gridRef.current = grid

  const { isPlaying, currentStep, bpm, initEngine, play, stop, setBpm } = useTransport()
  const { users, flashes, notifyEdit } = usePresence()

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
          onPlay={play}
          onStop={stop}
          onBpmChange={setBpm}
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
- `toggleStep` removed, `paintStep` added from `useSharedGrid`
- `handleToggle` removed, `handlePaint(trackId, stepIndex, value)` added
- `onToggle={handleToggle}` → `onPaint={handlePaint}` on Grid

### Step 5: Verify build

```bash
cd /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus && npm run build
```

Expected: clean build, no TypeScript errors.

### Step 6: Visual check

```bash
npm run dev
```

Verify:
1. Single click still toggles a step on/off (pointer-down = immediate paint)
2. Click and drag across multiple steps in the same track — all are set to the paint mode determined by the first step
3. Drag across track rows — all touched steps in all rows are painted
4. Releasing the mouse outside the grid ends the drag (no sticky drag state)
5. On mobile: touch and swipe paints steps without scrolling the page

### Step 7: Commit

```bash
cd /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus && git add src/components/Sequencer/StepButton.tsx src/components/Sequencer/TrackRow.tsx src/components/Sequencer/Grid.tsx src/components/Sequencer/Sequencer.tsx && git commit -m "feat: add drag/swipe paint mode to step grid"
```
