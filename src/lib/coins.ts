/**
 * Safia Coins — virtual, non-purchasable, non-rank-boosting reward credits, entirely separate from
 * scores, Craft Path stars and clan points. Configurable demo values below — proposed starting
 * values, not official Safia policy (see clan_points_disclaimer's sibling, coins_disclaimer, in the
 * i18n dictionaries).
 *
 * This module only computes *what should be awarded* for an already-approved season — a pure
 * function, never itself persisted. Whether/when that's actually written as real ledger transactions
 * (exactly once per season, idempotently) is the job of hooks/useCoinLedger.
 */
import type { LeaderboardDataset, ScoringConfig } from '../data/types';
import type { Season } from './seasons';
import { CLAN_IDS, membersOfClan, type ClanId } from './clans';
import { computeClanStandings } from './clanPoints';
import { buildLeaderboard } from './scoring';
import { weekIndexesInRange } from './dates';

export type CoinTransactionReason =
  | 'solo_place_1'
  | 'solo_place_2'
  | 'solo_place_3'
  | 'solo_place_4'
  | 'solo_place_5'
  | 'clan_winner'
  | 'shop_redemption'
  | 'shop_refund';

export interface CoinTransaction {
  id: string;
  memberId: string;
  seasonId: string;
  /** Positive = credit (a season award), negative = debit (a shop redemption or its refund). */
  amount: number;
  reason: CoinTransactionReason;
  dateISO: string;
}

/** Starting demo values. */
export const SOLO_COIN_AWARDS: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 500, 2: 350, 3: 250, 4: 175, 5: 125 };
export const CLAN_WINNER_COINS_PER_MEMBER = 100;

function soloReasonForRank(rank: number): CoinTransactionReason | null {
  switch (rank) {
    case 1:
      return 'solo_place_1';
    case 2:
      return 'solo_place_2';
    case 3:
      return 'solo_place_3';
    case 4:
      return 'solo_place_4';
    case 5:
      return 'solo_place_5';
    default:
      return null;
  }
}

/**
 * What should be awarded for one season — solo #1-5 (by `overallRank`, the same season-true rank
 * used everywhere else in this app) plus every member of the season's #1-ranked clan (by
 * computeClanStandings' fair average-points ranking).
 *
 * Ties are handled by construction, not special-cased: competition ranking means two members tied
 * for #1 both receive the #1 amount, and whoever comes next receives their own real rank's amount
 * (e.g. #3, never a skipped #2). "Eligible member" for the clan award means "a roster member of the
 * winning clan this season" — a real rollout may define a stricter eligibility bar (e.g. a minimum
 * participation threshold); that's flagged in the UI, not decided here.
 *
 * Deterministic ids (`{season}:{reason}:{member}`) so calling this twice for the same season always
 * produces identical transactions — the property the ledger's idempotent finalization relies on.
 */
export function computeSeasonCoinAwards(
  dataset: LeaderboardDataset,
  config: ScoringConfig,
  clanAssignments: Record<string, ClanId>,
  season: Season,
  previousSeason: Season | null,
): CoinTransaction[] {
  const out: CoinTransaction[] = [];
  const dateISO = season.endISO;

  const weekIndexes = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, season.startISO, season.endISO);
  const result = buildLeaderboard({ members: dataset.members, scores: dataset.scores, weekIndexes, weekCount: dataset.weekCount, metric: 'overall', config });
  for (const row of result.rows) {
    if (row.overallRank == null) continue;
    const reason = soloReasonForRank(row.overallRank);
    if (!reason) continue;
    out.push({
      id: `${season.id}:${reason}:${row.member.id}`,
      memberId: row.member.id,
      seasonId: season.id,
      amount: SOLO_COIN_AWARDS[row.overallRank as 1 | 2 | 3 | 4 | 5],
      reason,
      dateISO,
    });
  }

  const standings = computeClanStandings(dataset, config, clanAssignments, CLAN_IDS, season, previousSeason);
  const winner = standings.find((s) => s.rank === 1);
  if (winner) {
    for (const member of membersOfClan(dataset.members, clanAssignments, winner.clanId)) {
      out.push({
        id: `${season.id}:clan_winner:${member.id}`,
        memberId: member.id,
        seasonId: season.id,
        amount: CLAN_WINNER_COINS_PER_MEMBER,
        reason: 'clan_winner',
        dateISO,
      });
    }
  }

  return out;
}

export function balanceForMember(transactions: readonly CoinTransaction[], memberId: string): number {
  return transactions.filter((t) => t.memberId === memberId).reduce((sum, t) => sum + t.amount, 0);
}

/** Most recent first. */
export function transactionsForMember(transactions: readonly CoinTransaction[], memberId: string): CoinTransaction[] {
  return transactions.filter((t) => t.memberId === memberId).sort((a, b) => b.dateISO.localeCompare(a.dateISO) || b.id.localeCompare(a.id));
}
