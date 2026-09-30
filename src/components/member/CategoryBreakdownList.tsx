import { CATEGORY_KEYS, type CategoryKey } from '../../data/types';
import { categoryLabel, useI18n } from '../../i18n';
import { zoneOf, type PeriodStats, type TeamStats } from '../../lib/scoring';
import { formatPercent, formatSigned } from '../../lib/format';
import { useScoringConfig } from '../../state/ScoringConfigProvider';
import { Meter } from '../charts/Meter';
import { ZoneBadge } from '../common/ZoneBadge';
import styles from './CategoryBreakdownList.module.css';

interface CategoryBreakdownListProps {
  current: PeriodStats;
  previous: PeriodStats | null;
  team: TeamStats;
  ranksByCategory: Record<CategoryKey, Map<string, number>>;
  memberId: string;
  rankedCountFor: (c: CategoryKey) => number;
}

export function CategoryBreakdownList({
  current,
  previous,
  team,
  ranksByCategory,
  memberId,
  rankedCountFor,
}: CategoryBreakdownListProps) {
  const { t, locale } = useI18n();
  const { config } = useScoringConfig();

  return (
    <ul className={styles.list}>
      {CATEGORY_KEYS.map((c) => {
        const v = current.categories[c];
        const zone = zoneOf(v, config);
        const teamVal = team.categoryAverages[c];
        const prevVal = previous ? previous.categories[c] : null;
        const gapTeam = v != null && teamVal != null ? v - teamVal : null;
        const gapPrev = v != null && prevVal != null ? v - prevVal : null;
        const catRank = ranksByCategory[c].get(memberId);
        return (
          <li key={c} className={styles.item}>
            <span className={styles.name}>{categoryLabel(t, c)}</span>
            <span className={`${styles.value} tabular`}>{v == null ? '-' : formatPercent(v)}</span>
            <div className={styles.barWrap}>
              <Meter value={v} zone={zone} markerValue={teamVal} />
            </div>
            <div className={styles.meta}>
              <span>{v == null ? t('missing_value') : <ZoneBadge zone={zone} />}</span>
              <span>
                {t('vs_team')}:{' '}
                <span className={gapTeam != null && gapTeam > 0 ? styles.pos : gapTeam != null && gapTeam < 0 ? styles.neg : undefined}>
                  {formatSigned(gapTeam, locale)}
                </span>
              </span>
              <span>
                {t('vs_previous')}:{' '}
                <span className={gapPrev != null && gapPrev > 0 ? styles.pos : gapPrev != null && gapPrev < 0 ? styles.neg : undefined}>
                  {formatSigned(gapPrev, locale)}
                </span>
              </span>
              <span>
                {t('category_rank')}: {catRank ?? '-'}
                {catRank ? ` / ${rankedCountFor(c)}` : ''}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
