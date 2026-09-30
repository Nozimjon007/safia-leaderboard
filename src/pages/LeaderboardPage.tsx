import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import type { EarnedAchievement, Member } from '../data/types';
import { areaLabel, categoryLabel, roleLabel, useI18n } from '../i18n';
import { useDatasetContext } from '../state/DatasetProvider';
import { useLeaderboardFilters } from '../hooks/useLeaderboardFilters';
import { useAreaOptions, useLeaderboardResult, useOverallLeaderboardResult, useRoleOptions } from '../hooks/useLeaderboardResult';
import { usePageParam } from '../hooks/usePageParam';
import { useClanAssignments } from '../hooks/useClans';
import { useSeasonReveal } from '../hooks/useSeasonReveal';
import { useSeasons } from '../hooks/useSeasons';
import { useTimeMachine } from '../hooks/useTimeMachine';
import { useViewAsMemberId } from '../hooks/useViewAsMember';
import { useScoringConfig } from '../state/ScoringConfigProvider';
import { filterRowsByQuery, sortRows } from '../lib/scoring';
import { computeAllAchievements } from '../lib/achievements';
import { computeCraftPathProgress, craftPathForRole, type CraftPreview } from '../lib/craftPaths';
import { CLAN_IDS } from '../lib/clans';
import { computeClanStandings } from '../lib/clanPoints';
import { balanceForMember } from '../lib/coins';
import { useCoinLedger } from '../hooks/useCoinLedger';
import { buildLeaderboardCsv, downloadCsv } from '../lib/csv';
import { formatDateRange, weekEndISO, weekStartISO } from '../lib/dates';
import { findContainingSeason, seasonWeekRange, type Season } from '../lib/seasons';
import { DemoBanner } from '../components/common/DemoBanner';
import { StateMessage } from '../components/common/StateMessage';
import { SeasonPanel, seasonDefaultRange } from '../components/leaderboard/SeasonPanel';
import { MyNextMove } from '../components/leaderboard/MyNextMove';
import { TimeMachineControl } from '../components/leaderboard/TimeMachineControl';
import { TopFive } from '../components/leaderboard/TopFive';
import { BoardModeToggle } from '../components/leaderboard/BoardModeToggle';
import { ClanStandingsPreview } from '../components/leaderboard/ClanStandingsPreview';
import { ClanStandingsPanel } from '../components/leaderboard/ClanStandingsPanel';
import { SummaryStats } from '../components/leaderboard/SummaryStats';
import { FiltersBar } from '../components/leaderboard/FiltersBar';
import { BoardToolbar } from '../components/leaderboard/BoardToolbar';
import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable';
import { LeaderboardCards } from '../components/leaderboard/LeaderboardCards';
import { Pagination } from '../components/leaderboard/Pagination';
import { UnrankedNote } from '../components/leaderboard/UnrankedNote';
import { RankHistorySection } from '../components/leaderboard/RankHistorySection';
import { LeaderboardSkeleton } from '../components/leaderboard/LeaderboardSkeleton';
import { CompareTray } from '../components/leaderboard/CompareTray';
import styles from './LeaderboardPage.module.css';

/** Rows/cards per page — matches "at least 100 demo employees" nicely (a bit over 4 pages) and, more
 * importantly, is what keeps the explorer fast once the roster grows toward 500+: only this many
 * rows/cards are ever mounted at once, never the full filtered set (see pageRows below). */
const PAGE_SIZE = 24;

export function LeaderboardPage() {
  const { t, locale } = useI18n();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { status, dataset, error, reload } = useDatasetContext();
  const { filters, updateFilters, isPeriodExplicit } = useLeaderboardFilters(dataset);
  const { config } = useScoringConfig();
  const result = useLeaderboardResult(dataset, filters, config);
  const overallResult = useOverallLeaderboardResult(dataset, filters, config);
  const areaOptions = useAreaOptions(dataset);
  const roleOptions = useRoleOptions(dataset);
  const seasonsInfo = useSeasons(dataset);
  const clanAssignments = useClanAssignments(dataset);
  const tm = useTimeMachine(dataset, config, seasonsInfo?.currentSeason ?? null);
  const [viewAsMemberId, setViewAsMemberId] = useViewAsMemberId(null);
  // Computed here (ahead of the loading/error guards below) purely so usePageParam — a hook, so it
  // must run unconditionally every render — has a real totalPages to clamp against as soon as one
  // exists, rather than always resetting to page 1 while the dataset is still loading.
  const shown = result ? sortRows(filterRowsByQuery(result.rows, filters.query), filters.sortKey, filters.sortDir) : [];
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const [page, setPage] = usePageParam(totalPages);
  // Also hoisted ahead of the guards: findContainingSeason only needs dataset/seasonsInfo/filters,
  // all already safe when the dataset hasn't loaded yet (it just resolves to null), and
  // useSeasonReveal is itself a hook that must run unconditionally every render.
  const matchedSeason = dataset && seasonsInfo ? findContainingSeason(dataset, seasonsInfo.seasons, filters.fromISO, filters.toISO) : null;
  const seasonReveal = useSeasonReveal(matchedSeason?.id ?? null);
  const [toast, setToast] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const coinLedger = useCoinLedger();
  const coinsBalance = viewAsMemberId ? balanceForMember(coinLedger.transactions, viewAsMemberId) : null;
  const achievementsByMember = useMemo<Record<string, EarnedAchievement[]>>(
    () => (dataset && seasonsInfo ? computeAllAchievements(dataset, config, seasonsInfo.seasons) : {}),
    [dataset, config, seasonsInfo],
  );
  // Clan standings only make sense for a real season (achievements/coaching points are season-scoped
  // everywhere else in this app too — see TopFive's own reward-badge gating) — a custom period that
  // matches no season simply shows the solo board alone, same as the reveal/approval features already do.
  const previousSeasonForClans = useMemo(() => {
    if (!seasonsInfo || !matchedSeason) return null;
    const idx = seasonsInfo.seasons.findIndex((s) => s.id === matchedSeason.id);
    return idx > 0 ? seasonsInfo.seasons[idx - 1] : null;
  }, [seasonsInfo, matchedSeason]);
  const clanStandings = useMemo(
    () => (dataset && matchedSeason ? computeClanStandings(dataset, config, clanAssignments, CLAN_IDS, matchedSeason, previousSeasonForClans) : null),
    [dataset, config, clanAssignments, matchedSeason, previousSeasonForClans],
  );
  const memberById = useMemo(() => Object.fromEntries((dataset?.members ?? []).map((m) => [m.id, m])), [dataset]);

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

  // "Find my position": jump to whichever page the viewed-as member's row falls on, then scroll to
  // and briefly highlight it. Runs after the page number itself has actually committed (the `page`
  // dependency), so the row exists in the DOM by the time this looks for it. The table and card
  // renderings of the same row can both be mounted at once (desktop table + mobile card fallback),
  // so this picks whichever of the two is actually visible rather than assuming the table one.
  useEffect(() => {
    if (!highlightedId) return;
    const candidates = [
      document.getElementById(`board-row-table-${highlightedId}`),
      document.getElementById(`board-row-cards-${highlightedId}`),
    ];
    const el = candidates.find((c) => c && c.offsetParent !== null) ?? candidates.find((c): c is HTMLElement => c != null);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => setHighlightedId(null), 2200);
    return () => clearTimeout(timer);
  }, [highlightedId, page]);

  function selectSeason(season: Season) {
    const range = dataset ? seasonDefaultRange(dataset, season) : null;
    if (range) updateFilters({ fromISO: range.from, toISO: range.to });
  }

  function findMe() {
    if (!viewAsMemberId) return;
    const idx = shown.findIndex((r) => r.member.id === viewAsMemberId);
    if (idx === -1) {
      setToast(t('find_me_not_shown'));
      return;
    }
    const targetPage = Math.floor(idx / PAGE_SIZE) + 1;
    if (targetPage !== page) setPage(targetPage);
    setHighlightedId(viewAsMemberId);
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

  if (status === 'loading' || !dataset || !result || !overallResult) {
    return (
      <>
        <DemoBanner />
        <LeaderboardSkeleton />
      </>
    );
  }

  const metricLabel = filters.metric === 'overall' ? t('metric_overall') : categoryLabel(t, filters.metric);
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // A short "role-mastery preview" for the currently-visible page only (never the full roster) —
  // this season's Craft Path progress, same convention as the profile page's own panel (always the
  // real current season, independent of whatever period/season the explorer itself is filtered to).
  const craftPreviewByMember: Record<string, CraftPreview> = {};
  if (seasonsInfo?.currentSeason) {
    for (const r of pageRows) {
      const path = craftPathForRole(r.member.role);
      if (!path) continue;
      const progress = computeCraftPathProgress(dataset, r.member, seasonsInfo.currentSeason);
      if (progress) craftPreviewByMember[r.member.id] = { role: path.role, stars: progress.starsEarned, possible: progress.starsPossible };
    }
  }
  const rankedTop5 = overallResult.rows.filter((r) => r.overallRank != null).slice(0, 5);
  // A season's default period is week-snapped internally (scoring only ever operates on whole
  // weeks), which can overshoot the season's real calendar boundaries by up to six days (R6) — so
  // showing that snapped range as "the period" next to a heading that (correctly) shows the
  // season's exact dates reads as two different, disagreeing date ranges for the same view. Once
  // the viewer has actually chosen a period that isn't that snapped default (an explicit date pick,
  // a preset, or Time Machine), the snapped range is the real, honest answer again and is shown
  // as-is. Deliberately NOT based on isPeriodExplicit: the page canonicalizes the URL to an explicit
  // from/to the moment the dataset loads (see the effect below), so isPeriodExplicit alone would be
  // true on almost every render, including the season's own untouched default.
  const seasonOwnRange = matchedSeason ? seasonWeekRange(dataset, matchedSeason) : null;
  const isCustomPeriod =
    Boolean(tm?.active) || (matchedSeason != null && (seasonOwnRange == null || filters.fromISO !== seasonOwnRange.from || filters.toISO !== seasonOwnRange.to));
  const periodText =
    matchedSeason && !isCustomPeriod
      ? formatDateRange(matchedSeason.startISO, matchedSeason.endISO, locale)
      : formatDateRange(filters.fromISO, filters.toISO, locale);
  const weeksLabel = result.weekIndexes.length === 1 ? t('period_week_1') : t('period_weeks_n', { n: result.weekIndexes.length });
  const shiftLabel = filters.shift === 'all' ? t('shift_all') : t('shift_n', { n: filters.shift.replace('S', '') });
  const areaLabelText = filters.area === 'all' ? t('area_all') : areaLabel(t, filters.area);
  const roleLabelText = filters.role === 'all' ? t('role_all') : roleLabel(t, filters.role);
  const narrowedLabel =
    [
      filters.area !== 'all' ? areaLabelText : null,
      filters.shift !== 'all' ? shiftLabel : null,
      filters.role !== 'all' ? roleLabelText : null,
    ]
      .filter(Boolean)
      .join(' · ') || null;
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
    updateFilters({ query: '', shift: 'all', area: 'all', role: 'all' });
  }

  const selectedMembers: Member[] = compareIds
    .map((id) => dataset.members.find((m) => m.id === id))
    .filter((m): m is Member => m != null);

  return (
    <>
      <DemoBanner />
      {seasonsInfo && (
        <SeasonPanel
          dataset={dataset}
          filters={filters}
          matchedSeason={matchedSeason}
          seasons={seasonsInfo?.seasons ?? []}
          isCustomPeriod={isCustomPeriod}
          overallResult={overallResult}
          viewAsMemberId={viewAsMemberId}
          onSetViewAs={setViewAsMemberId}
          onSelectSeason={selectSeason}
          coinsBalance={coinsBalance}
          shouldAnimateReveal={seasonReveal.shouldAnimate}
          playKey={seasonReveal.playKey}
          onReplayReveal={seasonReveal.replay}
        />
      )}

      <MyNextMove
        dataset={dataset}
        overallResult={overallResult}
        memberId={viewAsMemberId}
        onSelectMember={setViewAsMemberId}
        clanAssignments={clanAssignments}
        clanStandings={clanStandings}
        currentSeason={seasonsInfo?.currentSeason ?? null}
        coinTransactions={coinLedger.transactions}
      />

      {clanStandings && (
        <div className={styles.boardModeRow}>
          <BoardModeToggle mode={filters.board} onChange={(board) => updateFilters({ board })} />
        </div>
      )}

      <motion.div
        key={filters.board}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        {filters.board === 'clans' && clanStandings ? (
          <ClanStandingsPanel
            standings={clanStandings}
            memberById={memberById}
            filterLabel={narrowedLabel}
            dataset={dataset}
            config={config}
            clanAssignments={clanAssignments}
            season={matchedSeason}
          />
        ) : (
          <>
            <TopFive
              rows={rankedTop5}
              dataset={dataset}
              config={config}
              matchedSeason={matchedSeason}
              achievementsByMember={achievementsByMember}
              clanAssignments={clanAssignments}
              filterLabel={narrowedLabel}
              compareIds={compareIds}
              onToggleCompare={toggleCompare}
              shouldAnimateReveal={seasonReveal.shouldAnimate}
              playKey={seasonReveal.playKey}
            />
            {clanStandings && <ClanStandingsPreview standings={clanStandings} memberById={memberById} />}
          </>
        )}
      </motion.div>

      <div className={styles.head}>
        <p className={styles.ctx}>
          {t('ctx_line', {
            period: periodText,
            weeks: weeksLabel,
            shift: shiftLabel,
            area: areaLabelText,
            n: result.rows.length,
            prev: prevText ?? '-',
          })}
          {!prevText && ' ' + t('ctx_no_prev')}
        </p>
      </div>

      {tm && <TimeMachineControl tm={tm} members={dataset.members} />}

      <FiltersBar
        filters={filters}
        dataset={dataset}
        areaOptions={areaOptions}
        roleOptions={roleOptions}
        onChange={updateFilters}
        onReset={clearFilters}
        onExport={handleExport}
        exportDisabled={shown.length === 0}
        periodLockedByTimeMachine={tm?.active ?? false}
      />

      {result.weekIndexes.length === 0 ? (
        <StateMessage title={t('state_empty_title')} body={t('state_empty_body')} />
      ) : (
        <>
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
              rankedCount={shown.filter((r) => r.rank != null).length}
              heading={`${t('nav_leaderboard')}: ${metricLabel}`}
              canFindMe={viewAsMemberId != null}
              onFindMe={findMe}
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
                    rows={pageRows}
                    team={result.team}
                    filters={filters}
                    onChange={updateFilters}
                    compareIds={compareIds}
                    onToggleCompare={toggleCompare}
                    highlightedId={highlightedId}
                    craftPreviewByMember={craftPreviewByMember}
                    clanAssignments={clanAssignments}
                  />
                </div>
                <div className={styles.mobileOnly}>
                  <LeaderboardCards
                    rows={pageRows}
                    team={result.team}
                    compareIds={compareIds}
                    onToggleCompare={toggleCompare}
                    achievementsByMember={achievementsByMember}
                    highlightedId={highlightedId}
                    craftPreviewByMember={craftPreviewByMember}
                    clanAssignments={clanAssignments}
                  />
                </div>
              </>
            ) : (
              <LeaderboardCards
                rows={pageRows}
                team={result.team}
                compareIds={compareIds}
                onToggleCompare={toggleCompare}
                achievementsByMember={achievementsByMember}
                highlightedId={highlightedId}
                craftPreviewByMember={craftPreviewByMember}
                clanAssignments={clanAssignments}
              />
            )}
            <Pagination page={page} pageSize={PAGE_SIZE} totalItems={shown.length} onChange={setPage} />
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
