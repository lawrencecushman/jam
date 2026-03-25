# Multiplayer Sequencer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a real-time collaborative 16-step drum sequencer where multiple users join a URL-based room and edit the same pattern live, each identified by a presence color.

**Architecture:** Yjs CRDT document holds the step grid (`Y.Map<trackId, Y.Array<boolean>>`); y-webrtc syncs peers P2P with no backend required. A Web Audio lookahead scheduler handles timing-critical audio playback locally per user, decoupled from React render cycles. Zustand manages local-only transport state (play/stop/bpm/currentStep).

**Tech Stack:** Vite+ (vite-plus@0.1.12 + create-vite@9.0.2), React 19, TypeScript, Tailwind v4 (@tailwindcss/vite@4.2.1), yjs@13.6.30, y-webrtc@10.3.0, zustand@5.0.12, nanoid@5.1.7

---

## Task 1: Project Scaffold

**Files:**
- Create: entire project via `npm create vite@latest`
- Modify: `vite.config.ts`
- Modify: `index.css`
- Modify: `src/App.tsx`
- Modify: `package.json`

**Step 1: Scaffold with Vite (React + TypeScript)**

```bash
cd /Users/lawrencecushman/repos/multiplayer-musicbench-viteplus
npm create vite@latest . -- --template react-ts
```

When prompted about existing files (just the docs/ directory), choose to ignore/continue.

**Step 2: Install all dependencies**

```bash
npm install
npm install yjs y-webrtc zustand nanoid
npm install -D @tailwindcss/vite tailwindcss
```

**Step 3: Configure Tailwind v4 in vite.config.ts**

Replace the contents of `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
})
```

**Step 4: Set up Tailwind in index.css**

Replace `src/index.css` entirely:

```css
@import "tailwindcss";
```

**Step 5: Strip App.tsx to a clean shell**

Replace `src/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <p className="text-zinc-400">Music Bench loading…</p>
    </div>
  )
}
```

**Step 6: Delete unused boilerplate**

```bash
rm src/assets/react.svg public/vite.svg src/App.css
```

**Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: Server starts at `http://localhost:5173`, browser shows dark page with "Music Bench loading…" text, no console errors.

**Step 8: Init git and commit scaffold**

```bash
git init
git add .
git commit -m "feat: scaffold Vite React+TS project with Tailwind v4 and collab deps"
```

---

## Task 2: Audio Engine — Instruments

**Files:**
- Create: `src/audio/instruments.ts`

The audio engine needs synthesis functions before the scheduler. Each function takes an `AudioContext` and a `when` timestamp, creates nodes, connects them, and schedules playback.

**Step 1: Create the instruments file**

Create `src/audio/instruments.ts`:

```typescript
// Each function creates and immediately schedules a percussive sound.
// All nodes are self-contained — no references kept after scheduling.

export function playKick(ctx: AudioContext, when: number): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.frequency.setValueAtTime(150, when)
  osc.frequency.exponentialRampToValueAtTime(0.001, when + 0.5)

  gain.gain.setValueAtTime(1, when)
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.5)

  osc.start(when)
  osc.stop(when + 0.5)
}

export function playSnare(ctx: AudioContext, when: number): void {
  const bufferSize = ctx.sampleRate * 0.2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1500

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.8, when)
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.2)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  noise.start(when)
  noise.stop(when + 0.2)
}

export function playClosedHiHat(ctx: AudioContext, when: number): void {
  const bufferSize = ctx.sampleRate * 0.05
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 7000

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.5, when)
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.05)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  noise.start(when)
  noise.stop(when + 0.05)
}

export function playOpenHiHat(ctx: AudioContext, when: number): void {
  const bufferSize = ctx.sampleRate * 0.3
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 6000

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.4, when)
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.3)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  noise.start(when)
  noise.stop(when + 0.3)
}

export function playClap(ctx: AudioContext, when: number): void {
  // Multiple noise bursts layered slightly apart to simulate a clap
  for (let i = 0; i < 3; i++) {
    const offset = i * 0.01
    const bufferSize = ctx.sampleRate * 0.07
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let j = 0; j < bufferSize; j++) {
      data[j] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1200
    filter.Q.value = 0.5

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.6, when + offset)
    gain.gain.exponentialRampToValueAtTime(0.001, when + offset + 0.07)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    noise.start(when + offset)
    noise.stop(when + offset + 0.07)
  }
}

export type TrackId = 'kick' | 'snare' | 'hihat-closed' | 'hihat-open' | 'clap'

export const TRACKS: { id: TrackId; label: string }[] = [
  { id: 'kick', label: 'Kick' },
  { id: 'snare', label: 'Snare' },
  { id: 'hihat-closed', label: 'CH' },
  { id: 'hihat-open', label: 'OH' },
  { id: 'clap', label: 'Clap' },
]

export const SYNTH_MAP: Record<TrackId, (ctx: AudioContext, when: number) => void> = {
  kick: playKick,
  snare: playSnare,
  'hihat-closed': playClosedHiHat,
  'hihat-open': playOpenHiHat,
  clap: playClap,
}
```

**Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No TypeScript errors related to instruments.ts. Build succeeds.

---

## Task 3: Audio Engine — Scheduler

**Files:**
- Create: `src/audio/AudioEngine.ts`

The scheduler runs independently of React. It uses the `setInterval` lookahead pattern to schedule Web Audio events ahead of time, giving sample-accurate timing that `setTimeout`/React renders cannot provide.

**Step 1: Create AudioEngine.ts**

Create `src/audio/AudioEngine.ts`:

```typescript
import { SYNTH_MAP, TrackId } from './instruments'

// How far ahead to schedule (seconds)
const SCHEDULE_AHEAD_TIME = 0.1
// How often to call the scheduler (ms)
const LOOKAHEAD_INTERVAL = 25

export type GridSnapshot = Record<TrackId, boolean[]>

export class AudioEngine {
  private ctx: AudioContext | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null
  private nextNoteTime = 0
  private currentStep = 0
  private _bpm = 120
  private getGrid: () => GridSnapshot
  private onStep: (step: number) => void

  constructor(getGrid: () => GridSnapshot, onStep: (step: number) => void) {
    this.getGrid = getGrid
    this.onStep = onStep
  }

  get bpm() {
    return this._bpm
  }

  set bpm(value: number) {
    this._bpm = Math.max(40, Math.min(240, value))
  }

  private get stepDuration() {
    // 16th note duration in seconds
    return 60 / (this._bpm * 4)
  }

  start() {
    if (this.intervalId !== null) return

    // AudioContext must be created/resumed after a user gesture
    if (!this.ctx) {
      this.ctx = new AudioContext()
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }

    this.currentStep = 0
    this.nextNoteTime = this.ctx.currentTime

    this.intervalId = setInterval(() => this.tick(), LOOKAHEAD_INTERVAL)
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private tick() {
    if (!this.ctx) return

    while (this.nextNoteTime < this.ctx.currentTime + SCHEDULE_AHEAD_TIME) {
      this.scheduleStep(this.currentStep, this.nextNoteTime)
      this.nextNoteTime += this.stepDuration
      const step = this.currentStep
      this.currentStep = (this.currentStep + 1) % 16

      // Notify React at the moment the step SHOULD play
      const delay = (this.nextNoteTime - this.stepDuration - this.ctx.currentTime) * 1000
      setTimeout(() => this.onStep(step), Math.max(0, delay))
    }
  }

  private scheduleStep(step: number, when: number) {
    if (!this.ctx) return
    const grid = this.getGrid()
    for (const [trackIdStr, steps] of Object.entries(grid)) {
      const trackId = trackIdStr as TrackId
      if (steps[step]) {
        SYNTH_MAP[trackId](this.ctx, when)
      }
    }
  }

  destroy() {
    this.stop()
    this.ctx?.close()
    this.ctx = null
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No errors. Build completes.

**Step 3: Commit audio engine**

```bash
git add src/audio/
git commit -m "feat: add Web Audio lookahead scheduler and drum synthesis"
```

---

## Task 4: Transport Store (Zustand)

**Files:**
- Create: `src/store/useTransport.ts`

Local-only state for play/stop/bpm/currentStep. The AudioEngine is instantiated here and lives outside React.

**Step 1: Create the store**

Create `src/store/useTransport.ts`:

```typescript
import { create } from 'zustand'
import { AudioEngine, GridSnapshot } from '../audio/AudioEngine'

interface TransportStore {
  isPlaying: boolean
  currentStep: number
  bpm: number
  engine: AudioEngine | null
  initEngine: (getGrid: () => GridSnapshot) => void
  play: () => void
  stop: () => void
  setBpm: (bpm: number) => void
  setCurrentStep: (step: number) => void
}

export const useTransport = create<TransportStore>((set, get) => ({
  isPlaying: false,
  currentStep: -1,
  bpm: 120,
  engine: null,

  initEngine: (getGrid) => {
    const existing = get().engine
    if (existing) existing.destroy()

    const engine = new AudioEngine(getGrid, (step) => {
      get().setCurrentStep(step)
    })
    engine.bpm = get().bpm
    set({ engine })
  },

  play: () => {
    get().engine?.start()
    set({ isPlaying: true, currentStep: 0 })
  },

  stop: () => {
    get().engine?.stop()
    set({ isPlaying: false, currentStep: -1 })
  },

  setBpm: (bpm) => {
    const engine = get().engine
    if (engine) engine.bpm = bpm
    set({ bpm })
  },

  setCurrentStep: (step) => set({ currentStep: step }),
}))
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: No errors.

---

## Task 5: Local Sequencer UI (no collab yet)

**Files:**
- Create: `src/components/Sequencer/StepButton.tsx`
- Create: `src/components/Sequencer/TrackRow.tsx`
- Create: `src/components/Sequencer/Grid.tsx`
- Create: `src/components/Sequencer/Transport.tsx`
- Create: `src/components/Sequencer/Sequencer.tsx`
- Modify: `src/App.tsx`

Build the full UI with local React state for the grid. Collab replaces this state in Task 7.

**Step 1: Create StepButton**

Create `src/components/Sequencer/StepButton.tsx`:

```tsx
interface StepButtonProps {
  active: boolean
  isCurrent: boolean
  presenceColor?: string | null
  onToggle: () => void
}

export function StepButton({ active, isCurrent, presenceColor, onToggle }: StepButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={[
        'w-8 h-8 rounded-sm border transition-all duration-75 cursor-pointer',
        active
          ? 'bg-emerald-400 border-emerald-300 shadow-lg shadow-emerald-400/30'
          : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700',
        isCurrent && active
          ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-950'
          : isCurrent
          ? 'ring-2 ring-zinc-400 ring-offset-1 ring-offset-zinc-950'
          : '',
      ].join(' ')}
      style={presenceColor ? { boxShadow: `0 0 0 2px ${presenceColor}` } : undefined}
      aria-pressed={active}
    />
  )
}
```

**Step 2: Create TrackRow**

Create `src/components/Sequencer/TrackRow.tsx`:

```tsx
import { StepButton } from './StepButton'

interface TrackRowProps {
  label: string
  steps: boolean[]
  currentStep: number
  presenceColors?: (string | null)[]
  onToggle: (stepIndex: number) => void
}

export function TrackRow({ label, steps, currentStep, presenceColors, onToggle }: TrackRowProps) {
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
            onToggle={() => onToggle(i)}
          />
        ))}
      </div>
    </div>
  )
}
```

**Step 3: Create Grid**

Create `src/components/Sequencer/Grid.tsx`:

```tsx
import { TrackRow } from './TrackRow'
import { TRACKS, TrackId } from '../../audio/instruments'

interface GridProps {
  grid: Record<TrackId, boolean[]>
  currentStep: number
  presenceFlashes?: Partial<Record<TrackId, (string | null)[]>>
  onToggle: (trackId: TrackId, stepIndex: number) => void
}

export function Grid({ grid, currentStep, presenceFlashes, onToggle }: GridProps) {
  return (
    <div className="flex flex-col gap-2">
      {TRACKS.map(({ id, label }) => (
        <TrackRow
          key={id}
          label={label}
          steps={grid[id]}
          currentStep={currentStep}
          presenceColors={presenceFlashes?.[id]}
          onToggle={(stepIndex) => onToggle(id, stepIndex)}
        />
      ))}
    </div>
  )
}
```

**Step 4: Create Transport**

Create `src/components/Sequencer/Transport.tsx`:

```tsx
interface TransportProps {
  isPlaying: boolean
  bpm: number
  currentStep: number
  onPlay: () => void
  onStop: () => void
  onBpmChange: (bpm: number) => void
}

export function Transport({ isPlaying, bpm, currentStep, onPlay, onStop, onBpmChange }: TransportProps) {
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
        <label className="text-xs text-zinc-400 font-mono">BPM</label>
        <input
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
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={i}
            className={[
              'w-2 h-2 rounded-full transition-colors duration-75',
              i === currentStep ? 'bg-emerald-400' : 'bg-zinc-700',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  )
}
```

**Step 5: Create Sequencer root**

Create `src/components/Sequencer/Sequencer.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { Grid } from './Grid'
import { Transport } from './Transport'
import { useTransport } from '../../store/useTransport'
import { TRACKS, TrackId } from '../../audio/instruments'

const STEP_COUNT = 16

function createEmptyGrid(): Record<TrackId, boolean[]> {
  return Object.fromEntries(
    TRACKS.map(({ id }) => [id, Array(STEP_COUNT).fill(false)])
  ) as Record<TrackId, boolean[]>
}

export function Sequencer() {
  const [grid, setGrid] = useState<Record<TrackId, boolean[]>>(createEmptyGrid)
  const gridRef = useRef(grid)
  gridRef.current = grid

  const { isPlaying, currentStep, bpm, initEngine, play, stop, setBpm } = useTransport()

  useEffect(() => {
    initEngine(() => gridRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleStep(trackId: TrackId, stepIndex: number) {
    setGrid((prev) => {
      const next = { ...prev, [trackId]: [...prev[trackId]] }
      next[trackId][stepIndex] = !next[trackId][stepIndex]
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl">
      <Transport
        isPlaying={isPlaying}
        bpm={bpm}
        currentStep={currentStep}
        onPlay={play}
        onStop={stop}
        onBpmChange={setBpm}
      />
      <Grid
        grid={grid}
        currentStep={currentStep}
        onToggle={toggleStep}
      />
    </div>
  )
}
```

**Step 6: Wire up App.tsx**

Replace `src/App.tsx`:

```tsx
import { Sequencer } from './components/Sequencer/Sequencer'

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-8 gap-6">
      <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
        Music Bench
      </h1>
      <Sequencer />
    </div>
  )
}
```

**Step 7: Verify the app works**

```bash
npm run dev
```

Expected:
- Dark page with "Music Bench" header
- 5×16 step grid visible
- Click steps to toggle them (green = active, dim = inactive)
- Click Play — step dots animate, active steps produce drum sounds
- Click Stop — playback stops
- Change BPM — tempo changes

**Step 8: Commit local sequencer**

```bash
git add src/
git commit -m "feat: add local step sequencer with Web Audio playback"
```

---

## Task 6: Collaboration — RoomProvider

**Files:**
- Create: `src/collaboration/RoomProvider.tsx`

Sets up the Yjs document, y-webrtc provider, and awareness. Reads/generates the `?room=` URL param. Exposes everything via React context.

**Step 1: Create RoomProvider**

Create `src/collaboration/RoomProvider.tsx`:

```tsx
import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import type { Awareness } from 'y-protocols/awareness'
import { nanoid } from 'nanoid'
import { TrackId, TRACKS } from '../audio/instruments'

const STEP_COUNT = 16

interface RoomContextValue {
  doc: Y.Doc
  awareness: Awareness
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

function initializeGrid(grid: Y.Map<Y.Array<boolean>>) {
  // Only initialize if this is a fresh doc (no tracks yet)
  if (grid.size > 0) return
  for (const { id } of TRACKS) {
    if (!grid.has(id)) {
      const steps = new Y.Array<boolean>()
      steps.insert(0, Array(STEP_COUNT).fill(false))
      grid.set(id, steps)
    }
  }
}

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const roomId = useMemo(() => getOrCreateRoomId(), [])
  const docRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<WebrtcProvider | null>(null)

  if (!docRef.current) {
    docRef.current = new Y.Doc()
  }

  const doc = docRef.current
  const grid = doc.getMap<Y.Array<boolean>>('grid')

  // Initialize grid tracks on first render (may be overwritten by sync)
  initializeGrid(grid)

  useEffect(() => {
    const provider = new WebrtcProvider(roomId, doc, {
      signaling: ['wss://signaling.yjs.dev'],
    })
    providerRef.current = provider

    return () => {
      provider.destroy()
    }
  }, [roomId, doc])

  const value: RoomContextValue = {
    doc,
    awareness: doc.clientID
      ? (providerRef.current?.awareness ?? (null as unknown as Awareness))
      : (null as unknown as Awareness),
    grid,
    roomId,
  }

  // Re-render once provider is ready to expose awareness
  // We'll handle awareness access lazily in usePresence

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>
}
```

Note: `awareness` is lazily set because `providerRef.current` is null on first render. `usePresence` will call `provider.awareness` directly. Let's refactor to expose the provider instead:

**Step 2: Refactor RoomProvider to expose provider**

Replace `src/collaboration/RoomProvider.tsx` with this cleaner version:

```tsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { nanoid } from 'nanoid'
import { TRACKS } from '../audio/instruments'

const STEP_COUNT = 16

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

function initializeGrid(grid: Y.Map<Y.Array<boolean>>) {
  for (const { id } of TRACKS) {
    if (!grid.has(id)) {
      const steps = new Y.Array<boolean>()
      steps.insert(0, Array(STEP_COUNT).fill(false))
      grid.set(id, steps)
    }
  }
}

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const roomId = useMemo(() => getOrCreateRoomId(), [])
  const [provider, setProvider] = useState<WebrtcProvider | null>(null)

  const doc = useMemo(() => {
    const d = new Y.Doc()
    const grid = d.getMap<Y.Array<boolean>>('grid')
    initializeGrid(grid)
    return d
  }, [])

  const grid = useMemo(() => doc.getMap<Y.Array<boolean>>('grid'), [doc])

  useEffect(() => {
    const p = new WebrtcProvider(roomId, doc, {
      signaling: ['wss://signaling.yjs.dev'],
    })
    setProvider(p)
    return () => {
      p.destroy()
      setProvider(null)
    }
  }, [roomId, doc])

  return (
    <RoomContext.Provider value={{ doc, provider, grid, roomId }}>
      {children}
    </RoomContext.Provider>
  )
}
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: No TypeScript errors.

---

## Task 7: Collaboration — Shared Grid State Hook

**Files:**
- Create: `src/collaboration/useSharedState.ts`
- Modify: `src/components/Sequencer/Sequencer.tsx`

Replace local React state grid with Yjs-backed shared state.

**Step 1: Create useSharedState hook**

Create `src/collaboration/useSharedState.ts`:

```typescript
import { useCallback, useEffect, useState } from 'react'
import * as Y from 'yjs'
import { useRoom } from './RoomProvider'
import { TrackId, TRACKS } from '../audio/instruments'

const STEP_COUNT = 16

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
  const { grid } = useRoom()
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
      yArr.delete(stepIndex, 1)
      yArr.insert(stepIndex, [!current])
    },
    [grid]
  )

  return { grid: snapshot, toggleStep }
}
```

**Step 2: Update Sequencer.tsx to use shared state**

Replace `src/components/Sequencer/Sequencer.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { Grid } from './Grid'
import { Transport } from './Transport'
import { useTransport } from '../../store/useTransport'
import { useSharedGrid } from '../../collaboration/useSharedState'

export function Sequencer() {
  const { grid, toggleStep } = useSharedGrid()
  const gridRef = useRef(grid)
  gridRef.current = grid

  const { isPlaying, currentStep, bpm, initEngine, play, stop, setBpm } = useTransport()

  useEffect(() => {
    initEngine(() => gridRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-6 p-6 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl">
      <Transport
        isPlaying={isPlaying}
        bpm={bpm}
        currentStep={currentStep}
        onPlay={play}
        onStop={stop}
        onBpmChange={setBpm}
      />
      <Grid
        grid={grid}
        currentStep={currentStep}
        onToggle={toggleStep}
      />
    </div>
  )
}
```

**Step 3: Wrap App with RoomProvider**

Update `src/App.tsx`:

```tsx
import { Sequencer } from './components/Sequencer/Sequencer'
import { RoomProvider } from './collaboration/RoomProvider'

export default function App() {
  return (
    <RoomProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-8 gap-6">
        <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
          Music Bench
        </h1>
        <Sequencer />
      </div>
    </RoomProvider>
  )
}
```

**Step 4: Test collaborative editing**

```bash
npm run dev
```

Open two browser tabs to the same `?room=` URL.
Expected:
- Toggle a step in tab 1 → appears immediately in tab 2
- Tab 2 can also toggle steps → syncs back to tab 1
- Audio playback still works per-tab

**Step 5: Commit collab state**

```bash
git add src/
git commit -m "feat: add Yjs collaborative step grid with y-webrtc sync"
```

---

## Task 8: Presence

**Files:**
- Create: `src/collaboration/usePresence.ts`
- Create: `src/components/PresenceBar.tsx`
- Modify: `src/components/Sequencer/Sequencer.tsx`
- Modify: `src/components/Sequencer/StepButton.tsx` (already supports presenceColor prop)

**Step 1: Create usePresence hook**

Create `src/collaboration/usePresence.ts`:

```typescript
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRoom } from './RoomProvider'
import { TrackId } from '../audio/instruments'

export interface UserPresence {
  userId: string
  color: string
  displayName: string
  lastEditedStep: { trackId: TrackId; stepIndex: number } | null
}

// Visually distinct colors for presence
const PRESENCE_COLORS = [
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#10b981', // emerald (not green — that's used for active steps)
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ef4444', // red
]

function getColor(index: number): string {
  return PRESENCE_COLORS[index % PRESENCE_COLORS.length]
}

function randomName(): string {
  const adjectives = ['Jazz', 'Funky', 'Groovy', 'Mellow', 'Smooth']
  const nouns = ['Cat', 'Fox', 'Bear', 'Owl', 'Wolf']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adj} ${noun}`
}

export function usePresence() {
  const { provider, doc } = useRoom()
  const [users, setUsers] = useState<UserPresence[]>([])
  // step flash state: trackId+stepIndex → color
  const [flashes, setFlashes] = useState<Partial<Record<string, string>>>({})
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const myName = useRef(randomName())
  const myColor = useRef<string | null>(null)

  useEffect(() => {
    if (!provider) return

    const awareness = provider.awareness

    // Assign our own presence
    const existingStates = Array.from(awareness.getStates().values())
    const colorIndex = existingStates.length
    myColor.current = getColor(colorIndex)

    awareness.setLocalState({
      userId: doc.clientID.toString(),
      color: myColor.current,
      displayName: myName.current,
      lastEditedStep: null,
    } satisfies UserPresence)

    const update = () => {
      const states = Array.from(awareness.getStates().values()) as UserPresence[]
      setUsers(states.filter(Boolean))
    }

    awareness.on('change', update)
    update()

    return () => {
      awareness.off('change', update)
      awareness.setLocalState(null)
    }
  }, [provider, doc])

  const notifyEdit = useCallback(
    (trackId: TrackId, stepIndex: number) => {
      if (!provider || !myColor.current) return
      provider.awareness.setLocalStateField('lastEditedStep', { trackId, stepIndex })
    },
    [provider]
  )

  // Watch for other users' last-edited steps and flash them
  useEffect(() => {
    if (!provider) return
    const awareness = provider.awareness

    const onAwarenessChange = () => {
      const myId = doc.clientID.toString()
      awareness.getStates().forEach((state: UserPresence, clientId: number) => {
        if (clientId.toString() === myId) return
        if (!state?.lastEditedStep || !state.color) return
        const { trackId, stepIndex } = state.lastEditedStep
        const key = `${trackId}:${stepIndex}`

        // Flash this cell with the user's color for 500ms
        setFlashes((prev) => ({ ...prev, [key]: state.color }))

        const existing = flashTimers.current.get(key)
        if (existing) clearTimeout(existing)
        const timer = setTimeout(() => {
          setFlashes((prev) => {
            const next = { ...prev }
            delete next[key]
            return next
          })
          flashTimers.current.delete(key)
        }, 500)
        flashTimers.current.set(key, timer)
      })
    }

    awareness.on('change', onAwarenessChange)
    return () => awareness.off('change', onAwarenessChange)
  }, [provider, doc])

  return { users, flashes, notifyEdit }
}
```

**Step 2: Create PresenceBar**

Create `src/components/PresenceBar.tsx`:

```tsx
import type { UserPresence } from '../collaboration/usePresence'

interface PresenceBarProps {
  users: UserPresence[]
}

export function PresenceBar({ users }: PresenceBarProps) {
  if (users.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500 font-mono">{users.length} online</span>
      <div className="flex gap-1">
        {users.map((u) => (
          <div
            key={u.userId}
            title={u.displayName}
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black"
            style={{ backgroundColor: u.color }}
          >
            {u.displayName.charAt(0)}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 3: Wire presence into Sequencer**

Update `src/components/Sequencer/Sequencer.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { Grid } from './Grid'
import { Transport } from './Transport'
import { useTransport } from '../../store/useTransport'
import { useSharedGrid } from '../../collaboration/useSharedState'
import { usePresence } from '../../collaboration/usePresence'
import { PresenceBar } from '../PresenceBar'
import { TrackId } from '../../audio/instruments'

export function Sequencer() {
  const { grid, toggleStep } = useSharedGrid()
  const gridRef = useRef(grid)
  gridRef.current = grid

  const { isPlaying, currentStep, bpm, initEngine, play, stop, setBpm } = useTransport()
  const { users, flashes, notifyEdit } = usePresence()

  useEffect(() => {
    initEngine(() => gridRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleToggle(trackId: TrackId, stepIndex: number) {
    toggleStep(trackId, stepIndex)
    notifyEdit(trackId, stepIndex)
  }

  // Convert flat flash map to per-track presence color arrays for Grid
  const presenceFlashes: Partial<Record<TrackId, (string | null)[]>> = {}
  for (const [key, color] of Object.entries(flashes)) {
    const [trackId, stepStr] = key.split(':')
    const stepIndex = Number(stepStr)
    if (!presenceFlashes[trackId as TrackId]) {
      presenceFlashes[trackId as TrackId] = Array(16).fill(null)
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
        <PresenceBar users={users} />
      </div>
      <Grid
        grid={grid}
        currentStep={currentStep}
        presenceFlashes={presenceFlashes}
        onToggle={handleToggle}
      />
    </div>
  )
}
```

**Step 4: Test presence**

```bash
npm run dev
```

Open two tabs with the same `?room=` URL.
Expected:
- Both tabs show colored avatar dots in the PresenceBar
- Editing a step in one tab flashes that cell in the other tab with the editor's color
- Display names shown on hover

**Step 5: Commit presence**

```bash
git add src/
git commit -m "feat: add user presence with color avatars and step flash indicators"
```

---

## Task 9: Polish — Share Button & Final Touches

**Files:**
- Create: `src/components/Sequencer/ShareButton.tsx`
- Modify: `src/components/Sequencer/Sequencer.tsx`
- Create: `docs/plans/2026-03-17-sequencer-design.md`

**Step 1: Create ShareButton**

Create `src/components/Sequencer/ShareButton.tsx`:

```tsx
import { useState } from 'react'

export function ShareButton() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1 rounded text-xs font-mono border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors"
    >
      {copied ? '✓ Copied!' : 'Share Room'}
    </button>
  )
}
```

**Step 2: Add ShareButton to App header**

Update `src/App.tsx`:

```tsx
import { Sequencer } from './components/Sequencer/Sequencer'
import { RoomProvider } from './collaboration/RoomProvider'
import { ShareButton } from './components/Sequencer/ShareButton'

export default function App() {
  return (
    <RoomProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-8 gap-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
            Music Bench
          </h1>
          <ShareButton />
        </div>
        <Sequencer />
      </div>
    </RoomProvider>
  )
}
```

**Step 3: Write the design doc**

Create `docs/plans/2026-03-17-sequencer-design.md`:

```markdown
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
```

**Step 4: Final verification**

```bash
npm run dev
```

Full end-to-end checklist:
1. Page loads with a dark "Music Bench" header + Share Room button
2. URL contains `?room=<id>`
3. Grid shows 5 labeled tracks × 16 step buttons
4. Click steps to toggle
5. Hit Play — step indicator animates, drums play on active steps
6. Change BPM — tempo changes in real time
7. Open second tab with same URL
8. Toggle steps in tab 1 → sync to tab 2
9. PresenceBar shows 2 colored user avatars
10. Edit step in tab 2 → tab 1 flashes that cell in tab 2's color
11. Click "Share Room" → clipboard notification → paste URL in third tab → joins session

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: add share button and finalize v1 multiplayer sequencer"
```

---

## Verification Summary

| Check | Command / Action |
|---|---|
| TypeScript valid | `npm run build` — zero errors |
| Dev server | `npm run dev` — loads at localhost:5173 |
| Audio | Hit Play, activate steps → hear drums |
| Real-time sync | Two tabs, same room → edits sync instantly |
| Presence | Two tabs → colored avatars, step flash on edit |
| Share | Click "Share Room" → copies URL |
