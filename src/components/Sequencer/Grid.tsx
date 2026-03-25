import { TrackRow } from './TrackRow'
import { TRACKS, TrackId } from '../../audio/instruments'

interface GridProps {
  grid: Record<TrackId, boolean[]>
  currentStep: number
  presenceFlashes?: Partial<Record<TrackId, (string | null)[]>>
  onToggle: (trackId: TrackId, stepIndex: number) => void
}

export function Grid({ grid, currentStep, presenceFlashes, onToggle }: GridProps) {
  return (
    <div className="flex flex-col gap-2">
      {TRACKS.map(({ id, label }) => (
        <TrackRow
          key={id}
          label={label}
          steps={grid[id]}
          currentStep={currentStep}
          presenceColors={presenceFlashes?.[id]}
          onToggle={(stepIndex) => onToggle(id, stepIndex)}
        />
      ))}
    </div>
  )
}
