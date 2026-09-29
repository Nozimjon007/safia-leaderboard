import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { seasonQuarterLabel, seasonCountdownText, seasonStartCountdownText, useI18n } from '../i18n';
import { useDatasetContext } from '../state/DatasetProvider';
import { useScoringConfig } from '../state/ScoringConfigProvider';
import { buildLeaderboard, type LeaderboardRow } from '../lib/scoring';
import { computeSeasonRewards } from '../lib/rewards';
import { seasonBounds, seasonCountdown, seasonStartCountdown, seasonStatus, type Season, type SeasonStatus } from '../lib/seasons';
import { formatDateRange, weekEndISO, weekIndexesInRange, weekStartISO } from '../lib/dates';
import { formatScore } from '../lib/format';
import { DemoBanner } from '../components/common/DemoBanner';
import { StateMessage } from '../components/common/StateMessage';
import { LeaderboardSkeleton } from '../components/leaderboard/LeaderboardSkeleton';
import { Avatar } from '../components/common/Avatar';
import { REWARD_GLYPHS } from '../components/member/RewardBadge';
import type { LeaderboardDataset, RewardId, ScoringConfig } from '../data/types';
import type { TranslationKey } from '../i18n/locales/en';
import styles from './SeasonsPage.module.css';

export function SeasonsPage() {
  const { t } = useI18n();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { status, dataset, error, reload } = useDatasetContext();
  const { config } = useScoringConfig();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const thisRealYear = new Date().getFullYear();
  const rawYear = Number(params.get('year'));
  const year = Number.isFinite(rawYear) && rawYear >= 2000 && rawYear <= 2100 ? rawYear : thisRealYear;

  function setYear(next: number) {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('year', String(next));
        return p;
      },
      { replace: true },
    );
  }

  if (status === 'error') {
    return (
      <>
        <DemoBanner />
        <StateMessage
          title={t('state_error_title')}
          role="alert"
          body={
            <>
              {t('state_error_body')}
              <br />
              <span className={styles.range}>{error}</span>
            </>
          }
          action={
            <button type="button" className="btn btnPrimary" onClick={reload}>
              {t('state_retry')}
            </button>
          }
        />
      </>
    );
  }

  if (status === 'loading' || !dataset) {
    return (
      <>
        <DemoBanner />
        <LeaderboardSkeleton />
      </>
    );
  }

  const quarters: Season[] = [1, 2, 3, 4].map((q) => {
    const bounds = seasonBounds(year, q as 1 | 2 | 3 | 4);
    return { id: `${year}-q${q}`, year, quarter: q as 1 | 2 | 3 | 4, ...bounds };
  });

  return (
    <>
      <DemoBanner />
      <div className={styles.crumbs}>
        <Link className={styles.backLink} to={{ pathname: '/', search: location.search }}>
          ← {t('back_to_leaderboard')}
        </Link>
      </div>
      <div className={styles.head}>
        <h1>{t('seasons_page_title')}</h1>
        <p className={styles.subtitle}>{t('seasons_page_subtitle')}</p>
      </div>

      <div className={styles.yearNav}>
        <button type="button" className="btn" aria-label={t('seasons_year_prev')} onClick={() => setYear(year - 1)}>
          ←
        </button>
        <span className={styles.yearLabel}>{year}</span>
        <button type="button" className="btn" aria-label={t('seasons_year_next')} onClick={() => setYear(year + 1)}>
          →
        </button>
        <Link className={styles.compareLink} to="/seasons/compare">
          {t('seasons_compare_title')} →
        </Link>
      </div>

      <div className={styles.list}>
        {quarters.map((season) => (
          <SeasonCard key={season.id} dataset={dataset} config={config} season={season} now={now} />
        ))}
      </div>
    </>
  );
}

interface SeasonCardProps {
  dataset: LeaderboardDataset;
  config: ScoringConfig;
  season: Season;
  now: number;
}

function SeasonCard({ dataset, config, season, now }: SeasonCardProps) {
  const { t, locale } = useI18n();
  const location = useLocation();
  const statusValue: SeasonStatus = seasonStatus(season, now);

  const weekIndexes = useMemo(
    () => (statusValue === 'upcoming' ? [] : weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, season.startISO, season.endISO)),
    [dataset, season, statusValue],
  );
  const result = useMemo(
    () =>
      buildLeaderboard({
        members: dataset.members,
        scores: dataset.scores,
        weekIndexes,
        weekCount: dataset.weekCount,
        metric: 'overall',
        config,
      }),
    [dataset, weekIndexes, config],
  );

  const rewardByMember = useMemo(() => {
    if (statusValue !== 'approved') return {} as Record<string, RewardId>;
    const map: Record<string, RewardId> = {};
    for (const r of computeSeasonRewards(dataset, config, season)) map[r.memberId] = r.rewardId;
    return map;
  }, [dataset, config, season, statusValue]);

  const top3 = result.rows.filter((r) => r.rank != null).slice(0, 3);
  const seasonSearch = weekIndexes.length
    ? `?from=${weekStartISO(dataset.firstWeekStart, weekIndexes[0])}&to=${weekEndISO(dataset.firstWeekStart, weekIndexes[weekIndexes.length - 1])}`
    : '';
  const detailHref = { pathname: `/seasons/${season.id}`, search: location.search };

  const standingsLabel =
    statusValue === 'approved'
      ? t('season_final_standings')
      : statusValue === 'awaiting_approval'
        ? t('season_awaiting_standings_label')
        : t('season_current_standings_label');

  return (
    <article className={styles.card} data-status={statusValue} aria-labelledby={`season-${season.id}`}>
      <div className={styles.cardHead}>
        <div>
          <Link className={styles.cardTitleLink} to={detailHref}>
            <h2 id={`season-${season.id}`}>{seasonQuarterLabel(t, season)}</h2>
          </Link>
          <p className={styles.range}>{formatDateRange(season.startISO, season.endISO, locale)}</p>
        </div>
        <span className={styles.statusTag} data-status={statusValue}>
          {statusValue === 'approved' && (
            <span aria-hidden="true" className={styles.statusTagGlyph}>
              ★{' '}
            </span>
          )}
          {statusValue === 'approved'
            ? t('season_complete_badge')
            : statusValue === 'awaiting_approval'
              ? t('season_awaiting_approval_badge')
              : statusValue === 'upcoming'
                ? t('season_upcoming_badge')
                : t('season_current_badge')}
        </span>
      </div>

      {statusValue === 'current' && (
        <>
          <div className={styles.progressTrack} role="progressbar" aria-valuenow={Math.round(seasonCountdown(season, now).progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className={styles.progressFill} style={{ width: `${Math.round(seasonCountdown(season, now).progress * 100)}%` }} />
          </div>
          <p className={styles.metaLine}>
            {t('season_countdown_label')}: {seasonCountdownText(t, seasonCountdown(season, now))}
          </p>
        </>
      )}

      {statusValue === 'awaiting_approval' && <p className={styles.notFinal}>{t('season_awaiting_approval_note')}</p>}

      {statusValue === 'upcoming' ? (
        <p className={styles.notFinal}>
          {t('season_upcoming_note')} {seasonStartCountdownText(t, seasonStartCountdown(season, now))}
        </p>
      ) : top3.length > 0 ? (
        <>
          <p className={styles.standingsLabel}>{standingsLabel}</p>
          <ol className={styles.standings}>
            {top3.map((row) => {
              const rewardId = rewardByMember[row.member.id];
              return (
                <li key={row.member.id} className={styles.standingRow}>
                  <span className={`${styles.rank} tabular`}>{row.rank}</span>
                  <Avatar id={row.member.id} name={row.member.name} photoUrl={row.member.avatarPhoto} size={30} />
                  <Link className={styles.memberLink} to={{ pathname: `/member/${row.member.id}`, search: seasonSearch }}>
                    {row.member.name}
                  </Link>
                  {rewardId && (
                    <span className={styles.rewardGlyph} title={t(`reward_${rewardId}_title` as TranslationKey)} aria-hidden="true">
                      {REWARD_GLYPHS[rewardId]}
                    </span>
                  )}
                  <span className={`${styles.score} tabular`}>{formatScore(row.current.overall, locale)}</span>
                </li>
              );
            })}
          </ol>

          <div className={styles.statsRow}>
            <div className={styles.statChip}>
              <span className={styles.statChipLabel}>{t('kpi_team_avg')}</span>
              <span className={`${styles.statChipValue} tabular`}>{formatScore(result.team.average, locale)}</span>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statChipLabel}>{t('season_eligible_count', { n: result.team.scoredCount })}</span>
            </div>
            {result.topImprovement && (
              <HighlightChip topImprovement={result.topImprovement} seasonSearch={seasonSearch} label={t('kpi_top_move')} />
            )}
          </div>
        </>
      ) : (
        <p className={styles.notFinal}>{t('season_no_leader')}</p>
      )}

      <div className={styles.actions}>
        <Link className={styles.viewLink} to={detailHref}>
          {t('season_view_details')} →
        </Link>
        {statusValue !== 'upcoming' && (
          <Link className={styles.viewLink} to={{ pathname: '/', search: seasonSearch }}>
            {t('view_season_leaderboard')}
          </Link>
        )}
      </div>
    </article>
  );
}

function HighlightChip({ topImprovement, seasonSearch, label }: { topImprovement: LeaderboardRow; seasonSearch: string; label: string }) {
  return (
    <Link className={styles.highlightChip} to={{ pathname: `/member/${topImprovement.member.id}`, search: seasonSearch }}>
      <span className={styles.statChipLabel}>{label}</span>
      <span className={styles.highlightValue}>
        <Avatar id={topImprovement.member.id} name={topImprovement.member.name} photoUrl={topImprovement.member.avatarPhoto} size={20} />
        {topImprovement.member.name} <b className="tabular">▲ {topImprovement.move}</b>
      </span>
    </Link>
  );
}
