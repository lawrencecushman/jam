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
