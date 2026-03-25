import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { nanoid } from 'nanoid'
import { TRACKS } from '../audio/instruments'
import { STEP_COUNT } from '../config'

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

function getOrCreateRoomId(): { roomId: string; isNewRoom: boolean } {
  const params = new URLSearchParams(window.location.search)
  const existing = params.get('room')
  if (existing) return { roomId: existing, isNewRoom: false }

  const id = nanoid(8)
  const url = new URL(window.location.href)
  url.searchParams.set('room', id)
  window.history.replaceState(null, '', url.toString())
  return { roomId: id, isNewRoom: true }
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
  const { roomId, isNewRoom } = useMemo(() => getOrCreateRoomId(), [])
  const [provider, setProvider] = useState<WebrtcProvider | null>(null)

  const doc = useMemo(() => {
    const d = new Y.Doc()
    if (isNewRoom) {
      // New room — safe to initialize immediately, no peers have data yet
      initializeGrid(d, d.getMap<Y.Array<boolean>>('grid'))
    }
    return d
  }, [isNewRoom])

  const grid = useMemo(() => doc.getMap<Y.Array<boolean>>('grid'), [doc])

  useEffect(() => {
    const p = new WebrtcProvider(roomId, doc, {
      // Multiple signaling servers for reliability
      signaling: [
        'wss://signaling.yjs.dev',
        'wss://y-webrtc-signaling-eu.herokuapp.com',
      ],
    })

    if (!isNewRoom) {
      // Joining an existing room — defer initialization until after peer sync
      // so we don't overwrite the room creator's data (Y.Map is last-write-wins).
      // Fallback: if no peers found within 2s, initialize as an empty new room.
      let done = false
      const ensureInit = () => {
        if (done) return
        done = true
        if (grid.size === 0) initializeGrid(doc, grid)
      }

      p.on('synced', ({ synced }: { synced: boolean }) => {
        if (synced) ensureInit()
      })
      const fallback = setTimeout(ensureInit, 2000)

      const origDestroy = p.destroy.bind(p)
      p.destroy = () => {
        clearTimeout(fallback)
        origDestroy()
      }
    }

    // provider is null on first render (before this effect runs).
    // usePresence must guard against null before accessing provider.awareness.
    setProvider(p)
    return () => {
      p.destroy()
      setProvider(null)
    }
  }, [roomId, doc, grid, isNewRoom])

  return (
    <RoomContext.Provider value={{ doc, provider, grid, roomId }}>
      {children}
    </RoomContext.Provider>
  )
}
