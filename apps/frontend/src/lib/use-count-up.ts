'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 to `target` with an ease-out curve.
 * Uses a single requestAnimationFrame loop — no layout thrash,
 * and it respects `prefers-reduced-motion` by jumping straight to target.
 */
export function useCountUp(target: number, duration = 1400): number {
  const [value, setValue] = useState(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      }
    };
    frame.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value;
}