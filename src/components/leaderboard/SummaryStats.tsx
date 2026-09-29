import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useScoringConfig } from '../../state/ScoringConfigProvider';
import type { LeaderboardRow, TeamStats } from '../../lib/scoring';
import { formatScore, formatSigned } from '../../lib/format';
import { StatTile } from '../charts/StatTile';
import styles from './SummaryStats.module.css';

interface SummaryStatsProps {
  team: TeamStats;
  topImprovement: LeaderboardRow | null;
  weekCount: number;
  hasPreviousPeriod: boolean;
}

export function SummaryStats({ team, topImprovement, weekCount, hasPreviousPeriod }: SummaryStatsProps) {
  const { t, locale } = useI18n();
  const { config } = useScoringConfig();
  const location = useLocation();

  const delta = hasPreviousPeriod && team.average != null && team.previousAverage != null ? team.average - team.previousAverage : null;

  return (
    <section className={styles.grid} aria-label={t('kpi_team_avg')}>
      <StatTile
        label={t('kpi_team_avg')}
        value={
          <>
            {formatScore(team.average, locale)} <small className={styles.unit}>/100</small>
          </>
        }
        delta={
          !hasPreviousPeriod || delta == null ? (
            <span>{t('kpi_vs_prev_na')}</span>
          ) : (
            <span className={styles.deltaTag} data-dir={delta > 0 ? 'up' : delta < 0 ? 'down' : 'same'}>
              <span aria-hidden="true">{delta > 0 ? '▲' : delta < 0 ? '▼' : '＝'}</span>
              {t('kpi_vs_prev', { delta: formatSigned(delta, locale), n: weekCount })}
            </span>
          )
        }
        description={t('kpi_team_avg_desc', { n: team.scoredCount })}
      />
      <StatTile
        label={t('kpi_green')}
        value={
          <span className={styles.goodValue}>
            {team.greenCount} <small className={styles.unit}>/ {team.scoredCount}</small>
          </span>
        }
        description={t('kpi_green_desc', { threshold: config.greenThreshold })}
      />
      <StatTile
        label={t('kpi_attention')}
        value={
          <span className={styles.criticalValue}>
            {team.attentionCount} <small className={styles.unit}>/ {team.scoredCount}</small>
          </span>
        }
        description={t('kpi_attention_desc', { threshold: config.attentionThreshold })}
      />
      <StatTile
        label={t('kpi_top_move')}
        value={
          topImprovement ? (
            <span className={styles.goodValue}>
              <span aria-hidden="true">▲</span> {topImprovement.move} <small className={styles.unit}>{t('rank_label')}</small>
            </span>
          ) : (
            '—'
          )
        }
        delta={
          topImprovement ? (
            <Link
              to={{ pathname: `/member/${topImprovement.member.id}`, search: location.search }}
              className={styles.memberLink}
            >
              {topImprovement.member.name}
            </Link>
          ) : (
            <span>{hasPreviousPeriod ? t('kpi_top_move_none') : t('kpi_vs_prev_na')}</span>
          )
        }
        description={t('kpi_top_move_desc')}
      />
    </section>
  );
}
