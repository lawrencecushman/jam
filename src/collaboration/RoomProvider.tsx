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

    // WebSocket sync: fires when the server delivers persisted state
    wsProvider.on('sync', (synced: boolean) => {
      if (synced) ensureInit()
    })
    if (wsProvider.synced) ensureInit()

    // WebRTC sync: fires when a peer delivers state (works without the WS server,
    // e.g. remote users accessing via ngrok who can't reach ws://localhost:1234)
    webrtcProvider.on('synced', ({ synced }: { synced: boolean }) => {
      if (synced) ensureInit()
    })

    // Last-resort fallback: if neither provider syncs within 3s, initialize anyway
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
