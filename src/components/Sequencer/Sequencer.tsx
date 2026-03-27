import { useEffect, useRef } from "react";
import { Grid } from "./Grid";
import { Transport } from "./Transport";
import { useTransport } from "../../store/useTransport";
import { useSharedGrid } from "../../collaboration/useSharedState";
import { usePresence } from "../../collaboration/usePresence";
import { useSyncTransport } from "../../collaboration/useSyncTransport";
import { TrackId } from "../../audio/instruments";
import { STEP_COUNT } from "../../config";

export function Sequencer() {
  const { grid, paintStep } = useSharedGrid();
  const gridRef = useRef(grid);
  gridRef.current = grid;

  const { isPlaying, currentStep, bpm, initEngine, setBpm } = useTransport();
  const { flashes, notifyEdit } = usePresence();
  const { syncPlay, syncStop } = useSyncTransport();

  useEffect(() => {
    initEngine(() => gridRef.current);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePaint(trackId: TrackId, stepIndex: number, value: boolean) {
    paintStep(trackId, stepIndex, value);
    notifyEdit(trackId, stepIndex);
  }

  // Convert flat flash map to per-track presence color arrays for Grid
  const presenceFlashes: Partial<Record<TrackId, (string | null)[]>> = {};
  for (const [key, color] of Object.entries(flashes)) {
    const [trackId, stepStr] = key.split(":");
    const stepIndex = Number(stepStr);
    if (!presenceFlashes[trackId as TrackId]) {
      presenceFlashes[trackId as TrackId] = Array(STEP_COUNT).fill(null);
    }
    presenceFlashes[trackId as TrackId]![stepIndex] = color ?? null;
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-3 sm:p-6 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl">
      <Transport
        isPlaying={isPlaying}
        bpm={bpm}
        currentStep={currentStep}
        onPlay={syncPlay}
        onStop={syncStop}
        onBpmChange={setBpm}
      />
      <Grid
        grid={grid}
        currentStep={currentStep}
        presenceFlashes={presenceFlashes}
        onPaint={handlePaint}
      />
    </div>
  );
}
