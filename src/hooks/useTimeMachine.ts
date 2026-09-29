import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { LeaderboardDataset, ScoringConfig } from '../data/types';
import { weekEndISO, weekStartISO } from '../lib/dates';
import type { Season } from '../lib/seasons';
import { computeWeekChanges, deriveCaption, seasonWeeks, snapshotAt, type MemberWeekChange, type TimeMachineCaption } from '../lib/timeMachine';

export interface TimeMachineState {
  active: boolean;
  seasonOffset: number;
  /** Highest offset with real data — the dataset never contains a week that hasn't happened yet. */
  maxOffset: number;
  weekDateISO: string;
  changes: MemberWeekChange[];
  caption: TimeMachineCaption;
  setActive: (on: boolean) => void;
  setSeasonOffset: (offset: number) => void;
}

/**
 * Reads/writes `tm` + `tmWeek` in the URL, and — in the same update — the
 * shared `from`/`to` period params every page already renders from
 * (`useLeaderboardFilters`). That's the whole integration: the slider never
 * needs to know about the podium, table, profile, or compare page directly,
 * because they all already re-render from `from`/`to`.
 */
export function useTimeMachine(dataset: LeaderboardDataset | null, config: ScoringConfig, season: Season | null): TimeMachineState | null {
  const [params, setParams] = useSearchParams();

  const weeks = useMemo(() => (dataset && season ? seasonWeeks(dataset, season) : []), [dataset, season]);
  const maxOffset = Math.max(0, weeks.length - 1);
  const active = params.get('tm') === '1' && weeks.length > 0;

  const rawOffset = Number(params.get('tmWeek'));
  const seasonOffset = Number.isFinite(rawOffset) ? Math.min(Math.max(0, Math.trunc(rawOffset)), maxOffset) : maxOffset;

  // `active`/`seasonOffset` above read only `tm`/`tmWeek`, so a URL that sets those without a matching
  // `from`/`to` (hand-typed, trimmed when sharing, left stale from before Time Machine was opened) would
  // otherwise make the slider claim one week while every other page quietly keeps showing a different
  // period — the exact "inconsistent snapshot" this feature exists to prevent. Self-heal it here rather
  // than trusting every future call site to always set all four params together.
  const rawFrom = params.get('from');
  const rawTo = params.get('to');
  useEffect(() => {
    if (!dataset || !active || !weeks.length) return;
    const expectedFrom = weekStartISO(dataset.firstWeekStart, weeks[0]);
    const expectedTo = weekEndISO(dataset.firstWeekStart, weeks[seasonOffset]);
    if (rawFrom === expectedFrom && rawTo === expectedTo) return;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('from', expectedFrom);
        next.set('to', expectedTo);
        return next;
      },
      { replace: true },
    );
  }, [dataset, active, weeks, seasonOffset, rawFrom, rawTo, setParams]);

  const setActive = useCallback(
    (on: boolean) => {
      if (!dataset || !weeks.length) return;
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (on) {
            next.set('tm', '1');
            next.set('tmWeek', String(maxOffset));
            next.set('from', weekStartISO(dataset.firstWeekStart, weeks[0]));
            next.set('to', weekEndISO(dataset.firstWeekStart, weeks[maxOffset]));
          } else {
            next.delete('tm');
            next.delete('tmWeek');
            next.delete('from');
            next.delete('to');
          }
          return next;
        },
        { replace: true },
      );
    },
    [dataset, weeks, maxOffset, setParams],
  );

  const setSeasonOffset = useCallback(
    (offset: number) => {
      if (!dataset || !weeks.length) return;
      const clamped = Math.min(Math.max(0, Math.trunc(offset)), maxOffset);
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tm', '1');
          next.set('tmWeek', String(clamped));
          next.set('from', weekStartISO(dataset.firstWeekStart, weeks[0]));
          next.set('to', weekEndISO(dataset.firstWeekStart, weeks[clamped]));
          return next;
        },
        { replace: true },
      );
    },
    [dataset, weeks, maxOffset, setParams],
  );

  const changes = useMemo(
    () => (dataset && season && active ? computeWeekChanges(dataset, config, season, seasonOffset) : []),
    [dataset, config, season, active, seasonOffset],
  );
  const caption = useMemo(
    () => (dataset ? deriveCaption(changes, dataset.members, seasonOffset) : { kind: 'first_week' as const }),
    [dataset, changes, seasonOffset],
  );

  if (!dataset || !season || !weeks.length) return null;

  const snap = snapshotAt(dataset, config, season, seasonOffset);
  return {
    active,
    seasonOffset,
    maxOffset,
    weekDateISO: snap?.dateISO ?? weekStartISO(dataset.firstWeekStart, weeks[seasonOffset]),
    changes,
    caption,
    setActive,
    setSeasonOffset,
  };
}
