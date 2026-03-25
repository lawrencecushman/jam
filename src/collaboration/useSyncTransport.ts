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
