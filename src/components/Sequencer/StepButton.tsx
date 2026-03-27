import { useEffect, useRef } from "react";

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

const ENABLE_KEYFRAMES: Keyframe[] = [
  { transform: "scale(1.15)", boxShadow: "0 0 12px 4px rgb(52 211 153 / 0.5)" },
  { transform: "scale(1)", boxShadow: "0 0 0 0 rgb(52 211 153 / 0)" },
];

const DISABLE_KEYFRAMES: Keyframe[] = [
  { transform: "scale(0.82)", opacity: "0.5" },
  { transform: "scale(1)", opacity: "1" },
];

const HIT_KEYFRAMES: Keyframe[] = [
  { transform: "scale(1.2)", boxShadow: "0 0 18px 6px rgb(52 211 153 / 0.75)" },
  { transform: "scale(1)", boxShadow: "0 0 0 0 rgb(52 211 153 / 0)" },
];

function play(el: HTMLElement, keyframes: Keyframe[], duration: number) {
  el.getAnimations().forEach((a) => a.cancel());
  el.animate(keyframes, { duration, easing: "ease-out", fill: "none" });
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
  const btnRef = useRef<HTMLButtonElement>(null);
  const prevActive = useRef(active);
  const prevIsCurrent = useRef(isCurrent);

  useEffect(() => {
    const wasActive = prevActive.current;
    prevActive.current = active;
    if (!btnRef.current) return;
    if (!wasActive && active) play(btnRef.current, ENABLE_KEYFRAMES, 350);
    if (wasActive && !active) play(btnRef.current, DISABLE_KEYFRAMES, 300);
  }, [active]);

  useEffect(() => {
    const wasCurrent = prevIsCurrent.current;
    prevIsCurrent.current = isCurrent;
    if (isCurrent && !wasCurrent && active && btnRef.current) {
      play(btnRef.current, HIT_KEYFRAMES, 250);
    }
  }, [isCurrent, active]);

  return (
    <button
      ref={btnRef}
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
          ? "bg-emerald-400 border-emerald-300"
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
