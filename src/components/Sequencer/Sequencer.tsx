import { useEffect, useRef } from 'react'
import { Grid } from './Grid'
import { Transport } from './Transport'
import { useTransport } from '../../store/useTransport'
import { useSharedGrid } from '../../collaboration/useSharedState'

export function Sequencer() {
  const { grid, toggleStep } = useSharedGrid()
  const gridRef = useRef(grid)
  gridRef.current = grid

  const { isPlaying, currentStep, bpm, initEngine, play, stop, setBpm } = useTransport()

  useEffect(() => {
    initEngine(() => gridRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
