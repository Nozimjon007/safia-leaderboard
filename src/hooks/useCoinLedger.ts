import { useCallback, useState } from 'react';
import type { LeaderboardDataset, ScoringConfig } from '../data/types';
import { buildDemoDataset } from '../data/demoData';
import { DEFAULT_SCORING_CONFIG } from '../data/types';
import type { Season } from '../lib/seasons';
import { isSeasonApproved, listSeasons } from '../lib/seasons';
import { computeClanAssignments, type ClanId } from '../lib/clans';
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

/**
 * "The demo must allow me to demonstrate a purchase request" — a brand-new browser has no coins
 * and every product is disabled, which isn't a usable demo. So the very first time anything reads
 * the ledger, this seeds one real, already-complete past season's awards (never the current, still-
 * live season — its coins stay genuinely pending until someone finalizes it) computed from the exact
 * same deterministic demo dataset and scoring rules as the rest of the app, so it's internally
 * consistent with every other screen, not fabricated separately. Clearly a demo seed, not real Safia
 * history: it's simply last season's real computed standings, finalized automatically instead of by
 * a click, exactly as "Finalize season awards" would have produced.
 */
function computeSeedTransactions(): CoinTransaction[] {
  try {
    const dataset = buildDemoDataset();
    const today = new Date().toISOString().slice(0, 10);
    const seasons = listSeasons(dataset.firstWeekStart, today);
    // seasons[length-1] is the real-world current (possibly still-live) season — never seed that one.
    // seasons[length-2] is the most recent fully-elapsed season, which the approval-grace window means
    // is essentially always already approved by the time anyone opens this demo.
    if (seasons.length < 2) return [];
    const seedSeason = seasons[seasons.length - 2];
    const previousSeason = seasons.length >= 3 ? seasons[seasons.length - 3] : null;
    if (!isSeasonApproved(seedSeason)) return [];
    const clanAssignments = computeClanAssignments(dataset.members);
    return computeSeasonCoinAwards(dataset, DEFAULT_SCORING_CONFIG, clanAssignments, seedSeason, previousSeason);
  } catch {
    return [];
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
  /** Replaces one transaction's fields by id (used to move a redemption's matching debit — a
   * refund is a new, separate transaction instead; this is for correcting/annotating, not spending). */
  updateTransaction: (id: string, patch: Partial<CoinTransaction>) => void;
  /** The demo-data reset affordance the spec asks the shop to offer — clears every coin transaction
   * (awards and redemptions alike) and re-seeds the one demo starting point (see
   * computeSeedTransactions), so the demo stays immediately re-demonstrable rather than going back
   * to a broken, everyone-has-zero-coins state. */
  resetAll: () => void;
}

/** localStorage-backed, same pattern as useSeasonReveal/useNewlyEarnedStars — each page that needs
 * the ledger calls this independently and reads fresh state on mount, so navigating between pages
 * after a finalize or a redemption always shows the latest balance without a shared provider. */
export function useCoinLedger(): CoinLedger {
  const [transactions, setTransactions] = useState<CoinTransaction[]>(() => {
    const stored = readStored();
    if (stored.length > 0) return stored;
    const seeded = computeSeedTransactions();
    if (seeded.length > 0) writeStored(seeded);
    return seeded;
  });

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

  const updateTransaction = useCallback((id: string, patch: Partial<CoinTransaction>) => {
    setTransactions((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
      writeStored(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    const seeded = computeSeedTransactions();
    setTransactions(seeded);
    try {
      if (seeded.length > 0) writeStored(seeded);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { transactions, isSeasonFinalized, finalizeSeason, addTransaction, updateTransaction, resetAll };
}
