import { useCallback, useState } from 'react';
import type { LeaderboardDataset, ScoringConfig } from '../data/types';
import type { Season } from '../lib/seasons';
import { isSeasonApproved } from '../lib/seasons';
import type { ClanId } from '../lib/clans';
import { computeSeasonCoinAwards, type CoinTransaction } from '../lib/coins';

const STORAGE_KEY = 'lb_coin_ledger_v1';

function readStored(): CoinTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CoinTransaction[]) : [];
  } catch {
    return [];
  }
}

function writeStored(transactions: readonly CoinTransaction[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch {
    // Demo persistence only — a full/blocked store just means the ledger doesn't survive a refresh.
  }
}

export interface CoinLedger {
  transactions: CoinTransaction[];
  /** True once any non-redemption transaction exists for a season — the ledger itself is the single
   * source of truth for "has this season been finalized", so there's no separate flag to drift out
   * of sync with it. */
  isSeasonFinalized: (seasonId: string) => boolean;
  /** No-ops (returns []) unless the season is approved and not already finalized — the idempotency
   * guarantee the spec asks for. Returns the newly-written transactions so a caller can drive an
   * awards reveal from exactly what was just awarded. */
  finalizeSeason: (
    dataset: LeaderboardDataset,
    config: ScoringConfig,
    clanAssignments: Record<string, ClanId>,
    season: Season,
    previousSeason: Season | null,
    nowMs?: number,
  ) => CoinTransaction[];
  addTransaction: (tx: CoinTransaction) => void;
  /** The demo-data reset affordance the spec asks the shop to offer — clears every coin transaction
   * (awards and redemptions alike), never real Safia data since none exists here. */
  resetAll: () => void;
}

/** localStorage-backed, same pattern as useSeasonReveal/useNewlyEarnedStars — each page that needs
 * the ledger calls this independently and reads fresh state on mount, so navigating between pages
 * after a finalize or a redemption always shows the latest balance without a shared provider. */
export function useCoinLedger(): CoinLedger {
  const [transactions, setTransactions] = useState<CoinTransaction[]>(() => readStored());

  const isSeasonFinalized = useCallback(
    (seasonId: string) => transactions.some((t) => t.seasonId === seasonId && t.reason !== 'shop_redemption' && t.reason !== 'shop_refund'),
    [transactions],
  );

  const finalizeSeason = useCallback(
    (
      dataset: LeaderboardDataset,
      config: ScoringConfig,
      clanAssignments: Record<string, ClanId>,
      season: Season,
      previousSeason: Season | null,
      nowMs: number = Date.now(),
    ): CoinTransaction[] => {
      if (!isSeasonApproved(season, nowMs)) return [];
      if (isSeasonFinalized(season.id)) return [];
      const awards = computeSeasonCoinAwards(dataset, config, clanAssignments, season, previousSeason);
      setTransactions((prev) => {
        const next = [...prev, ...awards];
        writeStored(next);
        return next;
      });
      return awards;
    },
    [isSeasonFinalized],
  );

  const addTransaction = useCallback((tx: CoinTransaction) => {
    setTransactions((prev) => {
      const next = [...prev, tx];
      writeStored(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setTransactions([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { transactions, isSeasonFinalized, finalizeSeason, addTransaction, resetAll };
}
