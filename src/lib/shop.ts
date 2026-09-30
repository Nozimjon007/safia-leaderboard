/**
 * The Safia Rewards Shop — spends Safia Coins (lib/coins.ts) on a small configurable demo catalog.
 * Nothing here is official: prices, items and eligibility are a proposed starting catalog pending
 * management approval (see shop_disclaimer in the i18n dictionaries).
 *
 * Every catalog item results in a *request*, never an instant purchase: coins are deducted the
 * moment a request is made (so the balance always reflects committed spend), but every redemption
 * starts life as 'pending' — nothing in this demo auto-fulfills, matching how a real merchandise
 * order (sizing/shipping) or a leadership conversation (a real calendar) would actually work.
 */
export type ShopCategory = 'merchandise' | 'learning' | 'experiences';

/** What kind of real-world step stands between "requested" and "fulfilled" — shown on each item so
 * the pending state always says something concrete, not just "pending". */
export type ShopPendingReason = 'fulfillment' | 'scheduling' | 'approval';

export interface ShopItem {
  id: string;
  category: ShopCategory;
  priceCoins: number;
  pendingReason: ShopPendingReason;
  limitedAvailability?: boolean;
}

/** Starting demo catalog — proposed prices and items, not an official Safia benefits list. */
export const SHOP_CATALOG: readonly ShopItem[] = [
  { id: 'embroidered_apron', category: 'merchandise', priceCoins: 150, pendingReason: 'fulfillment' },
  { id: 'polo_workwear', category: 'merchandise', priceCoins: 250, pendingReason: 'fulfillment' },
  { id: 'jacket', category: 'merchandise', priceCoins: 450, pendingReason: 'fulfillment' },
  { id: 'baking_masterclass', category: 'learning', priceCoins: 300, pendingReason: 'scheduling' },
  { id: 'course_voucher', category: 'learning', priceCoins: 600, pendingReason: 'scheduling' },
  { id: 'ceo_conversation', category: 'experiences', priceCoins: 400, pendingReason: 'approval' },
  { id: 'dinner_with_leadership', category: 'experiences', priceCoins: 750, pendingReason: 'approval', limitedAvailability: true },
];

export const SHOP_CATEGORIES: readonly ShopCategory[] = ['merchandise', 'learning', 'experiences'];

export function shopItemById(id: string): ShopItem | null {
  return SHOP_CATALOG.find((i) => i.id === id) ?? null;
}

export type RedemptionStatus = 'pending' | 'approved' | 'fulfilled' | 'rejected';

export interface Redemption {
  id: string;
  memberId: string;
  itemId: string;
  status: RedemptionStatus;
  coinsSpent: number;
  requestedDateISO: string;
}

/** A member already has an open (not yet resolved) request for this item — the "prevent duplicate
 * redemptions" rule: you can re-request only after a prior request is fulfilled or rejected. */
export function hasOpenRedemption(redemptions: readonly Redemption[], memberId: string, itemId: string): boolean {
  return redemptions.some((r) => r.memberId === memberId && r.itemId === itemId && (r.status === 'pending' || r.status === 'approved'));
}

export function redemptionsForMember(redemptions: readonly Redemption[], memberId: string): Redemption[] {
  return redemptions
    .filter((r) => r.memberId === memberId)
    .sort((a, b) => b.requestedDateISO.localeCompare(a.requestedDateISO) || b.id.localeCompare(a.id));
}

/** The cheapest catalog item a member can't yet afford — a concrete "what you're saving toward"
 * next milestone (My Next Move, the shop's own savings-goal banner). Null once a member can already
 * afford the whole catalog. Deliberately balance-only, not eligibility-aware: every item is already
 * open to "any current employee with sufficient balance" (see shop_eligibility_note), so price is
 * the only real gate today. */
export function nextSavingsGoal(balance: number): ShopItem | null {
  const unaffordable = [...SHOP_CATALOG].filter((i) => i.priceCoins > balance).sort((a, b) => a.priceCoins - b.priceCoins);
  return unaffordable[0] ?? null;
}
