/**
 * Week-based date helpers. Periods always snap to whole Monday–Sunday weeks,
 * addressed as integer week indexes from `LeaderboardDataset.firstWeekStart`.
 * All arithmetic uses UTC day numbers so it's immune to DST shifts.
 */

const DAY_MS = 86_400_000;

function toUTCDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function toISO(dayMs: number): string {
  return new Date(dayMs).toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  return toISO(toUTCDay(iso) + days * DAY_MS);
}

/** Monday of the week containing `iso` (ISO weekday: Mon=0 .. Sun=6). */
export function mondayOfISO(iso: string): string {
  const day = new Date(toUTCDay(iso)).getUTCDay(); // 0=Sun..6=Sat
  const offset = (day + 6) % 7;
  return addDaysISO(iso, -offset);
}

export function sundayOfISO(iso: string): string {
  return addDaysISO(mondayOfISO(iso), 6);
}

export function weekStartISO(firstWeekStart: string, weekIndex: number): string {
  return addDaysISO(firstWeekStart, weekIndex * 7);
}

export function weekEndISO(firstWeekStart: string, weekIndex: number): string {
  return addDaysISO(firstWeekStart, weekIndex * 7 + 6);
}

/** Week indexes whose Monday falls within [fromISO, toISO], inclusive. */
export function weekIndexesInRange(
  firstWeekStart: string,
  weekCount: number,
  fromISO: string,
  toISO_: string,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < weekCount; i++) {
    const s = weekStartISO(firstWeekStart, i);
    if (s >= fromISO && s <= toISO_) out.push(i);
  }
  return out;
}

export function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const MONTH_NAMES: Record<string, string[]> = {
  uz: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export function formatDate(iso: string, locale: string, withYear = true): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = MONTH_NAMES[locale] ?? MONTH_NAMES.en;
  return `${d} ${months[m - 1]}${withYear ? ' ' + y : ''}`;
}

export function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

export function formatDateRange(fromISO: string, toISO_: string, locale: string): string {
  const yFrom = fromISO.slice(0, 4);
  const yTo = toISO_.slice(0, 4);
  return `${formatDate(fromISO, locale, yFrom !== yTo)} – ${formatDate(toISO_, locale)}`;
}
