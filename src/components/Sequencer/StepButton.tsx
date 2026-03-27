import { useEffect, useRef, useState } from "react";

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
  const [anim, setAnim] = useState<"enable" | "disable" | "hit" | null>(null);
  const prevActive = useRef(active);
  const prevIsCurrent = useRef(isCurrent);

  useEffect(() => {
    const wasActive = prevActive.current;
    prevActive.current = active;
    if (!wasActive && active) {
      setAnim("enable");
      const t = setTimeout(() => setAnim(null), 350);
      return () => clearTimeout(t);
    }
    if (wasActive && !active) {
      setAnim("disable");
      const t = setTimeout(() => setAnim(null), 300);
      return () => clearTimeout(t);
    }
  }, [active]);

  useEffect(() => {
    const wasCurrent = prevIsCurrent.current;
    prevIsCurrent.current = isCurrent;
    if (isCurrent && !wasCurrent && active) {
      setAnim("hit");
      const t = setTimeout(() => setAnim(null), 250);
      return () => clearTimeout(t);
    }
  }, [isCurrent, active]);

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
          ? `${anim === "hit" ? "step-hit" : anim === "enable" ? "step-enable" : ""} bg-emerald-400 border-emerald-300`
          : anim === "disable"
            ? "step-disable bg-zinc-800 border-zinc-700"
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
