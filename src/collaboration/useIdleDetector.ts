import { useEffect, useRef } from "react";

const IDLE_MS = 5 * 60 * 1_000; // 5 minutes
const EVENTS = ["pointermove", "pointerdown", "keydown", "touchstart"] as const;

/**
 * Calls onIdle after IDLE_MS of no user activity.
 * Calls onWake on the first activity event after going idle.
 * Uses refs for callbacks so the effect never needs to re-run.
 */
export function useIdleDetector(onIdle: () => void, onWake: () => void) {
  const onIdleRef = useRef(onIdle);
  const onWakeRef = useRef(onWake);
  onIdleRef.current = onIdle;
  onWakeRef.current = onWake;

  useEffect(() => {
    let idle = false;
    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      clearTimeout(timer);
      if (idle) {
        idle = false;
        onWakeRef.current();
      }
      timer = setTimeout(() => {
        idle = true;
        onIdleRef.current();
      }, IDLE_MS);
    };

    reset(); // arm the timer immediately on mount
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []); // stable — callbacks accessed via refs
}
