import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * A 1-indexed `page` URL param, clamped to [1, totalPages] so a stale link (or a filter that just
 * narrowed the result set) can never land on an empty out-of-range page. Uses the same `replace`
 * update style as every other leaderboard filter (see useLeaderboardFilters), so paging doesn't
 * clutter browser history any differently than sorting or switching shifts does.
 */
export function usePageParam(totalPages: number): [number, (page: number) => void] {
  const [params, setParams] = useSearchParams();
  const raw = Number(params.get('page'));
  const requested = Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : 1;
  const page = Math.min(Math.max(1, requested), Math.max(1, totalPages));

  const setPage = useCallback(
    (p: number) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (p <= 1) next.delete('page');
          else next.set('page', String(p));
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return [page, setPage];
}
