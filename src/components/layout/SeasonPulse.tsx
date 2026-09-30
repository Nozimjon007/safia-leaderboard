import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useDatasetContext } from '../../state/DatasetProvider';
import { useScoringConfig } from '../../state/ScoringConfigProvider';
import { useSeasons } from '../../hooks/useSeasons';
import { useClanAssignments } from '../../hooks/useClans';
import { useCoinLedger } from '../../hooks/useCoinLedger';
import { useViewAsMemberId } from '../../hooks/useViewAsMember';
import { seasonCountdown, seasonStatus, seasonWeekRange } from '../../lib/seasons';
import { buildLeaderboard } from '../../lib/scoring';
import { weekIndexesInRange } from '../../lib/dates';
import { computeClanStandings } from '../../lib/clanPoints';
import { CLAN_IDS } from '../../lib/clans';
import { balanceForMember } from '../../lib/coins';
import { clanName, seasonCountdownText, seasonQuarterLabel, useI18n } from '../../i18n';
import styles from './SeasonPulse.module.css';

/**
 * A compact, always-there nav summary of "where things stand right now" — the active season's
 * deadline, plus the viewed leader's solo rank, clan position, and coin balance. Always the real
 * current season's own default (week-snapped) range, independent of whatever period/filters the
 * page underneath happens to be showing, same convention as the Craft Path preview on the
 * leaderboard. Reads the same "view as" demo picker every other page uses (see useViewAsMemberId),
 * kept in sync across pages via that hook's same-tab change event.
 */
export function SeasonPulse() {
  const { t, locale } = useI18n();
  const location = useLocation();
  const { dataset } = useDatasetContext();
  const { config } = useScoringConfig();
  const seasonsInfo = useSeasons(dataset);
  const clanAssignments = useClanAssignments(dataset);
  const coinLedger = useCoinLedger();
  const [viewAsMemberId] = useViewAsMemberId(null);
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const season = seasonsInfo?.currentSeason ?? null;
  const status = season ? seasonStatus(season) : null;
  const countdown = season ? seasonCountdown(season) : null;
  const member = dataset && viewAsMemberId ? (dataset.members.find((m) => m.id === viewAsMemberId) ?? null) : null;

  const soloStanding = useMemo(() => {
    if (!dataset || !season || !member) return null;
    const range = seasonWeekRange(dataset, season);
    if (!range) return null;
    const weekIndexes = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, range.from, range.to);
    const result = buildLeaderboard({ members: dataset.members, scores: dataset.scores, weekIndexes, weekCount: dataset.weekCount, metric: 'overall', config });
    const row = result.rows.find((r) => r.member.id === member.id);
    if (!row) return null;
    const total = result.rows.filter((r) => r.overallRank != null).length;
    return { rank: row.overallRank, total };
  }, [dataset, season, member, config]);

  const clanId = member ? (clanAssignments[member.id] ?? null) : null;
  const clanStanding = useMemo(() => {
    if (!dataset || !season || !seasonsInfo || !clanId) return null;
    const idx = seasonsInfo.seasons.findIndex((s) => s.id === season.id);
    const previous = idx > 0 ? seasonsInfo.seasons[idx - 1] : null;
    const standings = computeClanStandings(dataset, config, clanAssignments, CLAN_IDS, season, previous);
    return standings.find((s) => s.clanId === clanId) ?? null;
  }, [dataset, season, seasonsInfo, clanId, clanAssignments, config]);

  const coinsBalance = member ? balanceForMember(coinLedger.transactions, member.id) : null;

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!season || !countdown) return null;

  const teaser = countdown.isComplete ? t('season_pulse_wrapping_up') : t('season_pulse_days_left', { n: countdown.days });

  return (
    <div className={styles.wrap} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true" className={styles.glyph}>
          ◈
        </span>
        <span className={styles.teaser}>{teaser}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            className={styles.panel}
            role="dialog"
            aria-label={t('season_pulse_title')}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0.001 : 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.panelHead}>
              <span className={styles.panelSeason}>{seasonQuarterLabel(t, season)}</span>
              <span className={styles.panelStatus} data-status={status ?? undefined}>
                {status === 'current'
                  ? t('season_live_badge')
                  : status === 'approved'
                    ? t('season_final_badge')
                    : status === 'upcoming'
                      ? t('season_upcoming_badge')
                      : t('season_awaiting_approval_badge')}
              </span>
            </div>
            <p className={styles.panelCountdown}>{seasonCountdownText(t, countdown)}</p>

            {member ? (
              <dl className={styles.stats}>
                <div>
                  <dt>{t('season_pulse_solo_rank')}</dt>
                  <dd>
                    {soloStanding?.rank != null ? t('season_pulse_rank_of', { rank: soloStanding.rank, total: soloStanding.total }) : t('progress_no_rank_yet')}
                  </dd>
                </div>
                <div>
                  <dt>{t('season_pulse_clan_position')}</dt>
                  <dd>{clanStanding ? `${clanName(t, clanStanding.clanId)} · ${t('rank_label')} #${clanStanding.rank}` : t('season_pulse_no_clan')}</dd>
                </div>
                <div>
                  <dt>{t('coins_balance_label')}</dt>
                  <dd className="tabular">{(coinsBalance ?? 0).toLocaleString(locale)}</dd>
                </div>
              </dl>
            ) : (
              <p className={styles.pickNote}>{t('season_pulse_pick_note')}</p>
            )}

            <div className={styles.panelLinks}>
              <Link to={{ pathname: '/', search: location.search }}>{t('nav_leaderboard')} →</Link>
              <Link to="/shop">{t('shop_explore_action')} →</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
