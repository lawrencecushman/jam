import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { WebsocketProvider } from "y-websocket";
import { TRACKS } from "../audio/instruments";
import { STEP_COUNT } from "../config";
import { useIdleDetector } from "./useIdleDetector";

// In development these default to localhost / public server.
// Set VITE_WS_URL and VITE_SIGNALING_URL in your environment for production.
const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:1234";
const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL ?? `${WS_URL}/signaling`;

interface RoomContextValue {
  doc: Y.Doc;
  provider: WebrtcProvider | null;
  grid: Y.Map<Y.Array<boolean>>;
  roomId: string;
  connected: boolean;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used inside RoomProvider");
  return ctx;
}

function getOrCreateRoomId(): string {
  const id = new URLSearchParams(window.location.search).get("room");
  if (!id) throw new Error("RoomProvider rendered without a ?room= param");
  return id;
}

function initializeGrid(doc: Y.Doc, grid: Y.Map<Y.Array<boolean>>) {
  doc.transact(() => {
    for (const { id } of TRACKS) {
      if (!grid.has(id)) {
        const steps = new Y.Array<boolean>();
        steps.insert(0, Array(STEP_COUNT).fill(false));
        grid.set(id, steps);
      } else {
        // Trim any extra steps caused by concurrent initialization races
        const steps = grid.get(id)!;
        if (steps.length > STEP_COUNT) {
          steps.delete(STEP_COUNT, steps.length - STEP_COUNT);
        }
      }
    }
  });
}

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const roomId = useMemo(() => getOrCreateRoomId(), []);
  const [provider, setProvider] = useState<WebrtcProvider | null>(null);
  const [connected, setConnected] = useState(true);

  const doc = useMemo(() => new Y.Doc(), []);
  const grid = useMemo(() => doc.getMap<Y.Array<boolean>>("grid"), [doc]);

  // Idle detector: disconnect after 5 min of inactivity, reconnect on any activity.
  useIdleDetector(
    useCallback(() => setConnected(false), []),
    useCallback(() => setConnected(true), []),
  );

  useEffect(() => {
    // When idle-disconnected, leave providers destroyed.
    if (!connected) return;

    // Skip WebSocket if page is HTTPS but WS_URL is plain ws:// — the browser will
    // block the connection as mixed content (e.g. app loaded via ngrok over https
    // but the local persistence server is on ws://localhost:1234).
    const wsAvailable = !(window.location.protocol === "https:" && WS_URL.startsWith("ws://"));

    // WebSocket provider: connects to the persistence server.
    const wsProvider = wsAvailable ? new WebsocketProvider(WS_URL, roomId, doc) : null;

    // WebRTC provider: low-latency P2P sync between browser tabs + awareness (presence).
    const webrtcProvider = new WebrtcProvider(roomId, doc, {
      signaling: [SIGNALING_URL],
    });

    // Initialize grid tracks once the server has delivered any persisted state.
    // initializeGrid is idempotent — it only adds tracks that don't exist yet.
    let done = false;
    const ensureInit = () => {
      if (done) return;
      done = true;
      initializeGrid(doc, grid);
    };

    wsProvider?.on("sync", (synced: boolean) => {
      if (synced) ensureInit();
    });
    if (wsProvider?.synced) ensureInit();

    webrtcProvider.on("synced", ({ synced }: { synced: boolean }) => {
      if (synced) ensureInit();
    });

    // Last-resort fallback: if neither provider syncs within 3s, initialize anyway
    const fallback = setTimeout(ensureInit, 3000);

    setProvider(webrtcProvider);

    return () => {
      clearTimeout(fallback);
      wsProvider?.destroy();
      webrtcProvider.destroy();
      setProvider(null);
    };
  }, [roomId, doc, grid, connected]);

  return (
    <RoomContext.Provider value={{ doc, provider, grid, roomId, connected }}>
      {children}
    </RoomContext.Provider>
  );
}
