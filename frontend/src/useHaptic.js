import { useCallback, useEffect } from "react";

let lastPulseAt = 0;

function vibrate(pattern, force = false) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
  if (!force && Date.now() - lastPulseAt < 140) return false;
  try {
    const played = navigator.vibrate(pattern);
    lastPulseAt = Date.now();
    return played;
  } catch {
    return false;
  }
}

function delegatedTap() {
  if (Date.now() - lastPulseAt < 140) return;
  vibrate([10]);
}

export function useButtonHaptics() {
  useEffect(() => {
    const onClick = (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("button, [role='button'], [role='tab'], [data-haptic]");
      if (!button || button.matches(":disabled, [aria-disabled='true']")) return;
      delegatedTap();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
}

export function useHaptic() {
  const triggerLightTap = useCallback(() => vibrate([10]), []);
  const triggerSuccess = useCallback(() => vibrate([30, 50, 30], true), []);
  return { triggerLightTap, triggerSuccess };
}
