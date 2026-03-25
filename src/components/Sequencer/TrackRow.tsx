import { StepButton } from './StepButton'

interface TrackRowProps {
  label: string
  steps: boolean[]
  currentStep: number
  presenceColors?: (string | null)[]
  onToggle: (stepIndex: number) => void
}

export function TrackRow({ label, steps, currentStep, presenceColors, onToggle }: TrackRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-right text-xs text-zinc-400 font-mono shrink-0">{label}</span>
      <div className="flex gap-1">
        {steps.map((active, i) => (
          <StepButton
            key={i}
            active={active}
            isCurrent={currentStep === i}
            presenceColor={presenceColors?.[i] ?? null}
            onToggle={() => onToggle(i)}
          />
        ))}
      </div>
    </div>
  )
}
