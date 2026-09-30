import { Link, useLocation } from 'react-router-dom';
import { categoryLabel, craftPathLabel, useI18n } from '../../i18n';
import type { LeaderboardRow, TeamStats } from '../../lib/scoring';
import { strengthsAndWeaknesses } from '../../lib/scoring';
import { formatPercent } from '../../lib/format';
import { CATEGORY_KEYS, type CategoryKey } from '../../data/types';
import type { CraftPreview } from '../../lib/craftPaths';
import { RadarChart } from '../charts/RadarChart';
import { StrengthsList } from './StrengthsList';
import styles from './RowExpandPanel.module.css';

export function RowExpandPanel({ row, team, craftPreview }: { row: LeaderboardRow; team: TeamStats; craftPreview?: CraftPreview | null }) {
  const { t } = useI18n();
  const location = useLocation();
  const { strengths, weaknesses } = strengthsAndWeaknesses(row.current.categories, team.categoryAverages);
  const categoryLabels = Object.fromEntries(CATEGORY_KEYS.map((c) => [c, categoryLabel(t, c)])) as Record<CategoryKey, string>;

  return (
    <div className={styles.wrap}>
      {craftPreview && (
        <p className={styles.craftPreview}>
          <span aria-hidden="true">{'★'.repeat(craftPreview.stars)}{'☆'.repeat(craftPreview.possible - craftPreview.stars)}</span>{' '}
          {craftPathLabel(t, craftPreview.role)} · {t('craft_stars_of', { earned: craftPreview.stars, possible: craftPreview.possible })}
        </p>
      )}
      <div className={styles.expand}>
        <RadarChart
          seriesA={{ values: row.current.categories, label: row.member.name, color: 'var(--accent)' }}
          seriesB={{ values: team.categoryAverages, label: t('team_short'), color: 'var(--ink-secondary)', dashed: true }}
          categoryLabels={categoryLabels}
          ariaLabel={t('radar_title')}
          missingValueLabel={t('missing_value')}
          formatValue={formatPercent}
        />
        <div>
          <StrengthsList strengths={strengths} weaknesses={weaknesses} compact />
          <p className={styles.openWrap}>
            <Link className="btn btnPrimary" to={{ pathname: `/member/${row.member.id}`, search: location.search }}>
              {t('open_profile')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
