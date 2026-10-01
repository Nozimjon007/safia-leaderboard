/**
 * DEMO DATA — synthetic, deterministic, clearly not real company data. Every name, role, area and
 * score below is generated. Nothing here should ever be presented as (or mistaken for) a real Safia
 * employee or a real result — the UI keeps a "Demo data" banner visible everywhere this dataset is
 * shown.
 *
 * SCOPE: Safia League ranks team leaders (brigadiers) only, not the full bakery staff. Every member
 * this file produces has role 'Team Leader' — see the mentor correction this reflects. The population
 * size is derived from a believable org structure (one team leader per site per shift), not padded to
 * any round number: see LEADER_SLOTS below. Front-line roles (Baker, Decorator, Cashier, Packer,
 * Delivery) still exist as *historical* career-history entries — "promoted from X" is real color for a
 * leader's story — but no current member holds one of those roles, and none of them compete here.
 *
 * This is the only file that should be replaced to connect real data; see `dataSource.ts` for the
 * swap point and the shape it must produce.
 *
 * History depth: the dataset always covers the six calendar quarters before today plus the current
 * (in-progress) one, seven seasons total, so the season archive, "My Progress" trends and
 * achievements all have real multi-season substance regardless of when the app happens to be run.
 * Each member's level moves as a bounded random walk *per season* (not one long straight-line drift),
 * with ordinary weekly noise inside each season, this is what makes season-over-season rank movement
 * and streaks plausible.
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
  /** Prior roles before the current one, oldest first — a leader's "promoted from" story. The role
   * names here are historical color (shown only in the Craft Journal / career timeline) and never
   * imply that role currently competes in this product. */
  careerHistory?: readonly CareerStep[];
}

const SEED = 20260928;
const PAST_SEASONS = 6; // + the current one = 7 seasons of history

/** The two hand-authored team leaders, each with a real licensed portrait (see public/portraits and
 * public/fullbody READMEs). Everyone else is generated (see LEADER_SLOTS below) — no photo sourced or
 * licensed for that batch, so they render through the UI's initials-fallback, never a broken or
 * reused image, and never implying a stock photo is a real Safia employee. */
const SEED_MEMBERS: readonly SeedMember[] = [
  {
    id: 'otabek',
    name: 'Otabek Rahmonov',
    area: 'Site 3',
    shift: 'S1',
    role: 'Team Leader',
    base: [90, 93, 80, 88, 90],
    drift: -0.3,
    dateJoinedISO: '2018-11-12',
    careerHistory: [{ role: 'Baker', startISO: '2018-11-12', endISO: '2022-05-31' }],
  },
  {
    id: 'nodira',
    name: 'Nodira Ahmedova',
    area: 'Site 4',
    shift: 'S2',
    role: 'Team Leader',
    base: [89, 85, 84, 90, 92],
    drift: 0.2,
    dateJoinedISO: '2017-09-01',
    careerHistory: [
      { role: 'Packer', startISO: '2017-09-01', endISO: '2020-02-29' },
      { role: 'Cashier', startISO: '2020-03-01', endISO: '2022-07-31' },
    ],
  },
];

// ---- Synthetic roster: one team leader per site per shift ----
//
// Nine sites (matching the hand-authored two above plus the historical "Site 9" reference this
// dataset has always used) times two shifts is eighteen leadership slots, a real organizational
// structure, not a round number chosen for its own sake. Two are already filled by SEED_MEMBERS
// above; this fills the other sixteen. Every one of them runs through the *exact same* per-season
// random-walk score generator below as the hand-authored two, there is no separate "fake" scoring
// path — this batch draws from its own PRNG stream (SEED + 1), and because it's appended *after*
// SEED_MEMBERS in the array the main loop iterates, it can only ever consume random draws that come
// after the original two already have theirs.
const ALL_SITES = Array.from({ length: 9 }, (_, i) => `Site ${i + 1}`);
const ALL_SHIFTS: readonly ShiftId[] = ['S1', 'S2'];
const FILLED_SLOTS: ReadonlySet<string> = new Set(SEED_MEMBERS.map((m) => `${m.area}|${m.shift}`));
const LEADER_SLOTS: readonly { area: string; shift: ShiftId }[] = ALL_SITES.flatMap((area) =>
  ALL_SHIFTS.filter((shift) => !FILLED_SLOTS.has(`${area}|${shift}`)).map((shift) => ({ area, shift })),
);

const SYNTHETIC_FIRST_NAMES_M: readonly string[] = [
  'Sardor', 'Jasur', 'Bekzod', "Ulug'bek", 'Sherzod', 'Davron', 'Farrukh', 'Ilhom', 'Rustam', 'Anvar',
  'Bahodir', 'Doston', 'Eldor', 'Fayzullo', 'Jamshid', 'Karim', 'Laziz', 'Mansur', 'Nurbek', 'Olimjon',
];
const SYNTHETIC_FIRST_NAMES_F: readonly string[] = [
  'Maftuna', 'Sevinch', 'Malika', 'Nigora', 'Ozoda', 'Parvina', 'Rayhon', 'Sabina', 'Tamila', 'Umida',
  'Vasila', 'Yulduz', 'Zilola', 'Kamola', 'Lobar', 'Muslima', 'Nafisa', "Oy'sha", 'Sitora', 'Xosiyat',
];
const SYNTHETIC_SURNAME_STEMS: readonly string[] = [
  'Yusup', 'Rahmon', 'Tursun', 'Abdulla', 'Qodir', 'Ahmad', 'Sodiq', 'Qurbon', 'Xoliq', 'Yoldash',
  'Nazar', 'Karim', 'Ismoil', 'Toshkent', 'Bekmurod', 'Ergash', "G'ani", 'Hakim', 'Inoyat', "Jo'ra",
];

/** Former front-line roles, used only as "promoted from" career-history color for a new team leader —
 * never assigned as anyone's *current* role. A leader promoted from the floor is a real, specific
 * story ("coaches the way they were once coached"); about a third of the generated batch gets no
 * promotion story at all, so not every card reads the same way. */
const FORMER_FRONTLINE_ROLES: readonly string[] = ['Baker', 'Decorator', 'Packer', 'Cashier', 'Delivery'];

/** Deterministic "who tends to be a strong/typical/developing performer" tiers — a workplace has more
 * solid/average performers than stars or strugglers, so this is weighted, not a flat distribution. */
const SYNTHETIC_SKILL_TIERS: readonly { min: number; max: number; weight: number }[] = [
  { min: 86, max: 97, weight: 18 },
  { min: 74, max: 88, weight: 42 },
  { min: 58, max: 76, weight: 28 },
  { min: 38, max: 60, weight: 12 },
];

function pickWeighted<T extends { weight: number }>(rnd: () => number, pool: readonly T[]): T {
  const total = pool.reduce((sum, x) => sum + x.weight, 0);
  let x = rnd() * total;
  for (const item of pool) {
    x -= item.weight;
    if (x <= 0) return item;
  }
  return pool[pool.length - 1];
}

function pick<T>(rnd: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function generateSyntheticLeaders(slots: readonly { area: string; shift: ShiftId }[]): SeedMember[] {
  const rnd = mulberry32(SEED + 1);
  const today = new Date().toISOString().slice(0, 10);
  const usedNames = new Set<string>(SEED_MEMBERS.map((m) => m.name));
  const out: SeedMember[] = [];

  slots.forEach((slot, i) => {
    const isFemale = rnd() < 0.5;
    let name = '';
    for (let attempt = 0; attempt < 25; attempt++) {
      const first = pick(rnd, isFemale ? SYNTHETIC_FIRST_NAMES_F : SYNTHETIC_FIRST_NAMES_M);
      const stem = pick(rnd, SYNTHETIC_SURNAME_STEMS);
      const softEnding = rnd() < 0.5; // real Uzbek surnames split between -ov/-ova and -ev/-eva
      const surname = stem + (isFemale ? (softEnding ? 'eva' : 'ova') : softEnding ? 'ev' : 'ov');
      const candidate = `${first} ${surname}`;
      if (!usedNames.has(candidate)) {
        name = candidate;
        break;
      }
    }
    if (!name) name = `${isFemale ? pick(rnd, SYNTHETIC_FIRST_NAMES_F) : pick(rnd, SYNTHETIC_FIRST_NAMES_M)} Leader${i + 1}`;
    usedNames.add(name);

    const tier = pickWeighted(rnd, SYNTHETIC_SKILL_TIERS);
    const base = Array.from({ length: 5 }, () => Math.round(tier.min + rnd() * (tier.max - tier.min))) as [
      number, number, number, number, number,
    ];
    const drift = Math.round((rnd() - 0.5) * 120) / 100; // -0.6 .. +0.6

    const daysAgo = 200 + Math.floor(rnd() * 3400); // at least ~7 months as a leader, up to ~9.5 years
    const dateJoinedISO = addDaysISO(today, -daysAgo);

    let careerHistory: CareerStep[] | undefined;
    if (rnd() < 0.65) {
      const prevRole = pick(rnd, FORMER_FRONTLINE_ROLES);
      const promoDaysAgo = Math.floor(daysAgo * (0.3 + rnd() * 0.4)); // promoted sometime after joining, well before today
      const promoDateISO = addDaysISO(today, -promoDaysAgo);
      careerHistory = [{ role: prevRole, startISO: dateJoinedISO, endISO: promoDateISO }];
    }

    out.push({
      id: `lead${String(i + 1).padStart(3, '0')}`,
      name,
      area: slot.area,
      shift: slot.shift,
      role: 'Team Leader',
      base,
      drift,
      dateJoinedISO,
      careerHistory,
    });
  });

  return out;
}

const SYNTHETIC_MEMBERS = generateSyntheticLeaders(LEADER_SLOTS);

// Three demo edge cases so the UI's missing-data, unranked and partial-season states are always
// exercised, moved onto the first three synthetic leaders (previously hand-authored members that no
// longer exist in a team-leader-only roster) rather than dropped.
const BRAND_NEW_HIRE_ID = SYNTHETIC_MEMBERS[0]?.id ?? null;
const PARTIAL_CATEGORY_GAP_ID = SYNTHETIC_MEMBERS[1]?.id ?? null;
const APPROVED_LEAVE_GAP_ID = SYNTHETIC_MEMBERS[2]?.id ?? null;

if (BRAND_NEW_HIRE_ID) {
  const m = SYNTHETIC_MEMBERS[0];
  m.base = [0, 0, 0, 0, 0];
  m.drift = 0;
  m.dateJoinedISO = addDaysISO(new Date().toISOString().slice(0, 10), -27);
  m.careerHistory = undefined;
}

const ALL_SEED_MEMBERS: readonly SeedMember[] = [...SEED_MEMBERS, ...SYNTHETIC_MEMBERS];

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
  if (seedMember.id === BRAND_NEW_HIRE_ID) return true; // no history at all — brand new leader
  if (seedMember.id === PARTIAL_CATEGORY_GAP_ID && categoryIndex === 2 && week >= weekCount - 6) return true; // one category stopped being logged this season
  if (seedMember.id === APPROVED_LEAVE_GAP_ID && week >= weekCount - 6 && week <= weekCount - 5) return true; // two weeks of approved leave
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

  for (const seedMember of ALL_SEED_MEMBERS) {
    members.push({
      id: seedMember.id,
      name: seedMember.name,
      area: seedMember.area,
      shift: seedMember.shift,
      role: seedMember.role,
      // Every member, including the two hand-authored leaders who previously had real licensed
      // photos, renders through the UI's own illustrated initials fallback (Avatar.tsx /
      // PortraitFallback.tsx) — one consistent identity system everywhere a portrait appears,
      // matching the leaderboard's own gold/silver/bronze card treatment, never a photo.
      avatarPhoto: null,
      fullBodyPhoto: null,
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
