import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n, seasonQuarterLabel } from '../i18n';
import { useDatasetContext } from '../state/DatasetProvider';
import { useSeasons } from '../hooks/useSeasons';
import { useScoringConfig } from '../state/ScoringConfigProvider';
import { buildLeaderboard } from '../lib/scoring';
import { isSeasonComplete, type Season } from '../lib/seasons';
import { formatDateRange, weekEndISO, weekIndexesInRange, weekStartISO } from '../lib/dates';
import { formatScore } from '../lib/format';
import { DemoBanner } from '../components/common/DemoBanner';
import { StateMessage } from '../components/common/StateMessage';
import { LeaderboardSkeleton } from '../components/leaderboard/LeaderboardSkeleton';
import { Avatar } from '../components/common/Avatar';
import type { LeaderboardDataset, ScoringConfig } from '../data/types';
import styles from './SeasonsPage.module.css';

export function SeasonsPage() {
  const { t } = useI18n();
  const location = useLocation();
  const { status, dataset, error, reload } = useDatasetContext();
  const { config } = useScoringConfig();
  const seasonsInfo = useSeasons(dataset);

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

  if (status === 'loading' || !dataset || !seasonsInfo) {
    return (
      <>
        <DemoBanner />
        <LeaderboardSkeleton />
      </>
    );
  }

  const newestFirst = [...seasonsInfo.seasons].reverse();

  return (
    <>
      <DemoBanner />
      <div className={styles.crumbs}>
        <Link className={styles.backLink} to={{ pathname: '/', search: location.search }}>
          ← {t('back_to_leaderboard')}
        </Link>
      </div>
      <div className={styles.head}>
        <h1>{t('seasons_archive_title')}</h1>
        <p className={styles.subtitle}>{t('seasons_archive_subtitle')}</p>
      </div>

      <div className={styles.list}>
        {newestFirst.map((season) => (
          <SeasonCard key={season.id} dataset={dataset} config={config} season={season} />
        ))}
      </div>
    </>
  );
}

interface SeasonCardProps {
  dataset: LeaderboardDataset;
  config: ScoringConfig;
  season: Season;
}

function SeasonCard({ dataset, config, season }: SeasonCardProps) {
  const { t, locale } = useI18n();

  const weekIndexes = useMemo(
    () => weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, season.startISO, season.endISO),
    [dataset, season],
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

  const complete = isSeasonComplete(season);
  const top5 = result.rows.filter((r) => r.rank != null).slice(0, 5);
  const seasonSearch = weekIndexes.length
    ? `?from=${weekStartISO(dataset.firstWeekStart, weekIndexes[0])}&to=${weekEndISO(dataset.firstWeekStart, weekIndexes[weekIndexes.length - 1])}`
    : '';

  return (
    <section className={styles.card} aria-labelledby={`season-${season.id}`}>
      <div className={styles.cardHead}>
        <div>
          <h2 id={`season-${season.id}`}>{seasonQuarterLabel(t, season)}</h2>
          <p className={styles.range}>{formatDateRange(season.startISO, season.endISO, locale)}</p>
        </div>
        <span className={styles.statusTag} data-complete={complete || undefined}>
          {complete ? t('season_complete_badge') : t('season_current_badge')}
        </span>
      </div>

      {!complete && <p className={styles.notFinal}>{t('season_not_final_note')}</p>}

      {top5.length > 0 ? (
        <>
          <p className={styles.standingsLabel}>{t('season_final_standings')}</p>
          <ol className={styles.standings}>
            {top5.map((row) => (
              <li key={row.member.id} className={styles.standingRow}>
                <span className={`${styles.rank} tabular`}>{row.rank}</span>
                <Avatar id={row.member.id} name={row.member.name} photoUrl={row.member.avatarPhoto} size={30} />
                <Link className={styles.memberLink} to={{ pathname: `/member/${row.member.id}`, search: seasonSearch }}>
                  {row.member.name}
                </Link>
                <span className={`${styles.score} tabular`}>{formatScore(row.current.overall, locale)}</span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className={styles.notFinal}>{t('season_no_leader')}</p>
      )}

      <Link className={styles.viewLink} to={{ pathname: '/', search: seasonSearch }}>
        {t('view_season_leaderboard')}
      </Link>
    </section>
  );
}
