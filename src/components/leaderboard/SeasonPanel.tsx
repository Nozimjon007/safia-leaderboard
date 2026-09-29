import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { LeaderboardDataset, ScoringConfig } from '../../data/types';
import type { Season } from '../../lib/seasons';
import { seasonCountdown } from '../../lib/seasons';
import { buildLeaderboard } from '../../lib/scoring';
import { formatDateRange, weekIndexesInRange } from '../../lib/dates';
import { seasonCountdownText, seasonQuarterLabel, useI18n } from '../../i18n';
import { formatScore } from '../../lib/format';
import { Avatar } from '../common/Avatar';
import styles from './SeasonPanel.module.css';

interface SeasonPanelProps {
  dataset: LeaderboardDataset;
  config: ScoringConfig;
  season: Season;
  viewAsMemberId: string | null;
}

/** The season-first headline widget: name/dates, a live countdown (Asia/Tashkent), progress, current leader, and your own position. */
export function SeasonPanel({ dataset, config, season, viewAsMemberId }: SeasonPanelProps) {
  const { t, locale } = useI18n();
  const location = useLocation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const countdown = seasonCountdown(season, now);
  const weekIndexes = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, season.startISO, season.endISO);
  const result = buildLeaderboard({
    members: dataset.members,
    scores: dataset.scores,
    weekIndexes,
    weekCount: dataset.weekCount,
    metric: 'overall',
    config,
  });
  const leaderRow = result.rows.find((r) => r.rank === 1) ?? null;
  const myRow = viewAsMemberId ? (result.rows.find((r) => r.member.id === viewAsMemberId) ?? null) : null;

  const countdownText = seasonCountdownText(t, countdown);

  return (
    <section className={styles.panel} aria-labelledby="season-panel-heading">
      <div className={styles.top}>
        <div>
          <p className={styles.eyebrow}>{t('season_panel_title')}</p>
          <h2 id="season-panel-heading" className={styles.title}>
            {seasonQuarterLabel(t, season)}
          </h2>
          <p className={styles.range}>{formatDateRange(season.startISO, season.endISO, locale)}</p>
        </div>
        <div className={styles.countdown}>
          <span className={styles.countdownLabel}>{t('season_countdown_label')}</span>
          <span className={styles.countdownValue} data-complete={countdown.isComplete || undefined}>
            {countdownText}
          </span>
        </div>
      </div>

      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={t('season_progress_label')}
        aria-valuenow={Math.round(countdown.progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={styles.progressFill} style={{ width: `${Math.round(countdown.progress * 100)}%` }} />
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('season_leader_label')}</span>
          {leaderRow ? (
            <Link className={styles.leaderLink} to={{ pathname: `/member/${leaderRow.member.id}`, search: location.search }}>
              <Avatar id={leaderRow.member.id} name={leaderRow.member.name} photoUrl={leaderRow.member.avatarPhoto} size={26} />
              <span className={styles.leaderName}>{leaderRow.member.name}</span>
              <b className="tabular">{formatScore(leaderRow.current.overall, locale)}</b>
            </Link>
          ) : (
            <span className={styles.statValue}>{t('season_no_leader')}</span>
          )}
        </div>
        {viewAsMemberId && (
          <div className={styles.stat}>
            <span className={styles.statLabel}>{t('view_as_label')}</span>
            <span className={styles.statValue}>
              {myRow
                ? myRow.rank != null
                  ? `#${myRow.rank} · ${formatScore(myRow.current.overall, locale)}`
                  : t('progress_no_rank_yet')
                : '—'}
            </span>
          </div>
        )}
      </div>

      <p className={styles.assumption}>{t('season_panel_assumption')}</p>

      <div className={styles.links}>
        <Link to={{ pathname: '/seasons', search: location.search }}>{t('season_view_past')}</Link>
        <Link to={{ pathname: '/rewards', search: location.search }}>{t('season_view_rewards')}</Link>
      </div>
    </section>
  );
}
