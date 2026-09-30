import type { CSSProperties } from 'react';
import type { ShopItem } from '../../lib/shop';
import { shopCategoryLabel, shopItemDescription, shopItemName, shopPendingReasonLabel, useI18n } from '../../i18n';
import { ShopIcon, CATEGORY_ACCENT_VAR } from './ShopIcon';
import styles from './ShopProductCard.module.css';

interface ShopProductCardProps {
  item: ShopItem;
  hasViewer: boolean;
  affordable: boolean;
  disabledReason: string | null;
  shortfall: number;
  confirming: boolean;
  balance: number;
  /** True for the one item the savings-goal callout above the grid is pointing at — see ShopPage's
   * nextSavingsGoal() call, the same helper My Next Move uses so the two pages never name different
   * items as "what you're saving for". */
  isGoal?: boolean;
  onRequestClick: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/** One catalog item — image band (ShopIcon, never a bare emoji), price/eligibility/availability/
 * approval detail, and the request flow (disabled-with-reason, or an inline before/after balance
 * confirmation). */
export function ShopProductCard({
  item,
  hasViewer,
  affordable,
  disabledReason,
  shortfall,
  confirming,
  balance,
  isGoal = false,
  onRequestClick,
  onConfirm,
  onCancel,
}: ShopProductCardProps) {
  const { t, locale } = useI18n();

  return (
    <li id={`shop-item-${item.id}`} className={styles.card} data-category={item.category} data-goal={isGoal || undefined}>
      <div className={styles.imageBand} style={{ '--product-accent': `var(${CATEGORY_ACCENT_VAR[item.category]})` } as CSSProperties}>
        <span className={styles.imageGrain} aria-hidden="true" />
        <span className={styles.icon}>
          <ShopIcon itemId={item.id} />
        </span>
        {isGoal && <span className={styles.goalBadge}>{t('shop_goal_badge')}</span>}
        {item.limitedAvailability && <span className={styles.limited}>{t('shop_limited_badge')}</span>}
      </div>

      <div className={styles.body}>
        <span className={styles.category}>{shopCategoryLabel(t, item.category)}</span>
        <h2 className={styles.itemName}>{shopItemName(t, item.id)}</h2>
        <p className={styles.itemDesc}>{shopItemDescription(t, item.id)}</p>
        <p className={styles.itemMeta}>{t('shop_eligibility_note')}</p>
        <p className={styles.itemMeta}>{shopPendingReasonLabel(t, item.pendingReason)}</p>

        <div className={styles.footer}>
          <b className={`${styles.price} tabular`}>{t('shop_price_label', { price: item.priceCoins.toLocaleString(locale) })}</b>
          {!confirming && (
            <button type="button" className="btn btnPrimary" disabled={!hasViewer || disabledReason != null} title={disabledReason ?? undefined} onClick={onRequestClick}>
              {t('shop_request_button')}
            </button>
          )}
        </div>

        {hasViewer && disabledReason && !confirming && (
          <p className={styles.disabledNote}>
            {disabledReason}
            {!affordable && shortfall > 0 && <> — {t('shop_need_more_coins', { n: shortfall.toLocaleString(locale) })}</>}
          </p>
        )}

        {confirming && (
          <div className={styles.confirm}>
            <h3>{t('shop_confirm_heading')}</h3>
            <p>
              {t('shop_confirm_balance_before')}: <b className="tabular">{balance.toLocaleString(locale)}</b>
            </p>
            <p>
              {t('shop_confirm_balance_after')}: <b className="tabular">{(balance - item.priceCoins).toLocaleString(locale)}</b>
            </p>
            <div className={styles.confirmActions}>
              <button type="button" className="btn btnPrimary" onClick={onConfirm}>
                {t('shop_confirm_submit')}
              </button>
              <button type="button" className="btn" onClick={onCancel}>
                {t('shop_confirm_cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
