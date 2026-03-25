import { STEP_COUNT } from '../../config'

interface TransportProps {
  isPlaying: boolean
  bpm: number
  currentStep: number
  syncEnabled: boolean
  onPlay: () => void
  onStop: () => void
  onBpmChange: (bpm: number) => void
  onToggleSync: () => void
}

export function Transport({
  isPlaying,
  bpm,
  currentStep,
  syncEnabled,
  onPlay,
  onStop,
  onBpmChange,
  onToggleSync,
}: TransportProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <button
        onClick={isPlaying ? onStop : onPlay}
        className={[
          'px-5 py-2 rounded font-mono text-sm font-semibold transition-colors',
          isPlaying
            ? 'bg-red-500 hover:bg-red-400 text-white'
            : 'bg-emerald-500 hover:bg-emerald-400 text-black',
        ].join(' ')}
      >
        {isPlaying ? '■ Stop' : '▶ Play'}
      </button>

      <div className="flex items-center gap-2">
        <label htmlFor="bpm-input" className="text-xs text-zinc-400 font-mono">BPM</label>
        <input
          id="bpm-input"
          type="number"
          min={40}
          max={240}
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm font-mono text-zinc-100 text-center"
        />
      </div>

      {/* Step indicator dots */}
      <div className="flex gap-1">
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <div
            key={i}
            className={[
              'w-2 h-2 rounded-full transition-colors duration-75',
              i === currentStep ? 'bg-emerald-400' : 'bg-zinc-700',
            ].join(' ')}
          />
        ))}
      </div>

      <button
        onClick={onToggleSync}
        title={syncEnabled ? 'Sync on — your play/stop is shared with the room' : 'Sync off — your transport is independent'}
        className={[
          'px-3 py-1 rounded text-xs font-mono border transition-colors',
          syncEnabled
            ? 'border-blue-600 text-blue-400 bg-blue-950'
            : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500',
        ].join(' ')}
      >
        {syncEnabled ? '⟳ Sync On' : '⟳ Sync Off'}
      </button>
    </div>
  )
}
