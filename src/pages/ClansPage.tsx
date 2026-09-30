import { useMemo } from 'react';
import { useI18n } from '../i18n';
import { useDatasetContext } from '../state/DatasetProvider';
import { useScoringConfig } from '../state/ScoringConfigProvider';
import { useSeasons } from '../hooks/useSeasons';
import { useClanAssignments } from '../hooks/useClans';
import { CLAN_IDS } from '../lib/clans';
import { computeClanStandings } from '../lib/clanPoints';
import { DemoBanner } from '../components/common/DemoBanner';
import { StateMessage } from '../components/common/StateMessage';
import { LeaderboardSkeleton } from '../components/leaderboard/LeaderboardSkeleton';
import { ClanStandingsPanel } from '../components/leaderboard/ClanStandingsPanel';
import styles from './ClansPage.module.css';

/**
 * "Clans" as its own primary destination, distinct from the leaderboard's board-mode toggle (still
 * there for a quick glance mid-scroll) and from a season's own historical standings tab (see
 * SeasonDetailPage's Standings tab). This page always shows the *current* season, the same way the
 * Leaderboard's own default view does — "who's winning right now," not a period picker.
 */
export function ClansPage() {
  const { t } = useI18n();
  const { status, dataset, error, reload } = useDatasetContext();
  const { config } = useScoringConfig();
  const seasonsInfo = useSeasons(dataset);
  const clanAssignments = useClanAssignments(dataset);

  const memberById = useMemo(() => Object.fromEntries((dataset?.members ?? []).map((m) => [m.id, m])), [dataset]);

  const previousSeason = useMemo(() => {
    if (!seasonsInfo) return null;
    const idx = seasonsInfo.seasons.findIndex((s) => s.id === seasonsInfo.currentSeason.id);
    return idx > 0 ? seasonsInfo.seasons[idx - 1] : null;
  }, [seasonsInfo]);

  const clanStandings = useMemo(
    () =>
      dataset && seasonsInfo
        ? computeClanStandings(dataset, config, clanAssignments, CLAN_IDS, seasonsInfo.currentSeason, previousSeason)
        : null,
    [dataset, seasonsInfo, config, clanAssignments, previousSeason],
  );

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
              {error}
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

  if (status === 'loading' || !dataset || !seasonsInfo || !clanStandings) {
    return (
      <>
        <DemoBanner />
        <LeaderboardSkeleton />
      </>
    );
  }

  return (
    <>
      <DemoBanner />
      <div className={styles.head}>
        <h1>{t('clans_page_title')}</h1>
        <p className={styles.subtitle}>{t('clans_page_subtitle')}</p>
      </div>
      <ClanStandingsPanel
        standings={clanStandings}
        memberById={memberById}
        filterLabel={null}
        dataset={dataset}
        config={config}
        clanAssignments={clanAssignments}
        season={seasonsInfo.currentSeason}
      />
    </>
  );
}
