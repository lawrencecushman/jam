import { useEffect, useRef } from "react";
import { TrackRow } from "./TrackRow";
import { TRACKS, TrackId } from "../../audio/instruments";
import { STEP_COUNT } from "../../config";

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

  // On touch/mobile the pointer is captured by the first element touched,
  // so pointerenter never fires on other steps during a drag. Use pointermove
  // on the container + elementFromPoint to find the step under the finger.
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    const btn = el.closest("[data-track][data-step]") as HTMLElement | null;
    if (!btn) return;
    const trackId = btn.dataset.track as TrackId;
    const stepIndex = parseInt(btn.dataset.step ?? "", 10);
    if (!trackId || isNaN(stepIndex)) return;
    onPaint(trackId, stepIndex, dragRef.current.paintMode);
  }

  return (
    <div className="flex flex-col gap-2" onPointerMove={handlePointerMove}>
      {TRACKS.map(({ id, label }) => (
        <TrackRow
          key={id}
          trackId={id}
          label={label}
          steps={grid[id].slice(0, STEP_COUNT)}
          currentStep={currentStep}
          presenceColors={presenceFlashes?.[id]}
          onPointerDown={(stepIndex) => handlePointerDown(id, stepIndex)}
          onPointerEnter={(stepIndex) => handlePointerEnter(id, stepIndex)}
        />
      ))}
    </div>
  );
}
