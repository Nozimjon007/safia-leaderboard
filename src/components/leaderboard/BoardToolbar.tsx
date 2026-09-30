import { CATEGORY_KEYS, type MetricKey, type SortKey } from '../../data/types';
import { categoryLabel, useI18n } from '../../i18n';
import type { LeaderboardFilters } from '../../hooks/useLeaderboardFilters';
import styles from './BoardToolbar.module.css';

interface BoardToolbarProps {
  filters: LeaderboardFilters;
  onChange: (patch: Partial<Record<keyof LeaderboardFilters, string>>) => void;
  shownCount: number;
  totalCount: number;
  heading: string;
  /** Whether a viewer has actually been selected (see the Season Results hero's "View progress as"
   * picker) — "Find my position" has no "me" to find otherwise, so it's disabled rather than hidden,
   * consistent with the rest of the app never showing a control that can't do anything. */
  canFindMe: boolean;
  onFindMe: () => void;
}

const METRICS: MetricKey[] = ['overall', ...CATEGORY_KEYS];
const SORT_KEYS: SortKey[] = ['rank', 'name', 'overall', 'move', ...CATEGORY_KEYS];

export function BoardToolbar({ filters, onChange, shownCount, totalCount, heading, canFindMe, onFindMe }: BoardToolbarProps) {
  const { t } = useI18n();

  function sortLabel(key: SortKey): string {
    switch (key) {
      case 'rank':
        return t('sort_rank');
      case 'name':
        return t('sort_name');
      case 'overall':
        return t('sort_overall');
      case 'move':
        return t('sort_move');
      default:
        return categoryLabel(t, key);
    }
  }

  return (
    <div className={styles.header}>
      <div>
        <h2 className={styles.heading}>{heading}</h2>
        <p className={`${styles.sub} tabular`}>
          {shownCount} / {totalCount}
        </p>
      </div>
      <div className={styles.tools}>
        <button type="button" className="btn" onClick={onFindMe} disabled={!canFindMe} title={!canFindMe ? t('view_as_picker_none') : undefined}>
          <span aria-hidden="true">◎</span> {t('find_me')}
        </button>

        <div className={styles.field}>
          <span className="fieldLabel" id="metric-label">
            {t('metric_label')}
          </span>
          <div className="segment" role="group" aria-labelledby="metric-label">
            {METRICS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={filters.metric === m}
                onClick={() => onChange({ metric: m, ...(filters.sortKey === 'rank' ? { sortDir: 'asc' } : {}) })}
              >
                {m === 'overall' ? t('metric_overall') : categoryLabel(t, m)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className="fieldLabel" htmlFor="sort-select">
            {t('sort_label')}
          </label>
          <select
            id="sort-select"
            className="select"
            value={`${filters.sortKey}:${filters.sortDir}`}
            onChange={(e) => {
              const [key, dir] = e.target.value.split(':');
              onChange({ sortKey: key, sortDir: dir });
            }}
          >
            {SORT_KEYS.flatMap((k) =>
              (['asc', 'desc'] as const).map((dir) => (
                <option key={`${k}:${dir}`} value={`${k}:${dir}`}>
                  {sortLabel(k)} ({dir === 'asc' ? t('sort_asc') : t('sort_desc')})
                </option>
              )),
            )}
          </select>
        </div>

        <div className={styles.field}>
          <span className="fieldLabel" id="view-label">
            {t('view_label')}
          </span>
          <div className="segment" role="group" aria-labelledby="view-label">
            <button type="button" aria-pressed={filters.view === 'table'} onClick={() => onChange({ view: 'table' })}>
              {t('view_table')}
            </button>
            <button type="button" aria-pressed={filters.view === 'cards'} onClick={() => onChange({ view: 'cards' })}>
              {t('view_cards')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
