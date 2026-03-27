interface StepButtonProps {
  active: boolean;
  isCurrent: boolean;
  isBeat: boolean;
  presenceColor?: string | null;
  trackId: string;
  stepIndex: number;
  onPointerDown: () => void;
  onPointerEnter: () => void;
}

export function StepButton({
  active,
  isCurrent,
  isBeat,
  presenceColor,
  trackId,
  stepIndex,
  onPointerDown,
  onPointerEnter,
}: StepButtonProps) {
  return (
    <button
      data-track={trackId}
      data-step={stepIndex}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onPointerDown();
        }
      }}
      style={{
        touchAction: "none",
        ...(presenceColor ? { boxShadow: `0 0 0 2px ${presenceColor}` } : {}),
      }}
      className={[
        "w-8 h-8 rounded-sm border transition-colors duration-75 cursor-pointer select-none",
        active
          ? "step-active bg-emerald-400 border-emerald-300"
          : isBeat
            ? "bg-zinc-800 border-zinc-600 hover:bg-zinc-700"
            : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700",
        isCurrent && active
          ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-950"
          : isCurrent
            ? "ring-2 ring-zinc-400 ring-offset-1 ring-offset-zinc-950"
            : "",
      ].join(" ")}
      aria-pressed={active}
    />
  );
}
