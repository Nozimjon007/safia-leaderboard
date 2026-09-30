import { useCallback, useState } from 'react';
import type { Redemption } from '../lib/shop';

const STORAGE_KEY = 'lb_shop_redemptions_v1';

function readStored(): Redemption[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Redemption[]) : [];
  } catch {
    return [];
  }
}

function writeStored(redemptions: readonly Redemption[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(redemptions));
  } catch {
    // Demo persistence only.
  }
}

export interface ShopRedemptionsStore {
  redemptions: Redemption[];
  addRedemption: (r: Redemption) => void;
  /** Moves one redemption to a new status — the demo's stand-in for a real management
   * approve/reject workflow (see ShopPage's clearly-labeled "demo simulation" controls). */
  setStatus: (id: string, status: Redemption['status']) => void;
  resetAll: () => void;
}

/** localStorage-backed, same pattern as useCoinLedger — the request itself (this store) and the
 * coins it spends (useCoinLedger) are separate stores; the shop page orchestrates both together so
 * a request is never recorded without its matching coin debit, or vice versa. */
export function useShopRedemptions(): ShopRedemptionsStore {
  const [redemptions, setRedemptions] = useState<Redemption[]>(() => readStored());

  const addRedemption = useCallback((r: Redemption) => {
    setRedemptions((prev) => {
      const next = [...prev, r];
      writeStored(next);
      return next;
    });
  }, []);

  const setStatus = useCallback((id: string, status: Redemption['status']) => {
    setRedemptions((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, status } : r));
      writeStored(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setRedemptions([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { redemptions, addRedemption, setStatus, resetAll };
}
