import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDatasetContext } from '../state/DatasetProvider';
import { useViewAsMemberId } from '../hooks/useViewAsMember';
import { useCoinLedger } from '../hooks/useCoinLedger';
import { useShopRedemptions } from '../hooks/useShopRedemptions';
import { balanceForMember } from '../lib/coins';
import { hasOpenRedemption, redemptionsForMember, SHOP_CATALOG, SHOP_CATEGORIES, type Redemption, type ShopCategory, type ShopItem } from '../lib/shop';
import { shopCategoryLabel, shopItemDescription, shopItemName, shopPendingReasonLabel, shopStatusLabel, useI18n } from '../i18n';
import { DemoBanner } from '../components/common/DemoBanner';
import { StateMessage } from '../components/common/StateMessage';
import { LeaderboardSkeleton } from '../components/leaderboard/LeaderboardSkeleton';
import styles from './ShopPage.module.css';

const CATEGORY_GLYPH: Record<ShopCategory, string> = { merchandise: '👕', learning: '🎓', experiences: '✨' };
const STATUS_GLYPH: Record<Redemption['status'], string> = { pending: '⏳', approved: '✓', fulfilled: '★', rejected: '✕' };

export function ShopPage() {
  const { t, locale } = useI18n();
  const { status, dataset, error, reload } = useDatasetContext();
  const [viewAsMemberId, setViewAsMemberId] = useViewAsMemberId(null);
  const coinLedger = useCoinLedger();
  const shopStore = useShopRedemptions();
  const [category, setCategory] = useState<ShopCategory | 'all'>('all');
  const [confirmingItemId, setConfirmingItemId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

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
  const myRedemptions = member ? redemptionsForMember(shopStore.redemptions, member.id) : [];
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
          <div className={styles.balance}>
            <b className="tabular">{balance.toLocaleString(locale)}</b>
            <span>{t('coins_balance_unit')}</span>
            <Link to={{ pathname: `/member/${member.id}` }} className={styles.balanceLink}>
              {member.name} →
            </Link>
          </div>
        ) : (
          <p className={styles.pickNote}>{t('shop_pick_viewer_note')}</p>
        )}
      </section>

      <div className={styles.categoryRow}>
        <div className="segment" role="group" aria-label={t('shop_category_all')}>
          <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>
            {t('shop_category_all')}
          </button>
          {SHOP_CATEGORIES.map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}>
              {CATEGORY_GLYPH[c]} {shopCategoryLabel(t, c)}
            </button>
          ))}
        </div>
      </div>

      <ul className={styles.grid}>
        {items.map((item) => {
          const affordable = member != null && balance >= item.priceCoins;
          const duplicate = member != null && hasOpenRedemption(shopStore.redemptions, member.id, item.id);
          const disabledReason = !member ? null : duplicate ? t('shop_request_already_open') : !affordable ? t('shop_request_insufficient') : null;
          const confirming = confirmingItemId === item.id;

          return (
            <li key={item.id} className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.glyph} aria-hidden="true">
                  {CATEGORY_GLYPH[item.category]}
                </span>
                <div>
                  <h2 className={styles.itemName}>{shopItemName(t, item.id)}</h2>
                  <span className={styles.category}>{shopCategoryLabel(t, item.category)}</span>
                </div>
                {item.limitedAvailability && <span className={styles.limited}>{t('shop_limited_badge')}</span>}
              </div>
              <p className={styles.itemDesc}>{shopItemDescription(t, item.id)}</p>
              <p className={styles.itemMeta}>{t('shop_eligibility_note')}</p>
              <p className={styles.itemMeta}>{shopPendingReasonLabel(t, item.pendingReason)}</p>

              <div className={styles.cardFooter}>
                <b className={`${styles.price} tabular`}>{t('shop_price_label', { price: item.priceCoins.toLocaleString(locale) })}</b>
                {!confirming ? (
                  <button
                    type="button"
                    className="btn btnPrimary"
                    disabled={!member || disabledReason != null}
                    title={disabledReason ?? undefined}
                    onClick={() => setConfirmingItemId(item.id)}
                  >
                    {t('shop_request_button')}
                  </button>
                ) : null}
              </div>
              {member && disabledReason && !confirming && <p className={styles.disabledNote}>{disabledReason}</p>}

              {confirming && member && (
                <div className={styles.confirm}>
                  <h3>{t('shop_confirm_heading')}</h3>
                  <p>
                    {t('shop_confirm_balance_before')}: <b className="tabular">{balance.toLocaleString(locale)}</b>
                  </p>
                  <p>
                    {t('shop_confirm_balance_after')}: <b className="tabular">{(balance - item.priceCoins).toLocaleString(locale)}</b>
                  </p>
                  <div className={styles.confirmActions}>
                    <button type="button" className="btn btnPrimary" onClick={() => requestItem(item)}>
                      {t('shop_confirm_submit')}
                    </button>
                    <button type="button" className="btn" onClick={() => setConfirmingItemId(null)}>
                      {t('shop_confirm_cancel')}
                    </button>
                  </div>
                </div>
              )}
            </li>
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
