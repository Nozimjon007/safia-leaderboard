import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'lb_view_as';
// The native `storage` event only fires in OTHER tabs, never the tab that made the write — so a
// same-tab, cross-component reader (Header's Season Pulse) needs its own signal to notice a pick
// made on whatever page is currently mounted. See the listener below.
const CHANGE_EVENT = 'lb_view_as_change';

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * There's no authentication in this build (see README), so "which employee am I"
 * for the season panel's "your position" and the My Progress experience is a
 * small, explicit, persisted demo picker — never inferred or faked.
 */
export function useViewAsMemberId(fallbackId: string | null): [string | null, (id: string) => void] {
  const [stored, setStored] = useState<string | null>(readStored);

  useEffect(() => {
    const onChange = () => setStored(readStored());
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const update = useCallback((id: string) => {
    setStored(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [stored ?? fallbackId, update];
}
