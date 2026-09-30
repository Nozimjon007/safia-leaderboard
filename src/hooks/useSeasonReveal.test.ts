import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSeasonReveal } from './useSeasonReveal';

describe('useSeasonReveal', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('plays on the first-ever view of a season', () => {
    const { result } = renderHook(() => useSeasonReveal('2026-q3'));
    expect(result.current.shouldAnimate).toBe(true);
  });

  it('does not play again on a re-render with the same season id (e.g. typing in search)', () => {
    const { result, rerender } = renderHook(({ id }) => useSeasonReveal(id), { initialProps: { id: '2026-q3' } });
    expect(result.current.shouldAnimate).toBe(true);
    const firstKey = result.current.playKey;

    // Re-render several times with the identical season id, exactly what happens on every keystroke.
    rerender({ id: '2026-q3' });
    rerender({ id: '2026-q3' });
    expect(result.current.shouldAnimate).toBe(true); // still true from the same play — key must not change
    expect(result.current.playKey).toBe(firstKey);
  });

  it('does not play on a second mount of the same season (already marked seen)', () => {
    const first = renderHook(() => useSeasonReveal('2026-q3'));
    expect(first.result.current.shouldAnimate).toBe(true);
    first.unmount();

    const second = renderHook(() => useSeasonReveal('2026-q3'));
    expect(second.result.current.shouldAnimate).toBe(false);
  });

  it('plays independently for a different season, even after another season was already seen', () => {
    const first = renderHook(() => useSeasonReveal('2026-q3'));
    expect(first.result.current.shouldAnimate).toBe(true);

    const { result, rerender } = renderHook(({ id }: { id: string | null }) => useSeasonReveal(id), { initialProps: { id: '2026-q3' as string | null } });
    rerender({ id: '2026-q1' });
    expect(result.current.shouldAnimate).toBe(true); // a season never seen before
  });

  it('replays on demand even though the season was already marked seen', () => {
    const first = renderHook(() => useSeasonReveal('2026-q3'));
    first.unmount();
    const { result } = renderHook(() => useSeasonReveal('2026-q3'));
    expect(result.current.shouldAnimate).toBe(false);
    const keyBeforeReplay = result.current.playKey;

    act(() => result.current.replay());
    expect(result.current.shouldAnimate).toBe(true);
    expect(result.current.playKey).not.toBe(keyBeforeReplay);
  });

  it('never plays for a null season id', () => {
    const { result } = renderHook(() => useSeasonReveal(null));
    expect(result.current.shouldAnimate).toBe(false);
  });
});
