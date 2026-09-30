import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import type { LeaderboardDataset } from '../../data/types';
import type { LeaderboardResult } from '../../lib/scoring';
import type { LeaderboardFilters } from '../../hooks/useLeaderboardFilters';
import { seasonCountdown, seasonStatus, seasonWeekRange, type Season, type SeasonStatus } from '../../lib/seasons';
import { formatDateRange } from '../../lib/dates';
import { seasonCountdownText, seasonQuarterLabel, useI18n } from '../../i18n';
import { formatScore } from '../../lib/format';
import { Avatar } from '../common/Avatar';
import { StatTile } from '../charts/StatTile';
import styles from './SeasonPanel.module.css';

interface SeasonPanelProps {
  dataset: LeaderboardDataset;
  filters: LeaderboardFilters;
  /** The season containing the current filter range (see lib/seasons.ts's findContainingSeason), computed once by
   * the parent and shared with the top-five component so both agree on which season is being shown. */
  matchedSeason: Season | null;
  /** Every season the dataset covers — powers the visible season selector, oldest first. */
  seasons: readonly Season[];
  /** True once the viewer has explicitly chosen a period narrower than the season's own default
   * (an explicit date pick, or Time Machine) — see LeaderboardPage's isCustomPeriod. Forces the
   * "custom period" framing even when matchedSeason still technically contains the range, so this
   * heading never claims to be showing full season results when it isn't. */
  isCustomPeriod: boolean;
  overallResult: LeaderboardResult;
  viewAsMemberId: string | null;
  onSetViewAs: (id: string) => void;
  /** Jumps to another season's own default (week-snapped) period — the banner's season selector. */
  onSelectSeason: (season: Season) => void;
  /** The view-as member's current Safia Coins balance — null with no viewer selected. A dedicated
   * stat right in the hero, since coins are otherwise easy to miss (see Task: make the shop
   * impossible to miss). */
  coinsBalance: number | null;
  /** True only during a genuine reveal moment (first-ever view of this season, or an explicit
   * replay) — see useSeasonReveal. The status badge gets a brief entrance; everywhere else it just
   * appears in its resting state. */
  shouldAnimateReveal: boolean;
  /** Changes exactly when a fresh play should start — used as the `key` on the badge so Motion
   * remounts it and its entrance transition actually runs again on replay. */
  playKey: string;
  onReplayReveal: () => void;
}

/**
 * The Safia League season banner — deliberately compact (a single, unmistakable strip, not a tall
 * block) so the top-five showcase right below it is what a visitor actually scrolls to first.
 * Reflects whichever season the current filters fall inside (by containment, not exact match, so a
 * Time Machine week or a preset like "last 4 weeks" still headlines the right season), never just
 * the real-world current one. Falls back to a neutral custom-period treatment when the filters span
 * something no single season contains.
 */
export function SeasonPanel({
  dataset,
  filters,
  matchedSeason,
  seasons,
  isCustomPeriod,
  overallResult,
  viewAsMemberId,
  onSetViewAs,
  onSelectSeason,
  coinsBalance,
  shouldAnimateReveal,
  playKey,
  onReplayReveal,
}: SeasonPanelProps) {
  const { t, locale } = useI18n();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const playEntrance = shouldAnimateReveal && !reduceMotion;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const status: SeasonStatus | null = matchedSeason ? seasonStatus(matchedSeason, now) : null;
  const countdown = matchedSeason ? seasonCountdown(matchedSeason, now) : null;
  // Floor, and only ever show 100 once the season has actually closed — rounding 99.6% up to "100%"
  // while the countdown still reads e.g. "0d 3h" would flatly contradict the time remaining.
  const progressPct = countdown ? (countdown.isComplete ? 100 : Math.min(99, Math.floor(countdown.progress * 100))) : null;

  const headingKey =
    status === 'current'
      ? 'season_results_heading_current'
      : status === 'approved'
        ? 'season_results_heading_approved'
        : status === 'upcoming'
          ? 'season_results_heading_upcoming'
          : 'season_results_heading_awaiting';
  const showsFullSeason = matchedSeason != null && !isCustomPeriod;
  const heading = showsFullSeason
    ? t(headingKey, { season: seasonQuarterLabel(t, matchedSeason) })
    : t('season_results_heading_custom', { range: formatDateRange(filters.fromISO, filters.toISO, locale) });

  const leaderRow = overallResult.rows.find((r) => r.overallRank === 1) ?? null;
  const myRow = viewAsMemberId ? (overallResult.rows.find((r) => r.member.id === viewAsMemberId) ?? null) : null;
  const rankedTotal = overallResult.rows.filter((r) => r.overallRank != null).length;

  function handleSelectSeason(seasonId: string) {
    const season = seasons.find((s) => s.id === seasonId);
    if (season) onSelectSeason(season);
  }

  return (
    <section className={styles.panel} data-status={status ?? 'custom'} aria-labelledby="season-panel-heading">
      <p className={styles.brandKicker}>{t('safia_league_kicker')}</p>

      <div className={styles.top}>
        <div className={styles.headWrap}>
          <h1 id="season-panel-heading" className={styles.title}>
            {heading}
          </h1>
          <label className={styles.seasonSelectWrap}>
            <span className="visually-hidden">{t('season_selector_hero_label')}</span>
            <select
              className={styles.seasonSelect}
              value={matchedSeason?.id ?? ''}
              onChange={(e) => handleSelectSeason(e.target.value)}
            >
              {!matchedSeason && <option value="">{t('season_selector_custom_option')}</option>}
              {[...seasons].reverse().map((s) => (
                <option key={s.id} value={s.id}>
                  {seasonQuarterLabel(t, s)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {status && (
          <div className={styles.statusWrap}>
            <motion.span
              key={playKey}
              className={styles.statusBadge}
              data-status={status}
              initial={playEntrance ? { opacity: 0, scale: 0.85, y: -6 } : false}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={playEntrance ? { duration: 0.35, ease: 'easeOut' } : { duration: 0 }}
            >
              {status === 'current'
                ? t('season_live_badge')
                : status === 'approved'
                  ? t('season_final_badge')
                  : status === 'upcoming'
                    ? t('season_upcoming_badge')
                    : t('season_awaiting_approval_badge')}
            </motion.span>
            <button type="button" className={styles.replayBtn} onClick={onReplayReveal}>
              <span aria-hidden="true">↻</span> {t('season_replay_reveal')}
            </button>
          </div>
        )}
      </div>

      <div className={styles.metaRow}>
        <span className={styles.range}>{formatDateRange(matchedSeason?.startISO ?? filters.fromISO, matchedSeason?.endISO ?? filters.toISO, locale)}</span>

        {status === 'current' && countdown && (
          <span className={styles.countdownInline}>
            <span
              className={styles.progressTrack}
              role="progressbar"
              aria-label={t('season_progress_label')}
              aria-valuenow={progressPct ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </span>
            <b className="tabular">{seasonCountdownText(t, countdown)}</b>
            <span className={styles.progressText}>{t('season_progress_through', { pct: progressPct ?? 0 })}</span>
          </span>
        )}
      </div>

      <div className={styles.stats}>
        <StatTile
          compact
          label={t('season_leader_label')}
          value={
            leaderRow ? (
              <Link className={styles.leaderLink} to={{ pathname: `/member/${leaderRow.member.id}`, search: location.search }}>
                <Avatar id={leaderRow.member.id} name={leaderRow.member.name} photoUrl={leaderRow.member.avatarPhoto} size={22} />
                <span className={styles.leaderName}>{leaderRow.member.name}</span>
                <b className="tabular">{formatScore(leaderRow.current.overall, locale)}</b>
              </Link>
            ) : (
              t('season_no_leader')
            )
          }
        />

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

        <StatTile
          compact
          label={t('coins_balance_label')}
          value={
            <Link className={styles.coinsLink} to="/shop">
              <span aria-hidden="true">◈</span>{' '}
              {coinsBalance != null ? (
                <>
                  {coinsBalance.toLocaleString(locale)} <small>{t('coins_balance_unit')}</small>
                </>
              ) : (
                t('shop_explore_action')
              )}
            </Link>
          }
        />
      </div>

      <div className={styles.links}>
        <Link to={{ pathname: '/seasons', search: location.search }}>{t('season_view_past')}</Link>
        <Link to={{ pathname: '/rewards', search: location.search }}>{t('season_view_rewards')}</Link>
        <Link to="/shop">{t('shop_explore_action')} →</Link>
        <details className={styles.moreWrap}>
          <summary>{t('season_panel_more')}</summary>
          <p className={styles.assumption}>{t('season_panel_assumption')}</p>
        </details>
      </div>
    </section>
  );
}

/** Exported so LeaderboardPage's season-selector handler can compute the exact snapped range for
 * whichever season the visitor picks, without duplicating the week-snap math here. */
export function seasonDefaultRange(dataset: LeaderboardDataset, season: Season): { from: string; to: string } | null {
  return seasonWeekRange(dataset, season);
}
