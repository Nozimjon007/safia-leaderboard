import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'lb_season_reveal_seen';

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function markSeen(id: string) {
  try {
    const seen = readSeen();
    if (seen.has(id)) return;
    seen.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    // private mode / quota — worst case the reveal just plays again next time, never a crash
  }
}

export interface SeasonReveal {
  /** True exactly while the entrance sequence (status reveal, top-five #5-to-#1, champion finish)
   * should actually play — a genuinely new season for this browser, or a manual replay. */
  shouldAnimate: boolean;
  /** Forces a fresh play regardless of whether this season was already seen — see the "Replay
   * reveal" control. */
  replay: () => void;
  /** Pass as the `key` on the reveal wrapper: changes exactly when a new play should start, so
   * Motion treats it as a fresh mount and its entrance variants actually run again. */
  playKey: string;
}

/**
 * Plays once per season per browser (tracked in localStorage), never again just because the page
 * re-rendered for an unrelated reason — typing in search, changing a filter — since those don't
 * change `seasonId`. Deliberately does NOT reset on every render: a season switch is detected by
 * comparing against the previously-seen id (React's documented "adjust state during render"
 * pattern), not by depending on the whole filter object.
 */
export function useSeasonReveal(seasonId: string | null): SeasonReveal {
  const [prevId, setPrevId] = useState(seasonId);
  // `nonce` only needs to change to a value distinct from before — a plain counter driven by
  // functional updates does that without calling anything impure (Date.now(), crypto, refs) during
  // render, which is what makes the render-time branch below safe to call unconditionally.
  const [playState, setPlayState] = useState(() => ({
    animate: seasonId != null && !readSeen().has(seasonId),
    nonce: 0,
  }));

  if (seasonId !== prevId) {
    setPrevId(seasonId);
    setPlayState((s) => ({ animate: seasonId != null && !readSeen().has(seasonId), nonce: s.nonce + 1 }));
  }

  useEffect(() => {
    if (seasonId && playState.animate) markSeen(seasonId);
  }, [seasonId, playState.animate]);

  // Runs from a click handler, never during render, so bumping state unconditionally here is fine.
  const replay = useCallback(() => setPlayState((s) => ({ animate: true, nonce: s.nonce + 1 })), []);

  return {
    shouldAnimate: playState.animate,
    replay,
    playKey: `${seasonId ?? 'none'}:${playState.nonce}`,
  };
}
