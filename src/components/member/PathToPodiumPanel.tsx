import type { CategoryGap } from '../../lib/scoring';
import type { MemberWeekChange } from '../../lib/timeMachine';
import { categoryLabel, useI18n } from '../../i18n';
import { formatScore, formatSigned } from '../../lib/format';
import { MoveBadge } from '../common/MoveBadge';
import styles from './PathToPodiumPanel.module.css';

interface PathToPodiumPanelProps {
  rank: number | null;
  gapToNext: number | null;
  gapToLeader: number | null;
  strongest: CategoryGap | null;
  /** This member's own Time Machine week-over-week change, when the Time Machine is open. */
  weekChange: MemberWeekChange | null;
  locale: string;
}

/**
 * Factual "where do I stand" summary — gaps are current-state facts, never a
 * projection of what a category change would do to the overall score, since
 * the real category weights aren't verified (see /scoring).
 */
export function PathToPodiumPanel({ rank, gapToNext, gapToLeader, strongest, weekChange, locale }: PathToPodiumPanelProps) {
  const { t } = useI18n();

  return (
    <section className={styles.panel} aria-labelledby="path-to-podium-heading">
      <h2 id="path-to-podium-heading">{t('path_to_podium_title')}</h2>
      <p className={styles.sub}>{t('path_to_podium_subtitle')}</p>

      <div className={styles.grid}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('path_to_podium_gap_next_label')}</span>
          <span className={styles.statValue}>
            {rank === 1
              ? t('progress_already_first')
              : rank == null
                ? t('progress_no_rank_yet')
                : gapToNext != null
                  ? t('progress_distance_to_next', { n: formatScore(gapToNext, locale), rank: rank - 1 })
                  : '-'}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('path_to_podium_gap_leader_label')}</span>
          <span className={styles.statValue}>
            {rank === 1
              ? t('progress_already_first')
              : rank == null
                ? t('progress_no_rank_yet')
                : gapToLeader != null
                  ? t('path_to_podium_gap_leader_value', { n: formatScore(gapToLeader, locale) })
                  : '-'}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('path_to_podium_strongest_label')}</span>
          <span className={styles.statValue}>
            {strongest ? t('highlight_strong', { category: categoryLabel(t, strongest.category), value: Math.round(strongest.value) }) : '-'}
          </span>
        </div>
      </div>

      {weekChange && (
        <div className={styles.sinceRow}>
          <span className={styles.statLabel}>{t('path_to_podium_since_snapshot_label')}</span>
          {weekChange.rank != null && weekChange.previousRank != null ? (
            <span className={styles.sinceValue}>
              <MoveBadge move={weekChange.rankMove} /> {t('path_to_podium_rank_change', { from: weekChange.previousRank, to: weekChange.rank })}
              {weekChange.overall != null && weekChange.previousOverall != null && (
                <span className={styles.sinceDelta}> · {formatSigned(weekChange.overall - weekChange.previousOverall, locale)}</span>
              )}
            </span>
          ) : (
            <span className={styles.sinceValue}>{t('path_to_podium_no_prior_snapshot')}</span>
          )}
        </div>
      )}
    </section>
  );
}
