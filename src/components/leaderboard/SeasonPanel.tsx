import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { LeaderboardDataset } from '../../data/types';
import type { LeaderboardResult } from '../../lib/scoring';
import type { LeaderboardFilters } from '../../hooks/useLeaderboardFilters';
import { seasonCountdown, seasonStatus, type Season, type SeasonStatus } from '../../lib/seasons';
import { formatDateRange } from '../../lib/dates';
import { seasonCountdownText, seasonQuarterLabel, useI18n } from '../../i18n';
import { formatScore } from '../../lib/format';
import { Avatar } from '../common/Avatar';
import styles from './SeasonPanel.module.css';

interface SeasonPanelProps {
  dataset: LeaderboardDataset;
  filters: LeaderboardFilters;
  /** The season containing the current filter range (see lib/seasons.ts's findContainingSeason), computed once by
   * the parent and shared with the top-five component so both agree on which season is being shown. */
  matchedSeason: Season | null;
  overallResult: LeaderboardResult;
  viewAsMemberId: string | null;
  onSetViewAs: (id: string) => void;
}

/**
 * The "Season Results" hero — the first thing a visitor sees. Reflects whichever season the current
 * filters fall inside (by containment, not exact match, so a Time Machine week or a preset like "last
 * 4 weeks" still headlines the right season), never just the real-world current one. Falls back to a
 * neutral custom-period treatment when the filters span something no single season contains.
 */
export function SeasonPanel({ dataset, filters, matchedSeason, overallResult, viewAsMemberId, onSetViewAs }: SeasonPanelProps) {
  const { t, locale } = useI18n();
  const location = useLocation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const status: SeasonStatus | null = matchedSeason ? seasonStatus(matchedSeason, now) : null;
  const countdown = matchedSeason ? seasonCountdown(matchedSeason, now) : null;
  const progressPct = countdown ? Math.round(countdown.progress * 100) : null;

  const headingKey =
    status === 'current'
      ? 'season_results_heading_current'
      : status === 'approved'
        ? 'season_results_heading_approved'
        : status === 'upcoming'
          ? 'season_results_heading_upcoming'
          : 'season_results_heading_awaiting';
  const heading = matchedSeason
    ? t(headingKey, { season: seasonQuarterLabel(t, matchedSeason) })
    : t('season_results_heading_custom', { range: formatDateRange(filters.fromISO, filters.toISO, locale) });

  const leaderRow = overallResult.rows.find((r) => r.overallRank === 1) ?? null;
  const myRow = viewAsMemberId ? (overallResult.rows.find((r) => r.member.id === viewAsMemberId) ?? null) : null;
  const rankedTotal = overallResult.rows.filter((r) => r.overallRank != null).length;

  return (
    <section className={styles.panel} data-status={status ?? 'custom'} aria-labelledby="season-panel-heading">
      <div className={styles.top}>
        <div>
          <p className={styles.eyebrow}>{t('season_results_eyebrow')}</p>
          <h1 id="season-panel-heading" className={styles.title}>
            {heading}
          </h1>
          {matchedSeason && <p className={styles.range}>{formatDateRange(matchedSeason.startISO, matchedSeason.endISO, locale)}</p>}
        </div>
        {status && (
          <span className={styles.statusBadge} data-status={status}>
            {status === 'current'
              ? t('season_live_badge')
              : status === 'approved'
                ? t('season_final_badge')
                : status === 'upcoming'
                  ? t('season_upcoming_badge')
                  : t('season_awaiting_approval_badge')}
          </span>
        )}
      </div>

      {status === 'current' && countdown && (
        <>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label={t('season_progress_label')}
            aria-valuenow={progressPct ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
          <div className={styles.countdownRow}>
            <span>
              {t('season_countdown_label')}: <b>{seasonCountdownText(t, countdown)}</b>
            </span>
            <span className={styles.progressText}>{t('season_progress_through', { pct: progressPct ?? 0 })}</span>
          </div>
        </>
      )}

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

        <div className={styles.stat}>
          <label className={styles.statLabel} htmlFor="view-as-select">
            {t('view_as_picker_label')}
          </label>
          <select
            id="view-as-select"
            className={styles.viewAsSelect}
            value={viewAsMemberId ?? ''}
            onChange={(e) => e.target.value && onSetViewAs(e.target.value)}
          >
            <option value="">{t('view_as_picker_none')}</option>
            {[...dataset.members]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
          {myRow && (
            <p className={styles.viewAsLine}>
              {myRow.overallRank != null
                ? t('view_as_position_line', { name: myRow.member.name, rank: myRow.overallRank, total: rankedTotal })
                : t('progress_no_rank_yet')}
            </p>
          )}
        </div>
      </div>

      <p className={styles.assumption}>{t('season_panel_assumption')}</p>

      <div className={styles.links}>
        <Link to={{ pathname: '/seasons', search: location.search }}>{t('season_view_past')}</Link>
        <Link to={{ pathname: '/rewards', search: location.search }}>{t('season_view_rewards')}</Link>
      </div>
    </section>
  );
}
