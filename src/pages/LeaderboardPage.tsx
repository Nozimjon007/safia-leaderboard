import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { EarnedAchievement, Member } from '../data/types';
import { categoryLabel, useI18n } from '../i18n';
import { useDatasetContext } from '../state/DatasetProvider';
import { useLeaderboardFilters } from '../hooks/useLeaderboardFilters';
import { useAreaOptions, useLeaderboardResult } from '../hooks/useLeaderboardResult';
import { useSeasons } from '../hooks/useSeasons';
import { useViewAsMemberId } from '../hooks/useViewAsMember';
import { useScoringConfig } from '../state/ScoringConfigProvider';
import { filterRowsByQuery, sortRows } from '../lib/scoring';
import { computeAllAchievements } from '../lib/achievements';
import { buildLeaderboardCsv, downloadCsv } from '../lib/csv';
import { formatDateRange, weekEndISO, weekStartISO } from '../lib/dates';
import { DemoBanner } from '../components/common/DemoBanner';
import { StateMessage } from '../components/common/StateMessage';
import { SeasonPanel } from '../components/leaderboard/SeasonPanel';
import { Podium } from '../components/leaderboard/Podium';
import { SummaryStats } from '../components/leaderboard/SummaryStats';
import { FiltersBar } from '../components/leaderboard/FiltersBar';
import { BoardToolbar } from '../components/leaderboard/BoardToolbar';
import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable';
import { LeaderboardCards } from '../components/leaderboard/LeaderboardCards';
import { UnrankedNote } from '../components/leaderboard/UnrankedNote';
import { RankHistorySection } from '../components/leaderboard/RankHistorySection';
import { LeaderboardSkeleton } from '../components/leaderboard/LeaderboardSkeleton';
import { CompareTray } from '../components/leaderboard/CompareTray';
import styles from './LeaderboardPage.module.css';

export function LeaderboardPage() {
  const { t, locale } = useI18n();
  const location = useLocation();
  const { status, dataset, error, reload } = useDatasetContext();
  const { filters, updateFilters, isPeriodExplicit } = useLeaderboardFilters(dataset);
  const { config } = useScoringConfig();
  const result = useLeaderboardResult(dataset, filters, config);
  const areaOptions = useAreaOptions(dataset);
  const seasonsInfo = useSeasons(dataset);
  const [viewAsMemberId] = useViewAsMemberId(dataset?.members[0]?.id ?? null);
  const [toast, setToast] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const achievementsByMember = useMemo<Record<string, EarnedAchievement[]>>(
    () => (dataset && seasonsInfo ? computeAllAchievements(dataset, config, seasonsInfo.seasons) : {}),
    [dataset, config, seasonsInfo],
  );

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // keep it to two: drop the oldest pick
      return [...prev, id];
    });
  }

  // Canonicalize the URL once the dataset's default period is known, so the address bar (and any
  // copied link) always reflects an explicit period instead of an implicit fallback.
  useEffect(() => {
    if (dataset && !isPeriodExplicit) {
      updateFilters({ fromISO: filters.fromISO, toISO: filters.toISO });
    }
  }, [dataset, isPeriodExplicit, filters.fromISO, filters.toISO, updateFilters]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

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
              <span className={styles.errDetail}>{error}</span>
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

  if (status === 'loading' || !dataset || !result) {
    return (
      <>
        <DemoBanner />
        <LeaderboardSkeleton />
      </>
    );
  }

  const metricLabel = filters.metric === 'overall' ? t('metric_overall') : categoryLabel(t, filters.metric);
  const shown = sortRows(filterRowsByQuery(result.rows, filters.query), filters.sortKey, filters.sortDir);
  const rankedTop3 = result.rows.filter((r) => r.rank != null).slice(0, 3);
  const periodText = formatDateRange(filters.fromISO, filters.toISO, locale);
  const weeksLabel = result.weekIndexes.length === 1 ? t('period_week_1') : t('period_weeks_n', { n: result.weekIndexes.length });
  const shiftLabel = filters.shift === 'all' ? t('shift_all') : t('shift_n', { n: filters.shift.replace('S', '') });
  const areaLabelText = filters.area === 'all' ? t('area_all') : filters.area;
  const prevText = result.previousWeekIndexes
    ? formatDateRange(
        weekStartISO(dataset.firstWeekStart, result.previousWeekIndexes[0]),
        weekEndISO(dataset.firstWeekStart, result.previousWeekIndexes[result.previousWeekIndexes.length - 1]),
        locale,
      )
    : null;

  function handleExport() {
    const csv = buildLeaderboardCsv(shown, t, {
      metricLabel,
      fromISO: filters.fromISO,
      toISO: filters.toISO,
      shiftLabel,
      areaLabel: areaLabelText,
      sourceLabel: dataset!.sourceLabel,
    });
    const filename = `leaderboard_${filters.fromISO}_${filters.toISO}_${filters.shift === 'all' ? 'all-shifts' : filters.shift}_${filters.metric}.csv`;
    try {
      downloadCsv(filename, csv);
      setToast(t('export_done', { file: filename }));
    } catch {
      setToast(t('export_failed'));
    }
  }

  function clearFilters() {
    updateFilters({ query: '', shift: 'all', area: 'all' });
  }

  const selectedMembers: Member[] = compareIds
    .map((id) => dataset.members.find((m) => m.id === id))
    .filter((m): m is Member => m != null);

  return (
    <>
      <DemoBanner />
      {seasonsInfo && (
        <SeasonPanel dataset={dataset} config={config} season={seasonsInfo.currentSeason} viewAsMemberId={viewAsMemberId} />
      )}
      <div className={styles.head}>
        <h1>{t('app_title')}</h1>
        <p className={styles.ctx}>
          {t('ctx_line', {
            period: periodText,
            weeks: weeksLabel,
            shift: shiftLabel,
            area: areaLabelText,
            n: result.rows.length,
            prev: prevText ?? '—',
          })}
          {!prevText && ' ' + t('ctx_no_prev')}
        </p>
      </div>

      <FiltersBar
        filters={filters}
        dataset={dataset}
        areaOptions={areaOptions}
        onChange={updateFilters}
        onExport={handleExport}
        exportDisabled={shown.length === 0}
      />

      {result.weekIndexes.length === 0 ? (
        <StateMessage title={t('state_empty_title')} body={t('state_empty_body')} />
      ) : (
        <>
          <Podium
            rows={rankedTop3}
            metric={filters.metric}
            metricLabel={metricLabel}
            achievementsByMember={achievementsByMember}
            dataset={dataset}
            config={config}
            seasons={seasonsInfo?.seasons ?? null}
            periodFromISO={filters.fromISO}
            periodToISO={filters.toISO}
            compareIds={compareIds}
            onToggleCompare={toggleCompare}
          />
          <SummaryStats
            team={result.team}
            topImprovement={result.topImprovement}
            weekCount={result.weekIndexes.length}
            hasPreviousPeriod={result.previousWeekIndexes != null}
          />

          <section className={styles.board}>
            <BoardToolbar
              filters={filters}
              onChange={updateFilters}
              shownCount={shown.length}
              totalCount={result.rows.length}
              heading={`${t('nav_leaderboard')}: ${metricLabel}`}
            />
            {shown.length === 0 ? (
              <StateMessage
                title={t('state_empty_title')}
                body={t('state_empty_body')}
                dashed={false}
                action={
                  <button type="button" className="btn" onClick={clearFilters}>
                    {t('clear_filters')}
                  </button>
                }
              />
            ) : filters.view === 'table' ? (
              <>
                <div className={styles.desktopOnly}>
                  <LeaderboardTable
                    rows={shown}
                    team={result.team}
                    filters={filters}
                    onChange={updateFilters}
                    compareIds={compareIds}
                    onToggleCompare={toggleCompare}
                  />
                </div>
                <div className={styles.mobileOnly}>
                  <LeaderboardCards
                    rows={shown}
                    team={result.team}
                    compareIds={compareIds}
                    onToggleCompare={toggleCompare}
                    achievementsByMember={achievementsByMember}
                  />
                </div>
              </>
            ) : (
              <LeaderboardCards
                rows={shown}
                team={result.team}
                compareIds={compareIds}
                onToggleCompare={toggleCompare}
                achievementsByMember={achievementsByMember}
              />
            )}
            <UnrankedNote rows={shown} />
          </section>

          <RankHistorySection dataset={dataset} result={result} metric={filters.metric} />

          <p>
            <Link className={styles.scoringLink} to={{ pathname: '/scoring', search: location.search }}>
              {t('nav_scoring')} →
            </Link>
          </p>
        </>
      )}

      <div className={styles.toast} role="status" aria-live="polite" hidden={!toast}>
        {toast}
      </div>
      <CompareTray
        selected={selectedMembers}
        onRemove={(id) => setCompareIds((prev) => prev.filter((x) => x !== id))}
        onClear={() => setCompareIds([])}
      />
    </>
  );
}
