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
  const stored = localStorage.getItem(DISPLAY_NAME_KEY);
  if (stored) return stored;
  const name = randomName();
  localStorage.setItem(DISPLAY_NAME_KEY, name);
  return name;
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
