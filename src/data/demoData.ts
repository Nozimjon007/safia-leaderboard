/**
 * DEMO DATA — synthetic, deterministic, clearly not real company data.
 * Every name, role, area and score below is generated. Nothing here should
 * ever be presented as (or mistaken for) a real Safia employee or a real
 * result — the UI keeps a "Demo data" banner visible everywhere this
 * dataset is shown.
 *
 * This is the only file that should be replaced to connect real data; see
 * `dataSource.ts` for the swap point and the shape it must produce.
 *
 * History depth: the dataset always covers the six calendar quarters before
 * today plus the current (in-progress) one — seven seasons total — so the
 * season archive, "My Progress" trends and achievements all have real
 * multi-season substance regardless of when the app happens to be run.
 * Each member's level moves as a bounded random walk *per season* (not one
 * long straight-line drift), with ordinary weekly noise inside each season —
 * this is what makes season-over-season rank movement and streaks plausible.
 */
import { clamp } from '../lib/scoring';
import { addDaysISO, mondayOfISO } from '../lib/dates';
import { quarterOf, seasonBounds } from '../lib/seasons';
import { CATEGORY_KEYS } from './types';
import type { CareerStep, LeaderboardDataset, Member, MemberScores, ShiftId } from './types';

/** Small deterministic PRNG (mulberry32) so the demo dataset renders identically on every load. */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SeedMember {
  id: string;
  name: string;
  area: string;
  shift: ShiftId;
  role: string;
  /** Starting midpoint score per category, in CATEGORY_KEYS order: [load, control, kaizen, concern, attendance]. */
  base: readonly [number, number, number, number, number];
  /** Small persistent per-season nudge — sets the long-run trend direction used to demo rank movement across seasons. */
  drift: number;
  /** ISO date first hired. Hand-authored demo HR fact, distinct from the scored history above. */
  dateJoinedISO: string;
  /** Prior roles before the current one, oldest first — only set for members whose demo profile includes a promotion story. */
  careerHistory?: readonly CareerStep[];
}

const SEED = 20260928;
const PAST_SEASONS = 6; // + the current one = 7 seasons of history

const SEED_MEMBERS: readonly SeedMember[] = [
  {
    id: 'madina',
    name: 'Madina Yusupova',
    area: 'Site 1',
    shift: 'S1',
    role: 'Baker',
    base: [92, 88, 90, 86, 95],
    drift: 0.4,
    dateJoinedISO: '2019-03-04',
  },
  {
    id: 'otabek',
    name: 'Otabek Rahmonov',
    area: 'Site 3',
    shift: 'S1',
    role: 'Shift Lead',
    base: [90, 93, 80, 88, 90],
    drift: -0.3,
    dateJoinedISO: '2018-11-12',
    careerHistory: [{ role: 'Baker', startISO: '2018-11-12', endISO: '2022-05-31' }],
  },
  {
    id: 'zarina',
    name: "Zarina Ne'matova",
    area: 'Site 2',
    shift: 'S1',
    role: 'Decorator',
    base: [87, 74, 92, 91, 88],
    drift: 0.5,
    dateJoinedISO: '2021-02-08',
    careerHistory: [{ role: 'Packer', startISO: '2021-02-08', endISO: '2023-01-15' }],
  },
  {
    id: 'jahongir',
    name: 'Jahongir Tursunov',
    area: 'Site 5',
    shift: 'S1',
    role: 'Baker',
    base: [86, 82, 75, 78, 91],
    drift: 0.8,
    dateJoinedISO: '2023-05-15',
  },
  {
    id: 'kamronbek',
    name: 'Kamronbek Abdullayev',
    area: 'Site 4',
    shift: 'S1',
    role: 'Packer',
    base: [74, 70, 58, 70, 77],
    drift: -0.5,
    dateJoinedISO: '2020-07-20',
  },
  {
    id: 'aziz',
    name: 'Aziz Qodirov',
    area: 'Site 5',
    shift: 'S1',
    role: 'Cashier',
    base: [0, 0, 0, 0, 0],
    drift: 0,
    dateJoinedISO: '2026-09-01',
  },
  {
    id: 'nodira',
    name: 'Nodira Ahmedova',
    area: 'Site 4',
    shift: 'S2',
    role: 'Shift Lead',
    base: [89, 85, 84, 90, 92],
    drift: 0.2,
    dateJoinedISO: '2017-09-01',
    careerHistory: [
      { role: 'Packer', startISO: '2017-09-01', endISO: '2020-02-29' },
      { role: 'Cashier', startISO: '2020-03-01', endISO: '2022-07-31' },
    ],
  },
  {
    id: 'gulbahor',
    name: 'Gulbahor Sodiqova',
    area: 'Site 1',
    shift: 'S2',
    role: 'Decorator',
    base: [83, 79, 86, 80, 85],
    drift: 0.4,
    dateJoinedISO: '2022-01-10',
    careerHistory: [{ role: 'Cashier', startISO: '2022-01-10', endISO: '2024-03-31' }],
  },
  {
    id: 'shahnoza',
    name: 'Shahnoza Qurbonova',
    area: 'Site 3',
    shift: 'S2',
    role: 'Packer',
    base: [79, 68, 81, 77, 82],
    drift: -0.2,
    dateJoinedISO: '2021-11-03',
  },
  {
    id: 'dilnoza',
    name: 'Dilnoza Xolova',
    area: 'Site 2',
    shift: 'S2',
    role: 'Cashier',
    base: [68, 72, 63, 69, 74],
    drift: -0.6,
    dateJoinedISO: '2022-09-19',
  },
  {
    id: 'sardor',
    name: 'Sardor Yoldashev',
    area: 'Site 9',
    shift: 'S2',
    role: 'Delivery',
    base: [63, 57, 60, 65, 68],
    drift: -0.3,
    dateJoinedISO: '2023-02-27',
  },
  {
    id: 'feruza',
    name: 'Feruza Nazarova',
    area: 'Site 6',
    shift: 'S2',
    role: 'Delivery',
    base: [58, 52, 55, 61, 64],
    drift: -0.1,
    dateJoinedISO: '2024-01-08',
  },
];

/** The `pastCount` calendar quarters before today's, plus today's own — oldest first. */
function pastSeasonSequence(todayISO: string, pastCount: number): Array<{ startISO: string; endISO: string }> {
  const { year: curYear, quarter: curQuarter } = quarterOf(todayISO);
  let y = curYear;
  let q = curQuarter;
  for (let i = 0; i < pastCount; i++) {
    q -= 1;
    if (q < 1) {
      q = 4;
      y -= 1;
    }
  }
  const seasons: Array<{ startISO: string; endISO: string }> = [];
  for (let i = 0; i <= pastCount; i++) {
    seasons.push(seasonBounds(y, q as 1 | 2 | 3 | 4));
    q += 1;
    if (q > 4) {
      q = 1;
      y += 1;
    }
  }
  return seasons;
}

function weekCountBetween(firstWeekStart: string, lastWeekStart: string): number {
  const days = (Date.parse(lastWeekStart) - Date.parse(firstWeekStart)) / 86_400_000;
  return Math.round(days / 7) + 1;
}

/**
 * Monday on/after `iso`, never before it — unlike `mondayOfISO`, which rounds
 * back to the Monday of the containing week. Used only for anchoring
 * `firstWeekStart` to the oldest season's own start date: rounding back there
 * would allocate a leading week that precedes every season in `seasonSeq`, so
 * it can never be populated by the per-season generation loop below and would
 * surface as a phantom, permanently-empty extra season (`lib/seasons.ts`
 * derives its season list from the calendar quarter containing
 * `firstWeekStart`, independent of `seasonSeq`).
 */
function mondayOnOrAfterISO(iso: string): string {
  const monday = mondayOfISO(iso);
  return monday < iso ? addDaysISO(monday, 7) : monday;
}

/** Number of Mondays from `firstWeekStart` up to and including the season's own last Monday. */
function weeksInSeason(firstWeekStart: string, weekCount: number, seasonStartISO: string, seasonEndISO: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < weekCount; i++) {
    const monday = addDaysISO(firstWeekStart, i * 7);
    if (monday >= seasonStartISO && monday <= seasonEndISO) out.push(i);
  }
  return out;
}

function generateDeliberateGap(seedMember: SeedMember, categoryIndex: number, week: number, weekCount: number): boolean {
  // Deliberate, documented gaps so the UI's missing-data, unranked and partial-season states are always exercised.
  if (seedMember.id === 'aziz') return true; // no history at all — brand new hire
  if (seedMember.id === 'kamronbek' && categoryIndex === 2 && week >= weekCount - 6) return true; // one category stopped being logged this season
  if (seedMember.id === 'shahnoza' && week >= weekCount - 6 && week <= weekCount - 5) return true; // two weeks of approved leave
  return false;
}

export function buildDemoDataset(): LeaderboardDataset {
  const rnd = mulberry32(SEED);
  const today = new Date().toISOString().slice(0, 10);
  const lastWeekStart = mondayOfISO(today);
  // The season boundaries used to drive the per-season random walk — the same seasons `lib/seasons.ts` computes.
  const seasonSeq = pastSeasonSequence(today, PAST_SEASONS);
  const firstWeekStart = mondayOnOrAfterISO(seasonSeq[0].startISO);
  const weekCount = weekCountBetween(firstWeekStart, lastWeekStart);

  const members: Member[] = [];
  const scores: Record<string, MemberScores> = {};

  for (const seedMember of SEED_MEMBERS) {
    members.push({
      id: seedMember.id,
      name: seedMember.name,
      area: seedMember.area,
      shift: seedMember.shift,
      role: seedMember.role,
      // AI-generated demo portraits, not real people — see public/portraits/README.md for sourcing.
      avatarPhoto: `/portraits/${seedMember.id}.jpg`,
      // Full-body stock photography (unrelated models, not the avatarPhoto face above) used only
      // to preview the full-body card/hero layout — see public/fullbody/README.md for sourcing.
      fullBodyPhoto: `/fullbody/${seedMember.id}.jpg`,
      dateJoinedISO: seedMember.dateJoinedISO,
      careerHistory: seedMember.careerHistory,
    });

    const memberScores = {} as Record<(typeof CATEGORY_KEYS)[number], Array<number | null>>;
    CATEGORY_KEYS.forEach((category) => {
      memberScores[category] = new Array(weekCount).fill(null) as Array<number | null>;
    });

    const level = [...seedMember.base] as [number, number, number, number, number];
    for (const season of seasonSeq) {
      // Season-to-season random walk: a persistent small nudge (the member's trend) plus per-season noise, bounded.
      for (let c = 0; c < 5; c++) {
        level[c] = clamp(level[c] + seedMember.drift + (rnd() - 0.5) * 6, 20, 100);
      }
      const weeksThisSeason = weeksInSeason(firstWeekStart, weekCount, season.startISO, season.endISO);
      for (const week of weeksThisSeason) {
        CATEGORY_KEYS.forEach((category, categoryIndex) => {
          if (generateDeliberateGap(seedMember, categoryIndex, week, weekCount)) return; // leave as null
          if (rnd() < 0.03) return; // ordinary unlogged week, same odds for everyone
          const noisy = level[categoryIndex] + (rnd() - 0.5) * 9;
          memberScores[category][week] = Math.round(clamp(noisy, 20, 100) * 10) / 10;
        });
      }
    }
    scores[seedMember.id] = memberScores;
  }

  return { sourceLabel: 'Demo', firstWeekStart, weekCount, members, scores };
}
