import { useEffect, useRef } from 'react';

/**
 * Drives a `--glint-x`/`--glint-y` (0–100%) pair on the returned element from
 * real pointer movement, for a CSS light-catching highlight (see
 * CareerCard.module.css / CareerCrystal.module.css). Writes only a CSS custom
 * property per animation frame — no React state, no re-render.
 *
 * Only attaches on devices that can actually hover with a precise pointer,
 * and never when the visitor prefers reduced motion; the element's own CSS
 * should set a fixed default for `--glint-x`/`--glint-y` so both of those
 * cases still render a complete, beautiful static look with zero JS.
 */
export function usePointerGlint<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let pendingX = 0;
    let pendingY = 0;

    function apply() {
      raf = 0;
      el!.style.setProperty('--glint-x', `${pendingX}%`);
      el!.style.setProperty('--glint-y', `${pendingY}%`);
    }

    function handleMove(e: PointerEvent) {
      const rect = el!.getBoundingClientRect();
      pendingX = rect.width ? ((e.clientX - rect.left) / rect.width) * 100 : 50;
      pendingY = rect.height ? ((e.clientY - rect.top) / rect.height) * 100 : 50;
      if (!raf) raf = requestAnimationFrame(apply);
    }

    function handleLeave() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      el!.style.removeProperty('--glint-x');
      el!.style.removeProperty('--glint-y');
    }

    el.addEventListener('pointermove', handleMove);
    el.addEventListener('pointerleave', handleLeave);
    return () => {
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerleave', handleLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return ref;
}
