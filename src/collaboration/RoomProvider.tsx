import { createContext, useContext, useEffect, useMemo, useState } from 'react'
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

  const doc = useMemo(() => {
    const d = new Y.Doc()
    const grid = d.getMap<Y.Array<boolean>>('grid')
    initializeGrid(d, grid)
    return d
  }, [])

  const grid = useMemo(() => doc.getMap<Y.Array<boolean>>('grid'), [doc])

  // provider is null on first render (before this effect runs).
  // usePresence must guard against null before accessing provider.awareness.
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
