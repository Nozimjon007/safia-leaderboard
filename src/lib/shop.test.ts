import { describe, expect, it } from 'vitest';
import { hasOpenRedemption, redemptionsForMember, shopItemById, SHOP_CATALOG, SHOP_CATEGORIES, type Redemption } from './shop';
import { en } from '../i18n/locales/en';

describe('SHOP_CATALOG', () => {
  it('has a unique id for every item', () => {
    const ids = SHOP_CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves an item by id, and null for an unknown one', () => {
    expect(shopItemById('jacket')?.priceCoins).toBe(450);
    expect(shopItemById('not-a-real-item')).toBeNull();
  });

  // shopItemName/Description/etc. (i18n/index.tsx) build their translation key from the catalog id
  // at runtime rather than through a checked map, so a typo wouldn't be caught by tsc — this is the
  // safety net for that.
  it('has a matching name/description translation key for every catalog item', () => {
    for (const item of SHOP_CATALOG) {
      expect(en, `missing shop_item_${item.id}_name`).toHaveProperty(`shop_item_${item.id}_name`);
      expect(en, `missing shop_item_${item.id}_desc`).toHaveProperty(`shop_item_${item.id}_desc`);
      expect(en, `missing shop_pending_${item.pendingReason}`).toHaveProperty(`shop_pending_${item.pendingReason}`);
    }
  });

  it('has a matching translation key for every shop category', () => {
    for (const category of SHOP_CATEGORIES) {
      expect(en, `missing shop_category_${category}`).toHaveProperty(`shop_category_${category}`);
    }
  });
});

describe('hasOpenRedemption', () => {
  const redemptions: Redemption[] = [
    { id: '1', memberId: 'alice', itemId: 'jacket', status: 'pending', coinsSpent: 450, requestedDateISO: '2026-07-01' },
    { id: '2', memberId: 'alice', itemId: 'polo_workwear', status: 'rejected', coinsSpent: 250, requestedDateISO: '2026-07-02' },
    { id: '3', memberId: 'bob', itemId: 'jacket', status: 'approved', coinsSpent: 450, requestedDateISO: '2026-07-03' },
  ];

  it('is true for a pending or approved request', () => {
    expect(hasOpenRedemption(redemptions, 'alice', 'jacket')).toBe(true);
    expect(hasOpenRedemption(redemptions, 'bob', 'jacket')).toBe(true);
  });

  it('is false once a request has been rejected — re-requesting is allowed', () => {
    expect(hasOpenRedemption(redemptions, 'alice', 'polo_workwear')).toBe(false);
  });

  it('is false for an item never requested by that member', () => {
    expect(hasOpenRedemption(redemptions, 'bob', 'embroidered_apron')).toBe(false);
  });
});

describe('redemptionsForMember', () => {
  const redemptions: Redemption[] = [
    { id: '1', memberId: 'alice', itemId: 'jacket', status: 'pending', coinsSpent: 450, requestedDateISO: '2026-07-01' },
    { id: '2', memberId: 'alice', itemId: 'polo_workwear', status: 'rejected', coinsSpent: 250, requestedDateISO: '2026-07-05' },
    { id: '3', memberId: 'bob', itemId: 'jacket', status: 'approved', coinsSpent: 450, requestedDateISO: '2026-07-03' },
  ];

  it('returns only the given member’s redemptions, most recent first', () => {
    expect(redemptionsForMember(redemptions, 'alice').map((r) => r.id)).toEqual(['2', '1']);
  });
});
