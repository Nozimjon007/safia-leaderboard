import { useCallback, useState } from 'react';

const STORAGE_KEY = 'lb_view_as';

/**
 * There's no authentication in this build (see README), so "which employee am I"
 * for the season panel's "your position" and the My Progress experience is a
 * small, explicit, persisted demo picker — never inferred or faked.
 */
export function useViewAsMemberId(fallbackId: string | null): [string | null, (id: string) => void] {
  const [stored, setStored] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const update = useCallback((id: string) => {
    setStored(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  return [stored ?? fallbackId, update];
}
