import { Link } from 'react-router-dom';
import { balanceForMember, transactionsForMember, type CoinTransaction } from '../../lib/coins';
import { formatShortDate } from '../../lib/dates';
import { useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import styles from './CoinsPanel.module.css';

interface CoinsPanelProps {
  memberId: string;
  /** The whole ledger — filtered to this member internally, so callers never have to. */
  transactions: readonly CoinTransaction[];
}

/** Balance + full transaction history for one member — see lib/coins.ts. Shown on the profile and
 * (with redemption entries too, once the shop exists) reused there. */
export function CoinsPanel({ memberId, transactions }: CoinsPanelProps) {
  const { t, locale } = useI18n();
  const mine = transactionsForMember(transactions, memberId);
  const balance = balanceForMember(transactions, memberId);

  return (
    <section className={styles.panel} aria-labelledby="coins-panel-heading">
      <h2 id="coins-panel-heading">{t('coins_balance_label')}</h2>
      <p className={styles.balance}>
        <b className="tabular">{balance.toLocaleString(locale)}</b> <span>{t('coins_balance_unit')}</span>
      </p>
      <p className={styles.disclaimer}>{t('coins_disclaimer')}</p>
      <p className={styles.shopLink}>
        <Link to="/shop">{t('shop_visit_link')}</Link>
      </p>

      {mine.length === 0 ? (
        <p className={styles.empty}>{t('coins_history_empty')}</p>
      ) : (
        <details className={styles.details}>
          <summary>
            {t('coins_history_heading')} ({mine.length})
          </summary>
          <ul className={styles.list}>
            {mine.map((tx) => (
              <li key={tx.id}>
                <span className={styles.reason}>{t(`coin_reason_${tx.reason}` as TranslationKey)}</span>
                <span className={`${styles.amount} tabular`} data-negative={tx.amount < 0 || undefined}>
                  {tx.amount > 0 ? '+' : ''}
                  {tx.amount.toLocaleString(locale)}
                </span>
                <span className={styles.date}>{formatShortDate(tx.dateISO)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
