import { useI18n } from '../../i18n';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onChange: (page: number) => void;
}

/**
 * Page controls for the table/card explorer — the one thing standing between "100 demo employees
 * today" and "500+ later" actually staying fast: only `pageSize` rows/cards are ever mounted at
 * once (see LeaderboardPage's pageRows), never the full filtered set.
 */
export function Pagination({ page, pageSize, totalItems, onChange }: PaginationProps) {
  const { t } = useI18n();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const startIdx = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, totalItems);

  return (
    <nav className={styles.pagination} aria-label={t('pagination_label')}>
      <p className={`${styles.range} tabular`}>{t('pagination_showing', { from: startIdx, to: endIdx, total: totalItems })}</p>
      <div className={styles.controls}>
        <button type="button" className="btn" onClick={() => onChange(page - 1)} disabled={page <= 1}>
          <span aria-hidden="true">←</span> {t('pagination_prev')}
        </button>
        <span className={`${styles.pageIndicator} tabular`}>{t('pagination_page_n', { page, total: totalPages })}</span>
        <button type="button" className="btn" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
          {t('pagination_next')} <span aria-hidden="true">→</span>
        </button>
      </div>
    </nav>
  );
}
