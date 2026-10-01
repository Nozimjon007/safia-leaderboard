import { useCallback, useState } from 'react';
import type { AchievementId } from '../data/types';

const STORAGE_KEY = 'lb_signature_achievement';

/** A plain (non-hook) read for consumers that need every member's pin at once — e.g. the
 * leaderboard's own emblem-per-card logic, which resolves one per row inside a loop, not a
 * component, so it can't call the stateful hook below (rules of hooks). Reads once; those call
 * sites already re-render on their own triggers (season/filter changes), so a stale read only
 * lasts until the next one of those, same as any other localStorage-backed demo state in this app. */
export function readSignatureMap(): Record<string, AchievementId> {
  return readMap();
}

function readMap(): Record<string, AchievementId> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, AchievementId>;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, AchievementId>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Demo persistence only — a full/blocked store just means the pin doesn't survive a refresh.
  }
}

export interface SignatureAchievement {
  signatureId: AchievementId | null;
  setSignature: (id: AchievementId) => void;
  clearSignature: () => void;
}

/**
 * One member's pinned "Signature Achievement" — which of their earned awards they've chosen to
 * feature on their leaderboard card (see the Leadership Passport spec). Persisted per member id, not
 * a single global value, since every member picks their own. There's no authentication in this demo
 * (see README), so this is a small, explicit, persisted choice a viewer makes on that member's own
 * profile, the same convention as the rest of the app's demo affordances (view-as, coin ledger).
 */
export function useSignatureAchievement(memberId: string): SignatureAchievement {
  const [map, setMap] = useState<Record<string, AchievementId>>(readMap);

  const setSignature = useCallback(
    (id: AchievementId) => {
      setMap((prev) => {
        const next = { ...prev, [memberId]: id };
        writeMap(next);
        return next;
      });
    },
    [memberId],
  );

  const clearSignature = useCallback(() => {
    setMap((prev) => {
      if (!(memberId in prev)) return prev;
      const next = { ...prev };
      delete next[memberId];
      writeMap(next);
      return next;
    });
  }, [memberId]);

  return { signatureId: map[memberId] ?? null, setSignature, clearSignature };
}
