import { useLocation, Link } from 'react-router-dom';
import { CATEGORY_KEYS } from '../../data/types';
import type { ScoreReceipt } from '../../lib/scoring';
import { categoryLabel, useI18n } from '../../i18n';
import { formatScore } from '../../lib/format';
import styles from './ScoreReceiptPanel.module.css';

interface ScoreReceiptPanelProps {
  receipt: ScoreReceipt;
  locale: string;
}

/**
 * A line-item breakdown of the overall score shown elsewhere on this page —
 * every number here comes straight from `scoreReceipt()`, the same function
 * that produced that score, so this can never show a different calculation
 * than the one actually used.
 */
export function ScoreReceiptPanel({ receipt, locale }: ScoreReceiptPanelProps) {
  const { t } = useI18n();
  const location = useLocation();
  const usedCount = receipt.rows.filter((r) => r.contribution != null).length;

  return (
    <section className={styles.panel} aria-labelledby="score-receipt-heading">
      <h2 id="score-receipt-heading">{t('score_receipt_title')}</h2>
      <p className={styles.sub}>{t('score_receipt_subtitle')}</p>

      <details className={styles.details}>
        <summary>{t('score_receipt_toggle', { used: usedCount, total: CATEGORY_KEYS.length })}</summary>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('score_receipt_col_category')}</th>
                <th scope="col">{t('score_receipt_col_value')}</th>
                <th scope="col">{t('score_receipt_col_weight')}</th>
                <th scope="col">{t('score_receipt_col_contribution')}</th>
              </tr>
            </thead>
            <tbody>
              {receipt.rows.map((row) => (
                <tr key={row.category}>
                  <th scope="row">{categoryLabel(t, row.category)}</th>
                  <td>{row.value != null ? `${formatScore(row.value, locale)}%` : t('missing_value')}</td>
                  <td>{row.contribution != null ? `${row.weight} / ${receipt.weightTotal}` : t('score_receipt_excluded')}</td>
                  <td>{row.contribution != null ? formatScore(row.contribution, locale) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{t('score_receipt_total_label')}</th>
                <td />
                <td />
                <td>
                  <b>{formatScore(receipt.overall, locale)}</b>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className={styles.note}>{t('score_receipt_formula_note')}</p>
        <p className={styles.disclaimer}>
          <b>{t('scoring_unverified_title')}</b>{' '}
          <Link to={{ pathname: '/scoring', search: location.search }}>{t('nav_scoring')} →</Link>
        </p>
      </details>
    </section>
  );
}
