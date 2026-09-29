import { useEffect, useRef } from 'react';

const MAX_TILT_DEG = 6;

/**
 * Drives `--tilt-x`/`--tilt-y` (rotation degrees) and `--glint-x`/`--glint-y`
 * (0–100%) on the returned element from real pointer movement, for the
 * podium collectible-card tilt + foil highlight (see PodiumCard.module.css).
 * Same contract as usePointerGlint: one CSS custom property write per
 * animation frame, no React state; only attaches on devices that can
 * actually hover with a precise pointer, and never when the visitor prefers
 * reduced motion. The element's own CSS should default those four
 * properties to a flat, centered look so every other case — touch, reduced
 * motion, keyboard-only — still renders a complete static card.
 */
export function usePointerTilt<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let px = 0.5;
    let py = 0.5;

    function apply() {
      raf = 0;
      el!.style.setProperty('--glint-x', `${px * 100}%`);
      el!.style.setProperty('--glint-y', `${py * 100}%`);
      el!.style.setProperty('--tilt-x', `${(0.5 - py) * 2 * MAX_TILT_DEG}deg`);
      el!.style.setProperty('--tilt-y', `${(px - 0.5) * 2 * MAX_TILT_DEG}deg`);
    }

    function handleMove(e: PointerEvent) {
      const rect = el!.getBoundingClientRect();
      px = rect.width ? (e.clientX - rect.left) / rect.width : 0.5;
      py = rect.height ? (e.clientY - rect.top) / rect.height : 0.5;
      if (!raf) raf = requestAnimationFrame(apply);
    }

    function reset() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      el!.style.removeProperty('--glint-x');
      el!.style.removeProperty('--glint-y');
      el!.style.removeProperty('--tilt-x');
      el!.style.removeProperty('--tilt-y');
    }

    el.addEventListener('pointermove', handleMove);
    el.addEventListener('pointerleave', reset);
    return () => {
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerleave', reset);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return ref;
}
