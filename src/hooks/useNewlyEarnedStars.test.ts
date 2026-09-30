import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNewlyEarnedMissionIds } from './useNewlyEarnedStars';

describe('useNewlyEarnedMissionIds', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('treats every star as already-known on the first-ever view of a member (no fake celebration)', () => {
    const { result } = renderHook(() => useNewlyEarnedMissionIds('alice', ['baker_output', 'baker_attendance']));
    expect(result.current.size).toBe(0);
  });

  it('flags only the missions completed since the last recorded visit', () => {
    // First visit establishes the baseline: only baker_output complete.
    renderHook(() => useNewlyEarnedMissionIds('alice', ['baker_output']));

    // A later visit (new mount, matching MemberProfilePage's per-member remount) finds two now complete.
    const { result } = renderHook(() => useNewlyEarnedMissionIds('alice', ['baker_output', 'baker_attendance']));
    expect([...result.current]).toEqual(['baker_attendance']);
  });

  it('flags nothing when no new missions completed since the last visit', () => {
    renderHook(() => useNewlyEarnedMissionIds('alice', ['baker_output', 'baker_attendance']));
    const { result } = renderHook(() => useNewlyEarnedMissionIds('alice', ['baker_output', 'baker_attendance']));
    expect(result.current.size).toBe(0);
  });

  it('keeps each member independent', () => {
    renderHook(() => useNewlyEarnedMissionIds('alice', ['baker_output']));
    // Bob has never been seen before — his first view, even with a "complete" mission, celebrates nothing.
    const { result } = renderHook(() => useNewlyEarnedMissionIds('bob', ['packer_output']));
    expect(result.current.size).toBe(0);
  });
});
