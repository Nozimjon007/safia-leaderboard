/**
 * Quarterly competition seasons.
 *
 * No official Safia season calendar was supplied, so seasons here are
 * **calendar quarters** (Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec) — a clearly
 * labeled demo assumption, not an official rule. Season dates are
 * configurable in one place: this file. Nothing about the boundary math
 * ("Season N" style sequential numbering, custom start dates, etc.) is
 * invented — seasons are labeled by their actual calendar quarter so the
 * demo nature of the calendar is obvious wherever it's shown.
 *
 * A season's close time is computed in Asia/Tashkent (UTC+5, no DST) by
 * anchoring the boundary to a Tashkent-local instant. Comparing that
 * instant's epoch milliseconds against `Date.now()` is correct for any
 * viewer regardless of their own browser timezone — epoch ms has no zone.
 */
import { addDaysISO, weekEndISO, weekIndexesInRange, weekStartISO } from './dates';

const TASHKENT_OFFSET = '+05:00';

export type Quarter = 1 | 2 | 3 | 4;

export interface Season {
  id: string;
  year: number;
  quarter: Quarter;
  /** Calendar start date (inclusive), e.g. "2026-07-01". */
  startISO: string;
  /** Calendar end date (inclusive), e.g. "2026-09-30". */
  endISO: string;
}

export function quarterOf(dateISO: string): { year: number; quarter: Quarter } {
  const year = Number(dateISO.slice(0, 4));
  const month = Number(dateISO.slice(5, 7));
  const quarter = (Math.ceil(month / 3) as Quarter) || 1;
  return { year, quarter };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function seasonId(year: number, quarter: Quarter): string {
  return `${year}-q${quarter}`;
}

export function seasonBounds(year: number, quarter: Quarter): { startISO: string; endISO: string } {
  const startMonth = (quarter - 1) * 3 + 1;
  const startISO = `${year}-${pad2(startMonth)}-01`;
  const endMonth = startMonth + 2;
  // Day 0 of the month after endMonth = the last calendar day of endMonth (handles Feb/leap years for free).
  const endDate = new Date(Date.UTC(endMonth === 12 ? year + 1 : year, endMonth === 12 ? 0 : endMonth, 0));
  const endISO = endDate.toISOString().slice(0, 10);
  return { startISO, endISO };
}

export function seasonOf(year: number, quarter: Quarter): Season {
  return { id: seasonId(year, quarter), year, quarter, ...seasonBounds(year, quarter) };
}

const SEASON_ID_RE = /^(\d{4})-q([1-4])$/;

/** The inverse of seasonId() / a season's own `id` — null for anything not in the "YYYY-qN" shape. */
export function parseSeasonId(id: string): Season | null {
  const m = SEASON_ID_RE.exec(id);
  if (!m) return null;
  return seasonOf(Number(m[1]), Number(m[2]) as Quarter);
}

function nextQuarter(year: number, quarter: Quarter): { year: number; quarter: Quarter } {
  return quarter === 4 ? { year: year + 1, quarter: 1 } : { year, quarter: (quarter + 1) as Quarter };
}

/** Every season from the one containing `firstDateISO` through the one containing `lastDateISO`, oldest first. */
export function listSeasons(firstDateISO: string, lastDateISO: string): Season[] {
  const seasons: Season[] = [];
  let { year, quarter } = quarterOf(firstDateISO);
  // Safety cap so a bad date range can't spin forever.
  for (let i = 0; i < 400; i++) {
    const season = seasonOf(year, quarter);
    seasons.push(season);
    if (season.endISO >= lastDateISO) break;
    ({ year, quarter } = nextQuarter(year, quarter));
  }
  return seasons;
}

function tashkentInstantMs(dateISO: string): number {
  return new Date(`${dateISO}T00:00:00${TASHKENT_OFFSET}`).getTime();
}

/** The instant (epoch ms) a season closes: the start of the day after its end date, in Tashkent local time. */
export function seasonCloseMs(season: Pick<Season, 'endISO'>): number {
  return tashkentInstantMs(addDaysISO(season.endISO, 1));
}

export function seasonStartMs(season: Pick<Season, 'startISO'>): number {
  return tashkentInstantMs(season.startISO);
}

export function isSeasonComplete(season: Pick<Season, 'endISO'>, nowMs: number = Date.now()): boolean {
  return nowMs >= seasonCloseMs(season);
}

export type SeasonStatus = 'upcoming' | 'current' | 'awaiting_approval' | 'approved';

/**
 * How long after a season closes its standings sit "awaiting approval" before
 * becoming official — no real Safia approval workflow exists, so this is a
 * clearly-labeled demo assumption (a plausible admin-review window), not a
 * business rule. Change it in this one place.
 */
export const SEASON_APPROVAL_GRACE_MS = 3 * 86_400_000; // 3 days

/**
 * The four states a season can be in, per the corrected time model:
 *  - `upcoming`: hasn't started — show dates/countdown only, never standings.
 *  - `current`: in progress — standings are real but provisional, never
 *    "final winners".
 *  - `awaiting_approval`: the time window closed, so the numbers are frozen
 *    (same as `isSeasonComplete`), but no winners are declared and no
 *    rewards are issued yet.
 *  - `approved`: frozen standings + awarded rewards are official (within
 *    this demo's own model — still labeled demo/proposed everywhere, since
 *    no real Safia data source exists).
 */
export function seasonStatus(season: Pick<Season, 'startISO' | 'endISO'>, nowMs: number = Date.now()): SeasonStatus {
  const startMs = seasonStartMs(season);
  const closeMs = seasonCloseMs(season);
  if (nowMs < startMs) return 'upcoming';
  if (nowMs < closeMs) return 'current';
  if (nowMs < closeMs + SEASON_APPROVAL_GRACE_MS) return 'awaiting_approval';
  return 'approved';
}

/** Standings are frozen AND the approval grace period has elapsed — the only state allowed to declare winners or issue rewards. */
export function isSeasonApproved(season: Pick<Season, 'startISO' | 'endISO'>, nowMs: number = Date.now()): boolean {
  return seasonStatus(season, nowMs) === 'approved';
}

export function currentSeasonIndex(seasons: readonly Season[], nowMs: number = Date.now()): number {
  const idx = seasons.findIndex((s) => nowMs >= seasonStartMs(s) && nowMs < seasonCloseMs(s));
  if (idx >= 0) return idx;
  // "Now" is outside the dataset's covered range (future or past the data) — fall back to the closest edge.
  return nowMs < seasonStartMs(seasons[0]) ? 0 : seasons.length - 1;
}

export interface SeasonCountdown {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  /** 0..1 through the season, clamped. */
  progress: number;
  isComplete: boolean;
}

export interface StartCountdown {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  hasStarted: boolean;
}

/** Time remaining until an upcoming season starts. */
export function seasonStartCountdown(season: Pick<Season, 'startISO'>, nowMs: number = Date.now()): StartCountdown {
  const remaining = Math.max(0, seasonStartMs(season) - nowMs);
  return {
    totalMs: remaining,
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining % 86_400_000) / 3_600_000),
    minutes: Math.floor((remaining % 3_600_000) / 60_000),
    hasStarted: remaining === 0,
  };
}

export function seasonCountdown(season: Pick<Season, 'startISO' | 'endISO'>, nowMs: number = Date.now()): SeasonCountdown {
  const startMs = seasonStartMs(season);
  const closeMs = seasonCloseMs(season);
  const remaining = Math.max(0, closeMs - nowMs);
  const progress = Math.min(1, Math.max(0, (nowMs - startMs) / (closeMs - startMs)));
  return {
    totalMs: remaining,
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining % 86_400_000) / 3_600_000),
    minutes: Math.floor((remaining % 3_600_000) / 60_000),
    progress,
    isComplete: nowMs >= closeMs,
  };
}

/** A dataset's whole-week [from, to] range that falls inside a season, or null if it has none. */
export function seasonWeekRange(
  dataset: { firstWeekStart: string; weekCount: number },
  season: Pick<Season, 'startISO' | 'endISO'>,
): { from: string; to: string } | null {
  const idxs = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, season.startISO, season.endISO);
  if (!idxs.length) return null;
  return { from: weekStartISO(dataset.firstWeekStart, idxs[0]), to: weekEndISO(dataset.firstWeekStart, idxs[idxs.length - 1]) };
}
