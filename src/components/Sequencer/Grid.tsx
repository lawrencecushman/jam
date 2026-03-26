import { useEffect, useRef } from "react";
import { TrackRow } from "./TrackRow";
import { TRACKS, TrackId } from "../../audio/instruments";

interface GridProps {
  grid: Record<TrackId, boolean[]>;
  currentStep: number;
  presenceFlashes?: Partial<Record<TrackId, (string | null)[]>>;
  onPaint: (trackId: TrackId, stepIndex: number, value: boolean) => void;
}

export function Grid({ grid, currentStep, presenceFlashes, onPaint }: GridProps) {
  const dragRef = useRef<{ paintMode: boolean } | null>(null);

  useEffect(() => {
    const endDrag = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  function handlePointerDown(trackId: TrackId, stepIndex: number) {
    const currentValue = grid[trackId][stepIndex];
    const paintMode = !currentValue;
    dragRef.current = { paintMode };
    onPaint(trackId, stepIndex, paintMode);
  }

  function handlePointerEnter(trackId: TrackId, stepIndex: number) {
    if (!dragRef.current) return;
    onPaint(trackId, stepIndex, dragRef.current.paintMode);
  }

  return (
    <div className="flex flex-col gap-2">
      {TRACKS.map(({ id, label }) => (
        <TrackRow
          key={id}
          label={label}
          steps={grid[id]}
          currentStep={currentStep}
          presenceColors={presenceFlashes?.[id]}
          onPointerDown={(stepIndex) => handlePointerDown(id, stepIndex)}
          onPointerEnter={(stepIndex) => handlePointerEnter(id, stepIndex)}
        />
      ))}
    </div>
  );
}
