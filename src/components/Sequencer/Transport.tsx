interface TransportProps {
  isPlaying: boolean
  bpm: number
  currentStep: number
  onPlay: () => void
  onStop: () => void
  onBpmChange: (bpm: number) => void
}

export function Transport({ isPlaying, bpm, currentStep, onPlay, onStop, onBpmChange }: TransportProps) {
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
        <label className="text-xs text-zinc-400 font-mono">BPM</label>
        <input
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
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={i}
            className={[
              'w-2 h-2 rounded-full transition-colors duration-75',
              i === currentStep ? 'bg-emerald-400' : 'bg-zinc-700',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  )
}
