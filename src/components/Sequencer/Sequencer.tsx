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
