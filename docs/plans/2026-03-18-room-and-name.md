# Room Navigation and Display Name Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "New Room" button that navigates to a fresh room URL, and replace the random presence display name with a persistent, user-editable name stored in localStorage.

**Architecture:** Feature 1 is a pure UI component — clicking navigates via `window.location.href` assignment (full reload), so no Yjs cleanup is needed. Feature 2 extends `usePresence` to read/write `localStorage` and expose a `setDisplayName` setter that updates both localStorage and Yjs awareness simultaneously; a new inline `NameInput` component renders the edit affordance inside `Sequencer.tsx` where `usePresence` is already consumed.

**Tech Stack:** Vite 6, React 19, TypeScript 5.7, Tailwind v4, Yjs 13.6, y-webrtc 10.3, nanoid 5.1

---

## Task 1: New Room Button

**Files:**

- Create: `src/components/NewRoomButton.tsx`
- Modify: `src/App.tsx`

### Step 1: Create `NewRoomButton.tsx`

Create `src/components/NewRoomButton.tsx`:

```tsx
import { nanoid } from "nanoid";

export function NewRoomButton() {
  function handleClick() {
    window.location.href = window.location.origin + "?room=" + nanoid(8);
  }

  return (
    <button
      onClick={handleClick}
      className="px-3 py-1 rounded text-xs font-mono border border-zinc-700 text-zinc-600 hover:text-red-400 hover:border-red-800 transition-colors"
    >
      New Room
    </button>
  );
}
```

`window.location.href` triggers a full page reload — the existing Yjs doc is naturally destroyed, no cleanup needed. `nanoid(8)` matches the ID length used in `RoomProvider.tsx`.

### Step 2: Update `src/App.tsx`

Replace `src/App.tsx`:

```tsx
import { Sequencer } from "./components/Sequencer/Sequencer";
import { RoomProvider } from "./collaboration/RoomProvider";
import { ShareButton } from "./components/Sequencer/ShareButton";
import { NewRoomButton } from "./components/NewRoomButton";

export default function App() {
  return (
    <RoomProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-8 gap-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100">Music Bench</h1>
          <ShareButton />
          <NewRoomButton />
        </div>
        <Sequencer />
      </div>
    </RoomProvider>
  );
}
```

### Step 3: Verify build

```bash
npm run build
```

Expected: clean build, no TypeScript errors.

### Step 4: Visual check

```bash
npm run dev
```

1. Header shows "Music Bench" | "Share Room" | "New Room"
2. "New Room" is visually muted (dark text/border), red tint on hover
3. Clicking navigates to a new `?room=XXXXXXXX` URL and reloads into a fresh empty room
4. The old room URL still works when pasted back

### Step 5: Commit

```bash
git add src/components/NewRoomButton.tsx src/App.tsx
git commit -m "feat: add New Room button that navigates to a fresh room"
```

---

## Task 2: Persist Display Name in localStorage

**Files:**

- Modify: `src/collaboration/usePresence.ts`

### Step 1: Update `usePresence.ts`

Replace `src/collaboration/usePresence.ts`:

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import { useRoom } from "./RoomProvider";
import { TrackId } from "../audio/instruments";

export interface UserPresence {
  userId: string;
  color: string;
  displayName: string;
  lastEditedStep: { trackId: TrackId; stepIndex: number } | null;
}

// Visually distinct colors for presence
const PRESENCE_COLORS = [
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#10b981", // emerald (not green — that's used for active steps)
  "#f97316", // orange
  "#06b6d4", // cyan
  "#ef4444", // red
];

const DISPLAY_NAME_KEY = "musicbench:displayName";

function getColor(index: number): string {
  return PRESENCE_COLORS[index % PRESENCE_COLORS.length];
}

function randomName(): string {
  const adjectives = ["Jazz", "Funky", "Groovy", "Mellow", "Smooth"];
  const nouns = ["Cat", "Fox", "Bear", "Owl", "Wolf"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

function getInitialName(): string {
  return localStorage.getItem(DISPLAY_NAME_KEY) ?? randomName();
}

export function usePresence() {
  const { provider, doc } = useRoom();
  const [users, setUsers] = useState<UserPresence[]>([]);
  // step flash state: trackId+stepIndex → color
  const [flashes, setFlashes] = useState<Partial<Record<string, string>>>({});
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const myName = useRef(getInitialName());
  const myColor = useRef<string | null>(null);

  useEffect(() => {
    if (!provider) return;

    const awareness = provider.awareness;

    myColor.current = getColor(doc.clientID);

    awareness.setLocalState({
      userId: doc.clientID.toString(),
      color: myColor.current,
      displayName: myName.current,
      lastEditedStep: null,
    } satisfies UserPresence);

    const update = () => {
      const states = Array.from(awareness.getStates().values()) as UserPresence[];
      setUsers(states.filter(Boolean));
    };

    awareness.on("change", update);
    update();

    return () => {
      awareness.off("change", update);
      awareness.setLocalState(null);
    };
  }, [provider, doc]);

  const setDisplayName = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      localStorage.setItem(DISPLAY_NAME_KEY, trimmed);
      myName.current = trimmed;
      if (provider) {
        provider.awareness.setLocalStateField("displayName", trimmed);
      }
    },
    [provider],
  );

  const notifyEdit = useCallback(
    (trackId: TrackId, stepIndex: number) => {
      if (!provider || !myColor.current) return;
      provider.awareness.setLocalStateField("lastEditedStep", { trackId, stepIndex });
    },
    [provider],
  );

  // Watch for other users' last-edited steps and flash them
  useEffect(() => {
    if (!provider) return;
    const awareness = provider.awareness;

    const onAwarenessChange = ({
      added,
      updated,
    }: {
      added: number[];
      updated: number[];
      removed: number[];
    }) => {
      const myId = doc.clientID;
      const changed = [...added, ...updated].filter((id) => id !== myId);

      changed.forEach((clientId) => {
        const state = awareness.getStates().get(clientId) as UserPresence | undefined;
        if (!state?.lastEditedStep || !state.color) return;
        const { trackId, stepIndex } = state.lastEditedStep;
        const key = `${trackId}:${stepIndex}`;

        setFlashes((prev) => ({ ...prev, [key]: state.color }));

        const existing = flashTimers.current.get(key);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          setFlashes((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          flashTimers.current.delete(key);
        }, 500);
        flashTimers.current.set(key, timer);
      });
    };

    awareness.on("change", onAwarenessChange);
    return () => awareness.off("change", onAwarenessChange);
  }, [provider, doc]);

  return { users, flashes, notifyEdit, setDisplayName };
}
```

Changes vs. original:

- Added `DISPLAY_NAME_KEY` constant
- `getInitialName()` reads localStorage first, falls back to `randomName()`
- `myName.current` initialized from `getInitialName()` instead of `randomName()`
- Added `setDisplayName` callback: trims, rejects empty, persists to localStorage, updates `myName.current` and awareness
- `setDisplayName` added to return value

### Step 2: Verify build

```bash
npm run build
```

Expected: clean build. `setDisplayName: (name: string) => void` now part of the `usePresence` return type.

### Step 3: Commit

```bash
git add src/collaboration/usePresence.ts
git commit -m "feat: persist display name in localStorage, expose setDisplayName from usePresence"
```

---

## Task 3: Inline Name Edit Component

**Files:**

- Create: `src/components/NameInput.tsx`
- Modify: `src/components/Sequencer/Sequencer.tsx`

### Step 1: Create `src/components/NameInput.tsx`

```tsx
import { useRef, useState } from "react";
import { usePresence } from "../collaboration/usePresence";
import { useRoom } from "../collaboration/RoomProvider";

export function NameInput() {
  const { doc } = useRoom();
  const { users, setDisplayName } = usePresence();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const myUserId = doc.clientID.toString();
  const me = users.find((u) => u.userId === myUserId);
  const currentName = me?.displayName ?? "…";

  function startEditing() {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    const val = inputRef.current?.value ?? "";
    if (val.trim()) setDisplayName(val.trim());
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        defaultValue={currentName}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        maxLength={32}
        className="w-32 px-1 py-0.5 rounded text-xs font-mono bg-zinc-800 border border-zinc-600 text-zinc-100 outline-none focus:border-zinc-400"
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={startEditing}
      title="Click to change your name"
      className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors group"
    >
      <span>{currentName}</span>
      <span
        className="opacity-0 group-hover:opacity-60 transition-opacity text-zinc-500"
        aria-hidden
      >
        ✎
      </span>
    </button>
  );
}
```

Notes:

- `useRoom()` is safe here — `NameInput` is rendered inside `<Sequencer>` which is a child of `<RoomProvider>`
- `usePresence()` called a second time: React shares state through the same Yjs subscription; both callers re-render on the same awareness changes
- `defaultValue` (not `value`) keeps input uncontrolled — avoids re-render loops while typing
- Escape cancels without saving; empty submission is silently ignored

### Step 2: Update `src/components/Sequencer/Sequencer.tsx`

Replace `src/components/Sequencer/Sequencer.tsx`:

```tsx
import { useEffect, useRef } from "react";
import { Grid } from "./Grid";
import { Transport } from "./Transport";
import { useTransport } from "../../store/useTransport";
import { useSharedGrid } from "../../collaboration/useSharedState";
import { usePresence } from "../../collaboration/usePresence";
import { PresenceBar } from "../PresenceBar";
import { NameInput } from "../NameInput";
import { TrackId } from "../../audio/instruments";
import { STEP_COUNT } from "../../config";

export function Sequencer() {
  const { grid, toggleStep } = useSharedGrid();
  const gridRef = useRef(grid);
  gridRef.current = grid;

  const { isPlaying, currentStep, bpm, initEngine, play, stop, setBpm } = useTransport();
  const { users, flashes, notifyEdit } = usePresence();

  useEffect(() => {
    initEngine(() => gridRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleToggle(trackId: TrackId, stepIndex: number) {
    toggleStep(trackId, stepIndex);
    notifyEdit(trackId, stepIndex);
  }

  // Convert flat flash map to per-track presence color arrays for Grid
  const presenceFlashes: Partial<Record<TrackId, (string | null)[]>> = {};
  for (const [key, color] of Object.entries(flashes)) {
    const [trackId, stepStr] = key.split(":");
    const stepIndex = Number(stepStr);
    if (!presenceFlashes[trackId as TrackId]) {
      presenceFlashes[trackId as TrackId] = Array(STEP_COUNT).fill(null);
    }
    presenceFlashes[trackId as TrackId]![stepIndex] = color ?? null;
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
        onToggle={handleToggle}
      />
    </div>
  );
}
```

Change: added `NameInput` import, wrapped `<NameInput />` and `<PresenceBar />` in a `flex items-center gap-3` div at the right side of the transport row.

### Step 3: Verify build

```bash
npm run build
```

Expected: clean build, no TypeScript errors.

### Step 4: Visual check

```bash
npm run dev
```

1. Sequencer top-right: current name (e.g. "Groovy Bear") with pencil icon on hover
2. Click name → input appears pre-filled, text selected
3. Type new name + Enter → name updates
4. Escape → reverts, no save
5. Empty submit → ignored
6. Reload → name persists (check DevTools → Local Storage → `musicbench:displayName`)
7. Two tabs, same room → changing name in one tab updates the avatar tooltip in the other

### Step 5: Commit

```bash
git add src/components/NameInput.tsx src/components/Sequencer/Sequencer.tsx
git commit -m "feat: add inline NameInput with localStorage persistence and live awareness sync"
```

---

## Task 4: Final Smoke Test

No code changes — verify everything works together.

### Step 1: Production build

```bash
npm run build && npm run preview
```

Open `http://localhost:4173`. Verify:

1. Header: "Music Bench" | "Share Room" | "New Room"
2. Sequencer: Transport on left, `NameInput` + avatars on right
3. "New Room" → fresh `?room=` URL, empty grid
4. Name edit persists through reload
5. Two tabs, same room: grid edits sync, presence avatars update, name changes propagate
