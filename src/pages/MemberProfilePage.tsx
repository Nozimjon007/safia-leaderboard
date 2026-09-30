import { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CATEGORY_KEYS, type CategoryKey, type LeaderboardDataset } from '../data/types';
import { categoryLabel, roleLabel, useI18n } from '../i18n';
import { useDatasetContext } from '../state/DatasetProvider';
import { useLeaderboardFilters, type LeaderboardFilters } from '../hooks/useLeaderboardFilters';
import { useLeaderboardResult } from '../hooks/useLeaderboardResult';
import { useClanAssignments } from '../hooks/useClans';
import { useCoinLedger } from '../hooks/useCoinLedger';
import { useSeasons } from '../hooks/useSeasons';
import { useTimeMachine } from '../hooks/useTimeMachine';
import { useMemberProgress } from '../hooks/useMemberProgress';
import { useScoringConfig } from '../state/ScoringConfigProvider';
import {
  competitionRank,
  metricValue,
  mean,
  scoreReceipt,
  strengthsAndWeaknesses,
  weekOverall,
  zoneOf,
  type LeaderboardRow,
  type TeamStats,
} from '../lib/scoring';
import { formatDateRange, formatShortDate, weekEndISO, weekIndexesInRange, weekStartISO } from '../lib/dates';
import { formatScore } from '../lib/format';
import { zoneColorVar } from '../lib/zoneStyle';
import { computeXpTier, pointsToNextTier } from '../lib/xpTier';
import type { Season } from '../lib/seasons';
import type { ClanId } from '../lib/clans';
import { DemoBanner } from '../components/common/DemoBanner';
import { StateMessage } from '../components/common/StateMessage';
import { Avatar } from '../components/common/Avatar';
import { JobPanel } from '../components/common/JobPanel';
import { CoinsPanel } from '../components/member/CoinsPanel';
import { MoveBadge } from '../components/common/MoveBadge';
import { ZoneBadge } from '../components/common/ZoneBadge';
import { RadarChart } from '../components/charts/RadarChart';
import { LineChart } from '../components/charts/LineChart';
import { CategoryBreakdownList } from '../components/member/CategoryBreakdownList';
import { StrengthsList } from '../components/leaderboard/StrengthsList';
import { LeaderboardSkeleton } from '../components/leaderboard/LeaderboardSkeleton';
import { BadgesPanel } from '../components/member/BadgesPanel';
import { SeasonHistoryPanel } from '../components/member/SeasonHistoryPanel';
import { RewardBadge } from '../components/member/RewardBadge';
import { CareerCard } from '../components/member/CareerCard';
import { CraftPathPanel } from '../components/member/CraftPathPanel';
import { PathToPodiumPanel } from '../components/member/PathToPodiumPanel';
import { ScoreReceiptPanel } from '../components/member/ScoreReceiptPanel';
import { TimeMachineBanner } from '../components/leaderboard/TimeMachineBanner';
import type { TranslationKey } from '../i18n/locales/en';
import styles from './MemberProfilePage.module.css';

export function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const location = useLocation();
  const { status, dataset, error, reload } = useDatasetContext();
  const { filters } = useLeaderboardFilters(dataset);
  const { config } = useScoringConfig();
  const result = useLeaderboardResult(dataset, filters, config);
  const seasonsInfo = useSeasons(dataset);
  const clanAssignments = useClanAssignments(dataset);
  const backHref = { pathname: '/', search: location.search };

  if (status === 'error') {
    return (
      <>
        <DemoBanner />
        <StateMessage
          title={t('state_error_title')}
          role="alert"
          body={t('state_error_body')}
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

  const rowIndex = result.rows.findIndex((r) => r.member.id === id);
  const row = rowIndex >= 0 ? result.rows[rowIndex] : null;

  if (!row) {
    const existsAtAll = dataset.members.some((m) => m.id === id);
    return (
      <>
        <div className={styles.crumbs}>
          <Link className={styles.backLink} to={backHref}>
            ← {t('back_to_leaderboard')}
          </Link>
        </div>
        <StateMessage title={t('not_found_title')} body={existsAtAll ? t('state_empty_body') : error ?? undefined} />
      </>
    );
  }

  return (
    <MemberProfileContent
      key={row.member.id}
      row={row}
      rows={result.rows}
      rowIndex={rowIndex}
      team={result.team}
      dataset={dataset}
      filters={filters}
      previousWeekIndexes={result.previousWeekIndexes}
      backHref={backHref}
      seasons={seasonsInfo?.seasons ?? null}
      currentSeason={seasonsInfo?.currentSeason ?? null}
      clanId={clanAssignments[row.member.id] ?? null}
    />
  );
}

interface MemberProfileContentProps {
  row: LeaderboardRow;
  rows: LeaderboardRow[];
  rowIndex: number;
  team: TeamStats;
  dataset: LeaderboardDataset;
  filters: LeaderboardFilters;
  previousWeekIndexes: number[] | null;
  backHref: { pathname: string; search: string };
  seasons: readonly Season[] | null;
  currentSeason: Season | null;
  clanId: ClanId | null;
}

function MemberProfileContent({
  row,
  rows,
  rowIndex,
  team,
  dataset,
  filters,
  previousWeekIndexes,
  backHref,
  seasons,
  currentSeason,
  clanId,
}: MemberProfileContentProps) {
  const { t, locale } = useI18n();
  const { config } = useScoringConfig();
  const location = useLocation();
  const coinLedger = useCoinLedger();
  const progress = useMemberProgress(dataset, config, seasons, row.member.id);
  const tm = useTimeMachine(dataset, config, currentSeason);
  const myWeekChange = tm?.changes.find((c) => c.memberId === row.member.id) ?? null;
  const currentSeasonEntry = progress ? (progress.seasonHistory[progress.seasonHistory.length - 1] ?? null) : null;

  const zone = zoneOf(row.current.overall, config);
  const prevRow = rows[rowIndex - 1] ?? null;
  const nextRow = rows[rowIndex + 1] ?? null;
  const metricLabel = filters.metric === 'overall' ? t('metric_overall') : categoryLabel(t, filters.metric);

  const prevPeriodText = previousWeekIndexes
    ? formatDateRange(
        weekStartISO(dataset.firstWeekStart, previousWeekIndexes[0]),
        weekEndISO(dataset.firstWeekStart, previousWeekIndexes[previousWeekIndexes.length - 1]),
        locale,
      )
    : null;

  const moveLine =
    row.move == null
      ? t('move_line_na')
      : row.move > 0
        ? t('move_line_up', { n: row.move, period: prevPeriodText ?? '' })
        : row.move < 0
          ? t('move_line_down', { n: -row.move, period: prevPeriodText ?? '' })
          : t('move_line_same', { period: prevPeriodText ?? '' });

  const ranksByCategory = useMemo(() => {
    const map = {} as Record<CategoryKey, Map<string, number>>;
    CATEGORY_KEYS.forEach((c) => {
      map[c] = competitionRank(rows.map((r) => ({ id: r.member.id, value: r.current.categories[c] })));
    });
    return map;
  }, [rows]);

  const rankedCountFor = (c: CategoryKey) => rows.filter((r) => r.current.categories[c] != null).length;
  const rankedCountForMetric = rows.filter((r) => metricValue(r.current, filters.metric) != null).length;

  const { strengths, weaknesses } = strengthsAndWeaknesses(row.current.categories, team.categoryAverages);
  const receipt = scoreReceipt(row.current.categories, config.weights);
  const categoryLabels = Object.fromEntries(CATEGORY_KEYS.map((c) => [c, categoryLabel(t, c)])) as Record<CategoryKey, string>;

  const history = useMemo(() => {
    const labels: string[] = [];
    const memberScore: Array<number | null> = [];
    const teamScore: Array<number | null> = [];
    const memberRank: Array<number | null> = [];
    for (let w = 0; w < dataset.weekCount; w++) {
      labels.push(formatShortDate(weekStartISO(dataset.firstWeekStart, w)));
      memberScore.push(weekOverall(dataset.scores[row.member.id], w, config));
      teamScore.push(mean(rows.map((r) => weekOverall(dataset.scores[r.member.id], w, config))));
      const values = rows.map((r) => ({
        id: r.member.id,
        value:
          filters.metric === 'overall'
            ? weekOverall(dataset.scores[r.member.id], w, config)
            : (dataset.scores[r.member.id][filters.metric][w] ?? null),
      }));
      const ranks = competitionRank(values);
      memberRank.push(ranks.get(row.member.id) ?? null);
    }
    return { labels, memberScore, teamScore, memberRank };
  }, [dataset, rows, row.member.id, config, filters.metric]);

  const periodIndexes = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, filters.fromISO, filters.toISO);
  const band: [number, number] | null = periodIndexes.length ? [periodIndexes[0], periodIndexes[periodIndexes.length - 1]] : null;
  const hasScoreHistory = history.memberScore.filter((v) => v != null).length >= 2;
  const hasRankHistory = history.memberRank.filter((v) => v != null).length >= 2;

  const compareParams = new URLSearchParams(location.search);
  compareParams.set('a', row.member.id);
  compareParams.delete('b');
  const compareHref = { pathname: '/compare', search: `?${compareParams.toString()}` };

  const rowAbove = rowIndex > 0 ? rows[rowIndex - 1] : null;
  const distanceToNext =
    row.rank === 1
      ? null
      : rowAbove && rowAbove.current.overall != null && row.current.overall != null
        ? rowAbove.current.overall - row.current.overall
        : null;

  const leaderRow = rows[0] ?? null;
  const gapToLeader =
    row.rank === 1
      ? null
      : leaderRow && leaderRow.current.overall != null && row.current.overall != null
        ? leaderRow.current.overall - row.current.overall
        : null;

  const currentGreenStreak = useMemo(() => {
    let streak = 0;
    for (let w = dataset.weekCount - 1; w >= 0; w--) {
      const v = weekOverall(dataset.scores[row.member.id], w, config);
      if (v != null && v >= config.greenThreshold) streak += 1;
      else break;
    }
    return streak;
  }, [dataset, row.member.id, config]);

  const xpTier = progress ? computeXpTier(progress.xpPoints) : null;
  const xpNext = progress ? pointsToNextTier(progress.xpPoints) : null;

  return (
    <article>
      <DemoBanner />
      <TimeMachineBanner tm={tm} members={dataset.members} />
      <div className={styles.crumbs}>
        <Link className={styles.backLink} to={backHref}>
          ← {t('back_to_leaderboard')}
        </Link>
        <span className={styles.adjNav}>
          {prevRow && (
            <Link className={styles.backLink} to={{ pathname: `/member/${prevRow.member.id}`, search: location.search }}>
              ← {t('prev_member')}: {prevRow.member.name}
            </Link>
          )}
          {nextRow && (
            <Link className={styles.backLink} to={{ pathname: `/member/${nextRow.member.id}`, search: location.search }}>
              {t('next_member')}: {nextRow.member.name} →
            </Link>
          )}
        </span>
      </div>

      <section className={styles.header} style={{ borderTopColor: zoneColorVar(zone) }}>
        <Avatar id={row.member.id} name={row.member.name} photoUrl={row.member.avatarPhoto} size={84} />
        <div className={styles.who}>
          <h1>{row.member.name}</h1>
          <p>
            {roleLabel(t, row.member.role)} · {row.member.area} <span className={styles.shiftTag}>{row.member.shift}</span> ·{' '}
            {formatDateRange(filters.fromISO, filters.toISO, locale)} ·{' '}
            {periodIndexes.length === 1 ? t('period_week_1') : t('period_weeks_n', { n: periodIndexes.length })}
          </p>
          <p className={styles.moveLine}>
            <MoveBadge move={row.move} /> <span>{moveLine}</span>
          </p>
          <p className={styles.compareAction}>
            <Link to={compareHref}>{t('nav_compare')} →</Link>
          </p>
        </div>
        {xpTier && progress && (
          <div className={styles.xpTier} data-tier={xpTier} title={t('xp_tier_demo_note')}>
            <span className={styles.xpTierLabel}>{t('xp_tier_title')}</span>
            <span className={styles.xpTierValue}>{t(`xp_tier_${xpTier}` as TranslationKey)}</span>
            <span className={styles.xpTierPoints}>{t('xp_points_label', { n: progress.xpPoints })}</span>
            {xpNext && (
              <span className={styles.xpTierNext}>
                {xpNext.remaining} → {t(`xp_tier_${xpNext.tier}` as TranslationKey)}
              </span>
            )}
          </div>
        )}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statKey}>{t('rank_now', { metric: metricLabel })}</div>
            <div className={`${styles.statValue} tabular`}>
              {row.rank ?? '—'} {row.rank != null && <small>/ {rankedCountForMetric}</small>}
            </div>
            <div className={styles.statKey}>
              {t('previous_rank')}: {row.previousRank ?? '—'}
            </div>
            <div className={styles.distanceNote}>
              {row.rank === 1
                ? t('progress_already_first')
                : row.rank == null
                  ? t('progress_no_rank_yet')
                  : distanceToNext != null
                    ? t('progress_distance_to_next', { n: formatScore(distanceToNext, locale), rank: (row.rank ?? 1) - 1 })
                    : null}
            </div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statKey}>{t('overall_score')}</div>
            <div className={`${styles.statValue} tabular`} style={{ color: zoneColorVar(zone) }}>
              {formatScore(row.current.overall, locale)} <small>/100</small>
            </div>
            {row.current.overall != null && <ZoneBadge zone={zone} />}
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="job-panel-heading">
        <h2 id="job-panel-heading" className="visually-hidden">
          {t('job_panel_heading')}
        </h2>
        <JobPanel member={row.member} clanId={clanId} overallRank={row.overallRank} overallScore={row.current.overall} showSoloStat={false} />
      </section>

      {progress && (
        <CareerCard
          member={row.member}
          todayISO={new Date().toISOString().slice(0, 10)}
          currentSeason={currentSeasonEntry?.season ?? null}
          currentSeasonRank={currentSeasonEntry?.rank ?? null}
          currentSeasonScore={currentSeasonEntry?.overall ?? null}
          currentSeasonRankedCount={currentSeasonEntry?.rankedCount ?? 0}
          earnedAchievements={progress.earnedAchievements}
          rewardCount={progress.myRewards.length}
        />
      )}

      <CoinsPanel memberId={row.member.id} transactions={coinLedger.transactions} />

      <CraftPathPanel
        member={row.member}
        dataset={dataset}
        config={config}
        currentSeason={currentSeason}
        seasons={seasons}
        periodWeekIndexes={periodIndexes}
      />

      {row.current.missingCategories.length > 0 && (
        <p className={styles.warn} role="note">
          {t('partial_warning', { categories: row.current.missingCategories.map((c) => categoryLabel(t, c)).join(', ') })}
        </p>
      )}

      <PathToPodiumPanel
        rank={row.rank}
        gapToNext={distanceToNext}
        gapToLeader={gapToLeader}
        strongest={strengths[0] ?? null}
        weekChange={myWeekChange}
        locale={locale}
      />

      <ScoreReceiptPanel receipt={receipt} locale={locale} />

      <div className={styles.twoCol}>
        <section className={styles.panel} aria-labelledby="breakdown-heading">
          <h2 id="breakdown-heading">{t('breakdown_title')}</h2>
          <p className={styles.sub}>{t('breakdown_subtitle')}</p>
          <CategoryBreakdownList
            current={row.current}
            previous={row.previous}
            team={team}
            ranksByCategory={ranksByCategory}
            memberId={row.member.id}
            rankedCountFor={rankedCountFor}
          />
        </section>
        <section className={styles.panel} aria-labelledby="radar-heading">
          <h2 id="radar-heading">{t('radar_title')}</h2>
          <p className={styles.sub}>
            {filters.shift === 'all' ? t('shift_all') : t('shift_n', { n: filters.shift.replace('S', '') })} ·{' '}
            {formatDateRange(filters.fromISO, filters.toISO, locale)}
          </p>
          <RadarChart
            seriesA={{ values: row.current.categories, label: row.member.name, color: 'var(--accent)' }}
            seriesB={{ values: team.categoryAverages, label: t('team_short'), color: 'var(--ink-secondary)', dashed: true }}
            categoryLabels={categoryLabels}
            ariaLabel={t('radar_title')}
            missingValueLabel={t('missing_value')}
            formatValue={(v) => `${Math.round(v)}%`}
          />
        </section>
      </div>

      <StrengthsList strengths={strengths} weaknesses={weaknesses} />

      <section className={styles.panel} aria-labelledby="score-history-heading">
        <h2 id="score-history-heading">{t('score_history_title')}</h2>
        <p className={styles.sub}>{t('score_history_subtitle')}</p>
        {hasScoreHistory ? (
          <LineChart
            labels={history.labels}
            series={[
              { id: 'team', label: t('team_short'), values: history.teamScore, kind: 'dashedMuted' },
              { id: 'member', label: row.member.name, values: history.memberScore, kind: 'accent' },
            ]}
            yMin={20}
            yMax={100}
            yTicks={[20, 40, 60, 80, 100]}
            bandRange={band}
            ariaLabel={`${t('score_history_title')}: ${row.member.name}`}
            valueLabel={(v) => formatScore(v, locale)}
            showDataTableLabel={t('show_data_table')}
            emptyValueLabel={t('missing_value')}
          />
        ) : (
          <p className={styles.sub}>{t('no_history')}</p>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="rank-history-heading">
        <h2 id="rank-history-heading">{t('member_rank_history_title', { metric: metricLabel })}</h2>
        <p className={styles.sub}>{t('member_rank_history_subtitle')}</p>
        {hasRankHistory ? (
          <LineChart
            labels={history.labels}
            series={[{ id: 'member', label: row.member.name, values: history.memberRank, kind: 'accent' }]}
            yMin={1}
            yMax={Math.max(rows.length, 2)}
            yTicks={Array.from({ length: rows.length }, (_, i) => i + 1).filter((v) => v === 1 || v === rows.length || v % 2 === 0)}
            invertY
            bandRange={band}
            ariaLabel={`${t('member_rank_history_title', { metric: metricLabel })}: ${row.member.name}`}
            valueLabel={(v) => String(Math.round(v))}
            showDataTableLabel={t('show_data_table')}
            emptyValueLabel={t('missing_value')}
          />
        ) : (
          <p className={styles.sub}>{t('no_history')}</p>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="milestones-heading">
        <h2 id="milestones-heading">{t('milestones_title')}</h2>
        <p className={styles.sub}>
          {currentGreenStreak >= 2 ? t('milestone_green_streak', { n: currentGreenStreak }) : t('milestone_none')}
        </p>
      </section>

      {progress && seasons && <BadgesPanel earned={progress.earnedAchievements} seasons={seasons} />}

      {progress && (
        <div className={styles.twoCol}>
          <SeasonHistoryPanel entries={progress.seasonHistory} dataset={dataset} />
          <section className={styles.panel} aria-labelledby="rewards-heading">
            <h2 id="rewards-heading">{t('rewards_title')}</h2>
            {progress.myRewards.length === 0 ? (
              <p className={styles.sub}>{t('no_rewards_yet')}</p>
            ) : (
              <div className={styles.rewardsGrid}>
                {progress.myRewards.map((r, i) => {
                  const season = seasons?.find((s) => s.id === r.seasonId);
                  return season ? <RewardBadge key={`${r.seasonId}-${r.rewardId}-${i}`} rewardId={r.rewardId} season={season} /> : null;
                })}
              </div>
            )}
            <p className={styles.rewardsDisclaimer}>{t('rewards_proposed_banner')}</p>
          </section>
        </div>
      )}

      <section className={styles.panel} aria-labelledby="ledger-heading">
        <h2 id="ledger-heading">{t('ledger_title')}</h2>
        <p className={styles.sub}>{t('ledger_unavailable')}</p>
      </section>
    </article>
  );
}
