import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CATEGORY_KEYS, type BoardMode, type LeaderboardDataset, type LeaderboardView, type MetricKey, type SortDirection, type SortKey } from '../data/types';
import { mondayOfISO, sundayOfISO, weekEndISO, weekIndexesInRange, weekStartISO } from '../lib/dates';
import { currentSeasonIndex, listSeasons } from '../lib/seasons';

export const DEFAULT_PRESET_WEEKS = 4;

export interface LeaderboardFilters {
  fromISO: string;
  toISO: string;
  shift: 'all' | 'S1' | 'S2';
  area: string;
  role: string;
  metric: MetricKey;
  query: string;
  sortKey: SortKey;
  sortDir: SortDirection;
  view: LeaderboardView;
  board: BoardMode;
}

export function presetRangeFor(dataset: LeaderboardDataset, weeks: number): { from: string; to: string } {
  const lastIndex = dataset.weekCount - 1;
  const firstIndex = Math.max(0, lastIndex - weeks + 1);
  return {
    from: weekStartISO(dataset.firstWeekStart, firstIndex),
    to: weekEndISO(dataset.firstWeekStart, lastIndex),
  };
}

/** Default period: the current season, snapped to the whole weeks the dataset actually has (R6). Seasons are the
 * primary framing now — see `lib/seasons.ts`. Falls back to the last 4 weeks only if the current season has no
 * data yet (which shouldn't happen with the demo dataset, but keeps this honest for a real, thinner data source). */
export function defaultRangeFor(dataset: LeaderboardDataset): { from: string; to: string } {
  const today = new Date().toISOString().slice(0, 10);
  const seasons = listSeasons(dataset.firstWeekStart, today);
  const current = seasons[currentSeasonIndex(seasons)];
  const idxs = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, current.startISO, current.endISO);
  if (!idxs.length) return presetRangeFor(dataset, DEFAULT_PRESET_WEEKS);
  return { from: weekStartISO(dataset.firstWeekStart, idxs[0]), to: weekEndISO(dataset.firstWeekStart, idxs[idxs.length - 1]) };
}

function isMetric(v: string | null): v is MetricKey {
  return v === 'overall' || (CATEGORY_KEYS as readonly string[]).includes(v ?? '');
}

function isSortKey(v: string | null): v is SortKey {
  return v === 'rank' || v === 'name' || v === 'overall' || v === 'move' || (CATEGORY_KEYS as readonly string[]).includes(v ?? '');
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** All leaderboard filter state lives in the URL, so links (incl. "back to leaderboard") preserve it. */
export function useLeaderboardFilters(dataset: LeaderboardDataset | null): {
  filters: LeaderboardFilters;
  updateFilters: (patch: Partial<Record<keyof LeaderboardFilters, string>>) => void;
  isPeriodExplicit: boolean;
} {
  const [params, setParams] = useSearchParams();

  const rawFrom = params.get('from');
  const rawTo = params.get('to');
  const isPeriodExplicit = Boolean(rawFrom && rawTo && ISO_RE.test(rawFrom) && ISO_RE.test(rawTo));

  const filters = useMemo<LeaderboardFilters>(() => {
    const fallback = dataset ? defaultRangeFor(dataset) : { from: '', to: '' };
    let fromISO = rawFrom && ISO_RE.test(rawFrom) ? mondayOfISO(rawFrom) : fallback.from;
    let toISO = rawTo && ISO_RE.test(rawTo) ? sundayOfISO(rawTo) : fallback.to;
    if (dataset && fromISO > toISO) [fromISO, toISO] = [toISO, fromISO];
    if (dataset) {
      const lo = dataset.firstWeekStart;
      const hi = weekEndISO(dataset.firstWeekStart, dataset.weekCount - 1);
      if (fromISO < lo) fromISO = lo;
      if (toISO > hi) toISO = hi;
    }

    const shiftRaw = params.get('shift');
    const shift = shiftRaw === 'S1' || shiftRaw === 'S2' ? shiftRaw : 'all';
    const area = params.get('area') ?? 'all';
    const role = params.get('role') ?? 'all';
    const metricRaw = params.get('metric');
    const metric: MetricKey = isMetric(metricRaw) ? (metricRaw as MetricKey) : 'overall';
    const query = params.get('q') ?? '';
    const sortKeyRaw = params.get('sortKey');
    const sortKey: SortKey = isSortKey(sortKeyRaw) ? (sortKeyRaw as SortKey) : 'rank';
    const sortDir: SortDirection = params.get('sortDir') === 'desc' ? 'desc' : 'asc';
    const view: LeaderboardView = params.get('view') === 'cards' ? 'cards' : 'table';
    const board: BoardMode = params.get('board') === 'clans' ? 'clans' : 'solo';

    return { fromISO, toISO, shift, area, role, metric, query, sortKey, sortDir, view, board };
  }, [params, dataset, rawFrom, rawTo]);

  const updateFilters = useCallback(
    (patch: Partial<Record<keyof LeaderboardFilters, string>>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const keyMap: Record<string, string> = {
            fromISO: 'from',
            toISO: 'to',
            shift: 'shift',
            area: 'area',
            role: 'role',
            metric: 'metric',
            query: 'q',
            sortKey: 'sortKey',
            sortDir: 'sortDir',
            view: 'view',
            board: 'board',
          };
          for (const [k, v] of Object.entries(patch)) {
            const paramKey = keyMap[k] ?? k;
            if (v == null || v === '' || v === 'all') next.delete(paramKey);
            else next.set(paramKey, v);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { filters, updateFilters, isPeriodExplicit };
}
