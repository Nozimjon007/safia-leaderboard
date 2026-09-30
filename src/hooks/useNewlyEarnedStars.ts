import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lb_craft_stars_seen';

function readSeenMap(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, string[]>;
  } catch {
    return {};
  }
}

function writeSeenMap(map: Record<string, string[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // private mode / quota — worst case a star celebrates again next visit, never a crash
  }
}

/**
 * Which of a member's currently-complete mission ids are newly complete since the last time their
 * profile was viewed on this browser (tracked in localStorage) — the only ones allowed to play the
 * "you just earned this" animation. The very first time a given member's profile is ever opened,
 * nothing is "new" (there's no prior baseline to compare against): every star they already hold
 * just appears normally, never a fake celebration. Computed once per mount — MemberProfilePage
 * already remounts its content per member (`key={row.member.id}`), so this hook doesn't need to
 * watch for member changes itself.
 */
export function useNewlyEarnedMissionIds(memberId: string, completedMissionIds: readonly string[]): ReadonlySet<string> {
  // A lazy useState initializer (not a ref) — the React-sanctioned way to compute something once at
  // mount from outside state without reading/writing a ref during render.
  const [newIds] = useState<ReadonlySet<string>>(() => {
    const seenMap = readSeenMap();
    const wasTracked = memberId in seenMap;
    const previouslySeen = new Set(seenMap[memberId] ?? []);
    return wasTracked ? new Set(completedMissionIds.filter((id) => !previouslySeen.has(id))) : new Set();
  });

  useEffect(() => {
    const seenMap = readSeenMap();
    seenMap[memberId] = [...completedMissionIds];
    writeSeenMap(seenMap);
  }, [memberId, completedMissionIds]);

  return newIds;
}
