import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDatasetContext } from '../state/DatasetProvider';
import { useScoringConfig } from '../state/ScoringConfigProvider';
import { useViewAsMemberId } from '../hooks/useViewAsMember';
import { useCoinLedger } from '../hooks/useCoinLedger';
import { useShopRedemptions } from '../hooks/useShopRedemptions';
import { useClanAssignments } from '../hooks/useClans';
import { useSeasons } from '../hooks/useSeasons';
import { balanceForMember, computeSeasonCoinAwards, transactionsForMember } from '../lib/coins';
import { hasOpenRedemption, nextSavingsGoal, redemptionsForMember, SHOP_CATALOG, SHOP_CATEGORIES, type Redemption, type ShopCategory, type ShopItem } from '../lib/shop';
import { shopCategoryLabel, shopItemName, shopStatusLabel, useI18n } from '../i18n';
import type { TranslationKey } from '../i18n/locales/en';
import { formatShortDate } from '../lib/dates';
import { DemoBanner } from '../components/common/DemoBanner';
import { StateMessage } from '../components/common/StateMessage';
import { LeaderboardSkeleton } from '../components/leaderboard/LeaderboardSkeleton';
import { ShopProductCard } from '../components/shop/ShopProductCard';
import { StatTile } from '../components/charts/StatTile';
import styles from './ShopPage.module.css';

const STATUS_GLYPH: Record<Redemption['status'], string> = { pending: '⏳', approved: '✓', fulfilled: '★', rejected: '✕' };

/** Richest-first, for the shop's own "Preview as demo employee" default (see the spec: a fresh
 * demo must be able to show an affordable request immediately, not zero coins for everyone). */
function richestMemberId(transactions: { memberId: string; amount: number }[]): string | null {
  const byMember = new Map<string, number>();
  for (const tx of transactions) byMember.set(tx.memberId, (byMember.get(tx.memberId) ?? 0) + tx.amount);
  let best: string | null = null;
  let bestAmount = -Infinity;
  for (const [id, amount] of byMember) {
    if (amount > bestAmount) {
      best = id;
      bestAmount = amount;
    }
  }
  return best;
}

export function ShopPage() {
  const { t, locale } = useI18n();
  const { status, dataset, error, reload } = useDatasetContext();
  const { config } = useScoringConfig();
  const seasonsInfo = useSeasons(dataset);
  const clanAssignments = useClanAssignments(dataset);
  const coinLedger = useCoinLedger();
  const shopStore = useShopRedemptions();
  const [viewAsMemberId, setViewAsMemberId] = useViewAsMemberId(richestMemberId(coinLedger.transactions));
  const [category, setCategory] = useState<ShopCategory | 'all'>('all');
  const [confirmingItemId, setConfirmingItemId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // A live preview of what the *current*, still-open season would award if finalized today — never
  // written to the ledger (see lib/coins.ts's module docs on why finalize is a deliberate, one-time
  // action), just shown so "pending" coins are a real, honest number rather than a vague promise.
  const pendingByMember = useMemo(() => {
    if (!dataset || !seasonsInfo) return {};
    const idx = seasonsInfo.seasons.findIndex((s) => s.id === seasonsInfo.currentSeason.id);
    const previous = idx > 0 ? seasonsInfo.seasons[idx - 1] : null;
    const preview = computeSeasonCoinAwards(dataset, config, clanAssignments, seasonsInfo.currentSeason, previous);
    const byMember: Record<string, number> = {};
    for (const tx of preview) byMember[tx.memberId] = (byMember[tx.memberId] ?? 0) + tx.amount;
    return byMember;
  }, [dataset, seasonsInfo, config, clanAssignments]);

  if (status === 'error') {
    return (
      <>
        <DemoBanner />
        <StateMessage
          title={t('state_error_title')}
          role="alert"
          body={
            <>
              {t('state_error_body')}
              <br />
              {error}
            </>
          }
          action={
            <button type="button" className="btn btnPrimary" onClick={reload}>
              {t('state_retry')}
            </button>
          }
        />
      </>
    );
  }

  if (status === 'loading' || !dataset) {
    return (
      <>
        <DemoBanner />
        <LeaderboardSkeleton />
      </>
    );
  }

  const member = viewAsMemberId ? (dataset.members.find((m) => m.id === viewAsMemberId) ?? null) : null;
  const balance = member ? balanceForMember(coinLedger.transactions, member.id) : 0;
  const goal = member ? nextSavingsGoal(balance) : null;
  const pendingCoins = member ? (pendingByMember[member.id] ?? 0) : 0;
  const myRedemptions = member ? redemptionsForMember(shopStore.redemptions, member.id) : [];
  // Earn-only view of the ledger (never redemption/refund rows — those already have their own
  // request-history section below) — see shop_earned_note: always a real, already-approved season's
  // awards, never a still-open one (the pending-coins preview above is never written here).
  const earnHistory = member
    ? transactionsForMember(coinLedger.transactions, member.id).filter((tx) => tx.reason !== 'shop_redemption' && tx.reason !== 'shop_refund')
    : [];
  const reservedCoins = myRedemptions.filter((r) => r.status === 'pending' || r.status === 'approved').reduce((sum, r) => sum + r.coinsSpent, 0);
  const items = category === 'all' ? SHOP_CATALOG : SHOP_CATALOG.filter((i) => i.category === category);

  function requestItem(item: ShopItem) {
    if (!member) return;
    const dateISO = new Date().toISOString().slice(0, 10);
    // A running count of this member's own transactions is unique enough for one browser/tab and
    // avoids reaching for Date.now() inside the component body.
    const stamp = `${member.id}:${item.id}:${coinLedger.transactions.length}:${shopStore.redemptions.length}`;
    coinLedger.addTransaction({ id: `${stamp}:coin`, memberId: member.id, seasonId: 'shop', amount: -item.priceCoins, reason: 'shop_redemption', dateISO });
    shopStore.addRedemption({ id: stamp, memberId: member.id, itemId: item.id, status: 'pending', coinsSpent: item.priceCoins, requestedDateISO: dateISO });
    setConfirmingItemId(null);
    setToast(t('shop_request_success', { item: shopItemName(t, item.id) }));
  }

  // The demo's stand-in for a real management decision — clearly labeled as a simulation in the UI
  // (never presented as authentication or a real approval system). Rejecting refunds the exact
  // amount reserved, as its own new ledger entry (never editing the original debit).
  function decideRedemption(r: Redemption, approve: boolean) {
    shopStore.setStatus(r.id, approve ? 'approved' : 'rejected');
    if (!approve) {
      coinLedger.addTransaction({
        id: `${r.id}:refund`,
        memberId: r.memberId,
        seasonId: 'shop',
        amount: r.coinsSpent,
        reason: 'shop_refund',
        dateISO: new Date().toISOString().slice(0, 10),
      });
    }
    setToast(approve ? t('shop_admin_approved', { item: shopItemName(t, r.itemId) }) : t('shop_admin_rejected', { item: shopItemName(t, r.itemId) }));
  }

  function resetDemoData() {
    coinLedger.resetAll();
    shopStore.resetAll();
    setConfirmingItemId(null);
    setToast(t('shop_reset_done'));
  }

  return (
    <>
      <DemoBanner />
      <div className={styles.head}>
        <div>
          <h1>{t('shop_title')}</h1>
          <p className={styles.disclaimer}>{t('shop_disclaimer')}</p>
        </div>
        <button type="button" className="btn" onClick={resetDemoData}>
          {t('shop_reset_button')}
        </button>
      </div>

      <section className={styles.viewer}>
        <label className={styles.viewerField} htmlFor="shop-view-as-select">
          <span className="fieldLabel">{t('view_as_picker_label')}</span>
          <select
            id="shop-view-as-select"
            className="select"
            value={viewAsMemberId ?? ''}
            onChange={(e) => e.target.value && setViewAsMemberId(e.target.value)}
          >
            <option value="">{t('view_as_picker_none')}</option>
            {[...dataset.members]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </label>
        {member ? (
          <div className={styles.balanceRow}>
            <StatTile compact label={t('coins_balance_label')} value={<span className={styles.balanceValue}>{balance.toLocaleString(locale)}</span>} />
            <StatTile
              compact
              label={t('coins_reserved_label')}
              value={<span className={styles.reservedValue}>{reservedCoins.toLocaleString(locale)}</span>}
              description={t('coins_reserved_desc')}
            />
            <StatTile
              compact
              label={t('coins_pending_label')}
              value={<span className={styles.pendingValue}>{pendingCoins > 0 ? `+${pendingCoins.toLocaleString(locale)}` : '0'}</span>}
              description={t('coins_pending_desc')}
            />
            <Link to={{ pathname: `/member/${member.id}` }} className={styles.balanceLink}>
              {member.name} →
            </Link>
          </div>
        ) : (
          <p className={styles.pickNote}>{t('shop_pick_viewer_note')}</p>
        )}
      </section>

      {member && (
        <section className={styles.earned} aria-labelledby="shop-earned-heading">
          <h2 id="shop-earned-heading">{t('shop_earned_heading')}</h2>
          <p className={styles.earnedNote}>{t('shop_earned_note')}</p>
          {earnHistory.length === 0 ? (
            <p className={styles.pickNote}>{t('coins_history_empty')}</p>
          ) : (
            <ul className={styles.earnedList}>
              {earnHistory.map((tx) => (
                <li key={tx.id} className={styles.earnedRow}>
                  <span className={styles.earnedReason}>{t(`coin_reason_${tx.reason}` as TranslationKey)}</span>
                  <span className={`${styles.earnedCoins} tabular`}>+{tx.amount.toLocaleString(locale)}</span>
                  <span className={styles.historyDate}>{formatShortDate(tx.dateISO)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {member &&
        (goal ? (
          <a href={`#shop-item-${goal.id}`} className={styles.goalCallout}>
            <div className={styles.goalText}>
              <span className={styles.goalLabel}>{t('my_next_move_saving_label')}</span>
              <span className={styles.goalName}>{shopItemName(t, goal.id)}</span>
              <span className={styles.goalGap}>{t('my_next_move_saving_gap', { n: Math.max(0, goal.priceCoins - balance).toLocaleString(locale) })}</span>
            </div>
            <div className={styles.goalBar} role="presentation">
              <div className={styles.goalBarFill} style={{ width: `${Math.min(100, (balance / goal.priceCoins) * 100)}%` }} />
            </div>
          </a>
        ) : (
          <p className={styles.goalDone}>{t('my_next_move_saving_done')}</p>
        ))}

      <div className={styles.categoryRow}>
        <div className="segment" role="group" aria-label={t('shop_category_all')}>
          <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>
            {t('shop_category_all')}
          </button>
          {SHOP_CATEGORIES.map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}>
              {shopCategoryLabel(t, c)}
            </button>
          ))}
        </div>
      </div>

      <ul className={styles.grid}>
        {items.map((item) => {
          const affordable = member != null && balance >= item.priceCoins;
          const duplicate = member != null && hasOpenRedemption(shopStore.redemptions, member.id, item.id);
          const disabledReason = !member ? null : duplicate ? t('shop_request_already_open') : !affordable ? t('shop_request_insufficient') : null;

          return (
            <ShopProductCard
              key={item.id}
              item={item}
              hasViewer={member != null}
              affordable={affordable}
              disabledReason={disabledReason}
              shortfall={member ? Math.max(0, item.priceCoins - balance) : 0}
              confirming={confirmingItemId === item.id}
              balance={balance}
              isGoal={goal?.id === item.id}
              onRequestClick={() => setConfirmingItemId(item.id)}
              onConfirm={() => requestItem(item)}
              onCancel={() => setConfirmingItemId(null)}
            />
          );
        })}
      </ul>

      {member && (
        <section className={styles.history} aria-labelledby="shop-history-heading">
          <h2 id="shop-history-heading">{t('shop_history_heading')}</h2>
          {myRedemptions.length === 0 ? (
            <p className={styles.pickNote}>{t('shop_history_empty')}</p>
          ) : (
            <ul className={styles.historyList}>
              {myRedemptions.map((r) => (
                <li key={r.id} className={styles.historyRow} data-status={r.status}>
                  <span aria-hidden="true">{STATUS_GLYPH[r.status]}</span>
                  <span className={styles.historyItemName}>{shopItemName(t, r.itemId)}</span>
                  <span className={styles.historyStatus}>{shopStatusLabel(t, r.status)}</span>
                  <span className={`${styles.historyCoins} tabular`}>-{r.coinsSpent.toLocaleString(locale)}</span>
                  <span className={styles.historyDate}>{r.requestedDateISO}</span>
                  {r.status === 'pending' && (
                    <span className={styles.historyActions}>
                      <span className={styles.demoNote}>{t('shop_admin_note')}</span>
                      <button type="button" className={styles.approveBtn} onClick={() => decideRedemption(r, true)}>
                        {t('shop_approve_action')}
                      </button>
                      <button type="button" className={styles.rejectBtn} onClick={() => decideRedemption(r, false)}>
                        {t('shop_reject_action')}
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className={styles.toast} role="status" aria-live="polite" hidden={!toast}>
        {toast}
      </div>
    </>
  );
}
