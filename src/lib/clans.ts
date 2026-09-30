/**
 * Safia Clans — four proposed demo teams layered on top of the existing solo leaderboard. Clan
 * membership is entirely independent of real job role or site (see computeClanAssignments): these
 * are a cross-cutting, playful team competition, not an org chart. Like every other demo system in
 * this app, clan names/crests/colors are a clearly-labeled proposal, never presented as an official
 * Safia department — see clan_disclaimer in the i18n dictionaries, shown wherever clans appear.
 */
import type { LeaderboardDataset, Member } from '../data/types';

export type ClanId = 'golden_crust' | 'saffron_rise' | 'cinnamon_hearth' | 'honey_bloom';

export const CLAN_IDS: readonly ClanId[] = ['golden_crust', 'saffron_rise', 'cinnamon_hearth', 'honey_bloom'];

/** Which CSS custom properties (see src/styles/clans.css) carry each clan's accent color — every
 * clan gets its own dedicated token, deliberately never one of the podium's --medal-gold/--medal-
 * bronze tokens. An earlier revision had Golden Crust/Cinnamon Hearth reuse those two directly; the
 * bug that caused was that a clan's crest color would then silently imply a specific *rank* (gold =
 * 1st, bronze = 3rd) no matter what that clan's real standing was that season. Rank color and clan
 * identity color must stay on two separate variables. */
export const CLAN_COLOR_VAR: Record<ClanId, string> = {
  golden_crust: '--clan-golden-crust',
  saffron_rise: '--clan-saffron-rise',
  cinnamon_hearth: '--clan-cinnamon-hearth',
  honey_bloom: '--clan-honey-bloom',
};

export const CLAN_BG_VAR: Record<ClanId, string> = {
  golden_crust: '--clan-golden-crust-bg',
  saffron_rise: '--clan-saffron-rise-bg',
  cinnamon_hearth: '--clan-cinnamon-hearth-bg',
  honey_bloom: '--clan-honey-bloom-bg',
};

/**
 * Deterministic, stable, and even: every member's clan comes from their position in a
 * *name-sorted* roster (not raw array/insertion order, which could reshuffle if the generator's
 * order ever changes), taken mod 4. For exactly 100 members that's exactly 25 per clan. Adding more
 * members later (see demoData.ts) only ever assigns the *new* member a clan by the same rule — it
 * never recomputes or shifts anyone already assigned, as long as this function is only ever called
 * with the full, stable member list (which is how every call site here uses it).
 */
export function computeClanAssignments(members: readonly Member[]): Record<string, ClanId> {
  const sortedIds = members.map((m) => m.id).sort((a, b) => a.localeCompare(b));
  const out: Record<string, ClanId> = {};
  sortedIds.forEach((id, i) => {
    out[id] = CLAN_IDS[i % CLAN_IDS.length];
  });
  return out;
}

export function clanIdForMember(assignments: Record<string, ClanId>, memberId: string): ClanId | null {
  return assignments[memberId] ?? null;
}

export function membersOfClan(members: readonly Member[], assignments: Record<string, ClanId>, clanId: ClanId): Member[] {
  return members.filter((m) => assignments[m.id] === clanId);
}

/** True demo-data sanity check, not used at runtime — see clans.test.ts. */
export function clanSizeCounts(dataset: Pick<LeaderboardDataset, 'members'>): Record<ClanId, number> {
  const assignments = computeClanAssignments(dataset.members);
  const counts = { golden_crust: 0, saffron_rise: 0, cinnamon_hearth: 0, honey_bloom: 0 } as Record<ClanId, number>;
  for (const m of dataset.members) counts[assignments[m.id]] += 1;
  return counts;
}
