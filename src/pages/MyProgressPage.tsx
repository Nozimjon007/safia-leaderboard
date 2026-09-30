import { useMemo } from 'react';
import { seasonCountdownText, seasonQuarterLabel, useI18n } from '../i18n';
import { useDatasetContext } from '../state/DatasetProvider';
import { useScoringConfig } from '../state/ScoringConfigProvider';
import { useLeaderboardFilters } from '../hooks/useLeaderboardFilters';
import { useOverallLeaderboardResult } from '../hooks/useLeaderboardResult';
import { useSeasons } from '../hooks/useSeasons';
import { useClanAssignments } from '../hooks/useClans';
import { useCoinLedger } from '../hooks/useCoinLedger';
import { useViewAsMemberId } from '../hooks/useViewAsMember';
import { useMemberProgress } from '../hooks/useMemberProgress';
import { CLAN_IDS } from '../lib/clans';
import { computeClanStandings } from '../lib/clanPoints';
import { seasonCountdown } from '../lib/seasons';
import { DemoBanner } from '../components/common/DemoBanner';
import { StateMessage } from '../components/common/StateMessage';
import { LeaderboardSkeleton } from '../components/leaderboard/LeaderboardSkeleton';
import { MyNextMove } from '../components/leaderboard/MyNextMove';
import { CraftJournal } from '../components/member/CraftJournal';
import styles from './MyProgressPage.module.css';

/**
 * A focused personal dashboard, reachable as its own primary destination, deliberately not a
 * shorter version of the full profile (which stays the "everything about this employee" page).
 * My Next Move already computes exactly the prioritized list this page needs (position, movement,
 * next Craft star, clan gap, coins, shop goal) — reused wholesale, including its own employee
 * picker, so this page never risks disagreeing with the one on the Leaderboard. The season deadline
 * and a trimmed Craft Journal are the only things added beyond it.
 */
export function MyProgressPage() {
  const { t } = useI18n();
  const { status, dataset, error, reload } = useDatasetContext();
  const { filters } = useLeaderboardFilters(dataset);
  const { config } = useScoringConfig();
  const overallResult = useOverallLeaderboardResult(dataset, filters, config);
  const seasonsInfo = useSeasons(dataset);
  const clanAssignments = useClanAssignments(dataset);
  const coinLedger = useCoinLedger();
  const [viewAsMemberId, setViewAsMemberId] = useViewAsMemberId(null);
  const member = dataset?.members.find((m) => m.id === viewAsMemberId) ?? null;
  const progress = useMemberProgress(dataset, config, seasonsInfo?.seasons ?? null, viewAsMemberId);

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

  if (status === 'loading' || !dataset || !overallResult || !seasonsInfo) {
    return (
      <>
        <DemoBanner />
        <LeaderboardSkeleton />
      </>
    );
  }

  const countdown = seasonCountdown(seasonsInfo.currentSeason);

  return (
    <>
      <DemoBanner />
      <div className={styles.head}>
        <h1>{t('my_progress_title')}</h1>
        <p className={styles.subtitle}>{t('my_progress_subtitle')}</p>
      </div>

      {countdown && (
        <p className={styles.deadline}>
          {t('my_progress_deadline', { season: seasonQuarterLabel(t, seasonsInfo.currentSeason), countdown: seasonCountdownText(t, countdown) })}
        </p>
      )}

      <MyNextMove
        dataset={dataset}
        overallResult={overallResult}
        memberId={viewAsMemberId}
        onSelectMember={setViewAsMemberId}
        clanAssignments={clanAssignments}
        clanStandings={clanStandings}
        currentSeason={seasonsInfo.currentSeason}
        coinTransactions={coinLedger.transactions}
      />

      {member && progress && (
        <CraftJournal dataset={dataset} config={config} member={member} seasons={seasonsInfo.seasons} seasonHistory={progress.seasonHistory} />
      )}
    </>
  );
}
