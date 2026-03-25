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
  }, []
  )

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
