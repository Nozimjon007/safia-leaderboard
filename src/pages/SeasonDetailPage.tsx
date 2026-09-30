import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { CATEGORY_KEYS, type LeaderboardDataset, type Member, type MetricKey, type ScoringConfig, type SortDirection, type SortKey } from '../data/types';
import { categoryLabel, roleLabel, seasonQuarterLabel, useI18n } from '../i18n';
import { useDatasetContext } from '../state/DatasetProvider';
import { useScoringConfig } from '../state/ScoringConfigProvider';
import { buildLeaderboard, filterRowsByQuery, sortRows, zoneOf, type LeaderboardRow } from '../lib/scoring';
import { computeAllAchievements, ACHIEVEMENT_GLYPHS, earnedAchievementTypes, countOf } from '../lib/achievements';
import { computeSeasonRewards } from '../lib/rewards';
import { seasonWeeks, snapshotAt, computeWeekChanges, deriveCaption } from '../lib/timeMachine';
import { parseSeasonId, seasonOf, seasonStatus, type Quarter, type Season, type SeasonStatus } from '../lib/seasons';
import { computeSeasonDistinctions, type SeasonDistinction } from '../lib/craftPaths';
import { formatDateRange, weekEndISO, weekIndexesInRange, weekStartISO, formatShortDate } from '../lib/dates';
import { formatScore, formatSigned } from '../lib/format';
import { zoneColorVar } from '../lib/zoneStyle';
import type { ClanId } from '../lib/clans';
import { useClanAssignments } from '../hooks/useClans';
import { useCoinLedger, type CoinLedger } from '../hooks/useCoinLedger';
import { DemoBanner } from '../components/common/DemoBanner';
import { StateMessage } from '../components/common/StateMessage';
import { LeaderboardSkeleton } from '../components/leaderboard/LeaderboardSkeleton';
import { Avatar } from '../components/common/Avatar';
import { MoveBadge } from '../components/common/MoveBadge';
import { CoinAwardsReveal } from '../components/season/CoinAwardsReveal';
import { Podium } from '../components/leaderboard/Podium';
import { SummaryStats } from '../components/leaderboard/SummaryStats';
import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable';
import { LeaderboardCards } from '../components/leaderboard/LeaderboardCards';
import { BoardToolbar } from '../components/leaderboard/BoardToolbar';
import { CompareTray } from '../components/leaderboard/CompareTray';
import { REWARD_GLYPHS } from '../components/member/RewardBadge';
import { formatTimeMachineCaption } from '../components/leaderboard/TimeMachineControl';
import type { LeaderboardFilters } from '../hooks/useLeaderboardFilters';
import type { TranslationKey } from '../i18n/locales/en';
import styles from './SeasonDetailPage.module.css';

const TABS = ['overview', 'standings', 'timeline', 'awards', 'insights'] as const;
type Tab = (typeof TABS)[number];

export function SeasonDetailPage() {
  const { id } = useParams<{ id: string }>();
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

  if (status === 'loading' || !dataset) {
    return (
      <>
        <DemoBanner />
        <LeaderboardSkeleton />
      </>
    );
  }

  const season = id ? parseSeasonId(id) : null;
  if (!season) {
    return (
      <>
        <DemoBanner />
        <div className={styles.crumbs}>
          <Link className={styles.backLink} to="/seasons">
            ← {t('seasons_page_title')}
          </Link>
        </div>
        <StateMessage title={t('season_not_found_title')} body={t('season_not_found_body')} />
      </>
    );
  }

  const statusValue = seasonStatus(season, now);
  const tab: Tab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as Tab) : 'overview';

  function setTab(next: Tab) {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('tab', next);
        return p;
      },
      { replace: true },
    );
  }

  const backHref = { pathname: '/seasons', search: `?year=${season.year}` };

  return (
    <SeasonDetailContent
      dataset={dataset}
      config={config}
      season={season}
      statusValue={statusValue}
      now={now}
      tab={tab}
      setTab={setTab}
      backHref={backHref}
      locationSearch={location.search}
    />
  );
}

interface SeasonDetailContentProps {
  dataset: LeaderboardDataset;
  config: ScoringConfig;
  season: Season;
  statusValue: SeasonStatus;
  now: number;
  tab: Tab;
  setTab: (t: Tab) => void;
  backHref: { pathname: string; search: string };
  locationSearch: string;
}

function previousSeasonOf(season: Season): Season {
  return season.quarter === 1 ? seasonOf(season.year - 1, 4) : seasonOf(season.year, (season.quarter - 1) as Quarter);
}

function SeasonDetailContent({ dataset, config, season, statusValue, now, tab, setTab, backHref }: SeasonDetailContentProps) {
  const { t, locale } = useI18n();
  const clanAssignments = useClanAssignments(dataset);
  const coinLedger = useCoinLedger();

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
  const rankedTop3 = result.rows.filter((r) => r.rank != null).slice(0, 3);
  const achievementsByMember = useMemo(() => computeAllAchievements(dataset, config, [season], now), [dataset, config, season, now]);
  const rewards = useMemo(
    () => (statusValue === 'approved' ? computeSeasonRewards(dataset, config, season) : []),
    [dataset, config, season, statusValue],
  );
  // Shown even before approval (clearly labeled provisional — see AwardsTab), unlike `rewards`: Craft
  // Path distinctions are proposed recognition, not an official prize, so there's no reason to hide
  // them during a live season the way an official-sounding reward is held back until final.
  const distinctions = useMemo(
    () => (statusValue === 'upcoming' ? [] : computeSeasonDistinctions(dataset, config, season, previousSeasonOf(season))),
    [dataset, config, season, statusValue],
  );

  const seasonSearch = weekIndexes.length
    ? `?from=${weekStartISO(dataset.firstWeekStart, weekIndexes[0])}&to=${weekEndISO(dataset.firstWeekStart, weekIndexes[weekIndexes.length - 1])}`
    : '';

  const [compareIds, setCompareIds] = useState<string[]>([]);
  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }
  const selectedMembers: Member[] = compareIds.map((id) => dataset.members.find((m) => m.id === id)).filter((m): m is Member => m != null);

  const statusLabel =
    statusValue === 'approved'
      ? t('season_complete_badge')
      : statusValue === 'awaiting_approval'
        ? t('season_awaiting_approval_badge')
        : statusValue === 'upcoming'
          ? t('season_upcoming_badge')
          : t('season_current_badge');

  return (
    <>
      <DemoBanner />
      <div className={styles.crumbs}>
        <Link className={styles.backLink} to={backHref}>
          ← {t('seasons_page_title')}
        </Link>
      </div>

      <div className={styles.head} data-status={statusValue}>
        <div>
          <h1>{seasonQuarterLabel(t, season)}</h1>
          <p className={styles.range}>{formatDateRange(season.startISO, season.endISO, locale)}</p>
        </div>
        <span className={styles.statusTag} data-status={statusValue}>
          {statusLabel}
        </span>
      </div>

      <div className={styles.tabs} role="tablist" aria-label={t('seasons_page_title')}>
        {TABS.map((tb) => (
          <button
            key={tb}
            type="button"
            role="tab"
            aria-selected={tab === tb}
            className={styles.tabBtn}
            data-active={tab === tb || undefined}
            onClick={() => setTab(tb)}
          >
            {t(`season_tab_${tb}` as TranslationKey)}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'overview' && (
          <OverviewTab
            dataset={dataset}
            config={config}
            season={season}
            statusValue={statusValue}
            result={result}
            rankedTop3={rankedTop3}
            achievementsByMember={achievementsByMember}
            seasonSearch={seasonSearch}
            compareIds={compareIds}
            onToggleCompare={toggleCompare}
          />
        )}
        {tab === 'standings' && (
          <StandingsTab dataset={dataset} result={result} statusValue={statusValue} compareIds={compareIds} onToggleCompare={toggleCompare} />
        )}
        {tab === 'timeline' && <TimelineTab dataset={dataset} config={config} season={season} statusValue={statusValue} />}
        {tab === 'awards' && (
          <AwardsTab
            dataset={dataset}
            config={config}
            season={season}
            statusValue={statusValue}
            rewards={rewards}
            achievementsByMember={achievementsByMember}
            distinctions={distinctions}
            seasonSearch={seasonSearch}
            clanAssignments={clanAssignments}
            coinLedger={coinLedger}
            now={now}
          />
        )}
        {tab === 'insights' && <InsightsTab dataset={dataset} config={config} result={result} statusValue={statusValue} seasonSearch={seasonSearch} />}
      </div>

      <CompareTray selected={selectedMembers} onRemove={(id) => setCompareIds((prev) => prev.filter((x) => x !== id))} onClear={() => setCompareIds([])} />
    </>
  );
}

// ---------- Overview ----------

interface TabCommonProps {
  dataset: LeaderboardDataset;
  statusValue: SeasonStatus;
}

function OverviewTab({
  dataset,
  config,
  season,
  statusValue,
  result,
  rankedTop3,
  achievementsByMember,
  seasonSearch,
  compareIds,
  onToggleCompare,
}: TabCommonProps & {
  config: ScoringConfig;
  season: Season;
  result: ReturnType<typeof buildLeaderboard>;
  rankedTop3: LeaderboardRow[];
  achievementsByMember: ReturnType<typeof computeAllAchievements>;
  seasonSearch: string;
  compareIds: string[];
  onToggleCompare: (id: string) => void;
}) {
  const { t, locale } = useI18n();

  if (statusValue === 'upcoming') {
    return <StateMessage title={t('season_tab_overview')} body={t('season_upcoming_note')} />;
  }

  const changesNote =
    result.previousWeekIndexes && result.team.average != null && result.team.previousAverage != null
      ? t('season_detail_key_changes_line', {
          delta: formatSigned(result.team.average - result.team.previousAverage, locale),
        })
      : t('season_detail_key_changes_none');

  return (
    <div className={styles.tabBody}>
      {statusValue === 'approved' && rankedTop3.length > 0 && (
        <div className={styles.hallOfFame} key={season.id}>
          <span className={styles.hallOfFameGlyph} aria-hidden="true">
            ★
          </span>
          <div>
            <p className={styles.hallOfFameTitle}>{t('season_hall_of_fame_title')}</p>
            <p className={styles.hallOfFameLine}>
              {t('season_hall_of_fame_line', { name: rankedTop3[0].member.name, season: seasonQuarterLabel(t, season) })}
            </p>
          </div>
        </div>
      )}
      {rankedTop3.length > 0 ? (
        <Podium
          rows={rankedTop3}
          metric="overall"
          metricLabel={t('metric_overall')}
          achievementsByMember={achievementsByMember}
          dataset={dataset}
          config={config}
          seasons={[season]}
          periodFromISO={season.startISO}
          periodToISO={season.endISO}
          compareIds={compareIds}
          onToggleCompare={onToggleCompare}
        />
      ) : (
        <StateMessage title={t('season_tab_overview')} body={t('season_no_leader')} />
      )}

      <section className={styles.panel} aria-labelledby="season-team-summary-heading">
        <h2 id="season-team-summary-heading">{t('season_detail_team_summary_title')}</h2>
        <SummaryStats
          team={result.team}
          topImprovement={result.topImprovement}
          weekCount={result.weekIndexes.length}
          hasPreviousPeriod={result.previousWeekIndexes != null}
        />
      </section>

      <section className={styles.panel} aria-labelledby="season-key-changes-heading">
        <h2 id="season-key-changes-heading">{t('season_detail_key_changes_title')}</h2>
        <p className={styles.sub}>{changesNote}</p>
      </section>

      <p className={styles.linkRow}>
        <Link className={styles.viewLink} to={{ pathname: '/', search: seasonSearch }}>
          {t('view_season_leaderboard')}
        </Link>
        {statusValue === 'approved' && (
          <Link className={styles.viewLink} to={`/seasons/compare?a=${season.id}`}>
            {t('seasons_compare_title')} →
          </Link>
        )}
      </p>
    </div>
  );
}

// ---------- Standings ----------

function StandingsTab({
  result,
  statusValue,
  compareIds,
  onToggleCompare,
}: TabCommonProps & { result: ReturnType<typeof buildLeaderboard>; compareIds: string[]; onToggleCompare: (id: string) => void }) {
  const { t } = useI18n();
  const [local, setLocal] = useState<LeaderboardFilters>({
    fromISO: '',
    toISO: '',
    shift: 'all',
    area: 'all',
    role: 'all',
    metric: 'overall',
    query: '',
    sortKey: 'rank',
    sortDir: 'asc',
    view: 'table',
    board: 'solo',
  });

  function updateLocal(patch: Partial<Record<keyof LeaderboardFilters, string>>) {
    setLocal((prev) => {
      const next = { ...prev };
      if (patch.query !== undefined) next.query = patch.query;
      if (patch.sortKey !== undefined) next.sortKey = patch.sortKey as SortKey;
      if (patch.sortDir !== undefined) next.sortDir = (patch.sortDir === 'desc' ? 'desc' : 'asc') as SortDirection;
      if (patch.metric !== undefined) next.metric = patch.metric as MetricKey;
      if (patch.view !== undefined) next.view = patch.view === 'cards' ? 'cards' : 'table';
      return next;
    });
  }

  if (statusValue === 'upcoming') {
    return <StateMessage title={t('season_detail_standings_title')} body={t('season_upcoming_note')} />;
  }

  const shown = sortRows(filterRowsByQuery(result.rows, local.query), local.sortKey, local.sortDir);

  return (
    <div className={styles.tabBody}>
      <label className={styles.searchField}>
        <span className="fieldLabel">{t('search_label')}</span>
        <input className="input" type="search" value={local.query} onChange={(e) => updateLocal({ query: e.target.value })} placeholder={t('search_placeholder')} />
      </label>

      <section className={styles.panel}>
        <BoardToolbar
          filters={local}
          onChange={updateLocal}
          shownCount={shown.length}
          totalCount={result.rows.length}
          heading={t('season_detail_standings_title')}
          canFindMe={false}
          onFindMe={() => {}}
        />
        {shown.length === 0 ? (
          <StateMessage title={t('state_empty_title')} body={t('state_empty_body')} dashed={false} />
        ) : local.view === 'table' ? (
          <>
            <div className={styles.desktopOnly}>
              <LeaderboardTable rows={shown} team={result.team} filters={local} onChange={updateLocal} compareIds={compareIds} onToggleCompare={onToggleCompare} />
            </div>
            <div className={styles.mobileOnly}>
              <LeaderboardCards rows={shown} team={result.team} compareIds={compareIds} onToggleCompare={onToggleCompare} />
            </div>
          </>
        ) : (
          <LeaderboardCards rows={shown} team={result.team} compareIds={compareIds} onToggleCompare={onToggleCompare} />
        )}
      </section>
    </div>
  );
}

// ---------- Timeline ----------

function TimelineTab({ dataset, config, season, statusValue }: TabCommonProps & { config: ScoringConfig; season: Season }) {
  const { t, locale } = useI18n();
  const [params, setParams] = useSearchParams();
  const [playing, setPlaying] = useState(false);

  const weeks = useMemo(() => seasonWeeks(dataset, season), [dataset, season]);
  const maxOffset = Math.max(0, weeks.length - 1);
  const rawWeek = Number(params.get('week'));
  const offset = Number.isFinite(rawWeek) ? Math.min(Math.max(0, Math.trunc(rawWeek)), maxOffset) : maxOffset;

  function setOffset(next: number) {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('tab', 'timeline');
        p.set('week', String(Math.min(Math.max(0, next), maxOffset)));
        return p;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    if (!playing) return;
    if (offset >= maxOffset) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setOffset(offset + 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, offset, maxOffset]);

  if (statusValue === 'upcoming' || !weeks.length) {
    return <StateMessage title={t('season_tab_timeline')} body={t('season_detail_timeline_no_data')} />;
  }

  const snap = snapshotAt(dataset, config, season, offset);
  const changes = computeWeekChanges(dataset, config, season, offset);
  const caption = deriveCaption(changes, dataset.members, offset);
  const rowsByRank = snap ? [...snap.result.rows].filter((r) => r.rank != null).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)) : [];
  const offsetSearch = weeks.length
    ? `?from=${weekStartISO(dataset.firstWeekStart, weeks[0])}&to=${weekEndISO(dataset.firstWeekStart, weeks[offset])}`
    : '';

  return (
    <div className={styles.tabBody}>
      <section className={styles.panel} aria-labelledby="season-timeline-heading">
        <h2 id="season-timeline-heading">{t('season_tab_timeline')}</h2>
        <p className={styles.sub}>{t('season_detail_timeline_subtitle')}</p>

        <div className={styles.timelineControls}>
          <button
            type="button"
            className="btn"
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={playing}
            disabled={offset >= maxOffset && !playing}
          >
            <span aria-hidden="true">{playing ? '⏸' : '▶'}</span> {playing ? t('time_machine_pause') : t('time_machine_play')}
          </button>
          <input
            type="range"
            min={0}
            max={maxOffset}
            step={1}
            value={offset}
            onChange={(e) => {
              setPlaying(false);
              setOffset(Number(e.target.value));
            }}
            aria-label={t('time_machine_week_label')}
            className={styles.slider}
          />
          <span className={`${styles.weekLabel} tabular`}>
            {t('time_machine_week_n', { n: offset + 1, total: maxOffset + 1 })} · {snap ? formatShortDate(snap.dateISO) : ''}
          </span>
        </div>

        <p key={offset} className={styles.caption} aria-live="polite">
          {formatTimeMachineCaption(caption, dataset.members, t, locale)}
        </p>
      </section>

      <section className={styles.panel} aria-labelledby="season-timeline-standings-heading">
        <h2 id="season-timeline-standings-heading">{t('time_machine_week_n', { n: offset + 1, total: maxOffset + 1 })}</h2>
        <ol className={styles.timelineList}>
          {rowsByRank.map((row) => {
            const change = changes.find((c) => c.memberId === row.member.id);
            return (
              <li key={row.member.id} className={styles.timelineRow}>
                <span className={`${styles.rank} tabular`}>{row.rank}</span>
                <Avatar id={row.member.id} name={row.member.name} photoUrl={row.member.avatarPhoto} size={28} />
                <Link className={styles.memberLink} to={{ pathname: `/member/${row.member.id}`, search: offsetSearch }}>
                  {row.member.name}
                </Link>
                {change && <MoveBadge move={change.rankMove} />}
                <span className={`${styles.score} tabular`}>{formatScore(row.current.overall, locale)}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

// ---------- Awards ----------

function AwardsTab({
  dataset,
  config,
  season,
  statusValue,
  rewards,
  achievementsByMember,
  distinctions,
  seasonSearch,
  clanAssignments,
  coinLedger,
  now,
}: TabCommonProps & {
  config: ScoringConfig;
  season: Season;
  rewards: ReturnType<typeof computeSeasonRewards>;
  achievementsByMember: ReturnType<typeof computeAllAchievements>;
  distinctions: SeasonDistinction[];
  seasonSearch: string;
  clanAssignments: Record<string, ClanId>;
  coinLedger: CoinLedger;
  now: number;
}) {
  const { t } = useI18n();
  const [revealPlayKey, setRevealPlayKey] = useState(0);

  if (statusValue === 'upcoming') {
    return <StateMessage title={t('season_tab_awards')} body={t('season_upcoming_note')} />;
  }

  const note =
    statusValue === 'approved'
      ? t('season_detail_awards_finalized_note')
      : statusValue === 'awaiting_approval'
        ? t('season_detail_awards_pending_note')
        : t('season_detail_awards_prospective_note');

  const earnedRows = dataset.members
    .map((m) => ({ member: m, earned: (achievementsByMember[m.id] ?? []).filter((e) => e.seasonId === season.id) }))
    .filter((r) => r.earned.length > 0);

  return (
    <div className={styles.tabBody}>
      <section className={styles.panel}>
        <h2>{t('season_tab_awards')}</h2>
        <p className={styles.sub}>{note}</p>

        {rewards.length === 0 && earnedRows.length === 0 ? (
          <StateMessage title={t('season_tab_awards')} body={t('season_detail_awards_none')} dashed={false} />
        ) : (
          <>
            {rewards.length > 0 && (
              <div className={styles.winnersGrid}>
                {rewards.map((r) => {
                  const member = dataset.members.find((m) => m.id === r.memberId);
                  if (!member) return null;
                  return (
                    <Link
                      key={`${r.rewardId}-${r.memberId}`}
                      className={styles.winnerCard}
                      to={{ pathname: `/member/${member.id}`, search: seasonSearch }}
                    >
                      <span className={styles.winnerGlyph} aria-hidden="true">
                        {REWARD_GLYPHS[r.rewardId]}
                      </span>
                      <Avatar id={member.id} name={member.name} photoUrl={member.avatarPhoto} size={34} />
                      <div>
                        <div className={styles.winnerReward}>{t(`reward_${r.rewardId}_title` as TranslationKey)}</div>
                        <div className={styles.winnerName}>{member.name}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {earnedRows.length > 0 && (
              <ul className={styles.badgeList}>
                {earnedRows.map(({ member, earned }) => (
                  <li key={member.id} className={styles.badgeRow}>
                    <Avatar id={member.id} name={member.name} photoUrl={member.avatarPhoto} size={26} />
                    <Link className={styles.memberLink} to={{ pathname: `/member/${member.id}`, search: seasonSearch }}>
                      {member.name}
                    </Link>
                    <span className={styles.badgeGlyphs}>
                      {earnedAchievementTypes(earned).map((id) => (
                        <span key={id} title={`${t(`achievement_${id}_title` as TranslationKey)}${countOf(earned, id) > 1 ? ` ×${countOf(earned, id)}` : ''}`}>
                          {ACHIEVEMENT_GLYPHS[id]}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section className={styles.panel}>
        <h2>{t('coins_awarded_heading')}</h2>
        <p className={styles.sub}>{t('coins_disclaimer')}</p>
        {statusValue !== 'approved' ? (
          <p className={styles.sub}>{t('coins_pending_note')}</p>
        ) : !coinLedger.isSeasonFinalized(season.id) ? (
          <>
            <p className={styles.sub}>{t('coins_finalize_help')}</p>
            <button
              type="button"
              className="btn btnPrimary"
              onClick={() => {
                coinLedger.finalizeSeason(dataset, config, clanAssignments, season, previousSeasonOf(season), now);
                setRevealPlayKey((k) => k + 1);
              }}
            >
              {t('coins_finalize_button')}
            </button>
          </>
        ) : (
          <>
            <p className={styles.sub}>
              {t('coins_finalized_note')}{' '}
              <button type="button" className={styles.linkBtn} onClick={() => setRevealPlayKey((k) => k + 1)}>
                {t('coins_replay_reveal')}
              </button>
            </p>
            <CoinAwardsReveal
              season={season}
              dataset={dataset}
              transactions={coinLedger.transactions.filter((tx) => tx.seasonId === season.id)}
              playKey={`${season.id}:${revealPlayKey}`}
            />
          </>
        )}
      </section>

      <section className={styles.panel}>
        <h2>{t('craft_distinctions_heading')}</h2>
        <p className={styles.sub}>{t('craft_distinctions_subtitle')}</p>
        {statusValue !== 'approved' && distinctions.length > 0 && <p className={styles.sub}>{t('craft_distinctions_provisional_note')}</p>}
        {distinctions.length === 0 ? (
          <StateMessage title={t('craft_distinctions_heading')} body={t('craft_distinctions_none')} dashed={false} />
        ) : (
          <div className={styles.winnersGrid}>
            {distinctions.map((d) => {
              const member = dataset.members.find((m) => m.id === d.memberId);
              if (!member) return null;
              return (
                <Link
                  key={`${d.id}-${d.memberId}`}
                  className={styles.winnerCard}
                  to={{ pathname: `/member/${member.id}`, search: seasonSearch }}
                  title={t(`craft_distinction_${d.id}_desc` as TranslationKey)}
                >
                  <span className={styles.winnerGlyph} aria-hidden="true">
                    ★
                  </span>
                  <Avatar id={member.id} name={member.name} photoUrl={member.avatarPhoto} size={34} />
                  <div>
                    <div className={styles.winnerReward}>{t(`craft_distinction_${d.id}_title` as TranslationKey)}</div>
                    <div className={styles.winnerName}>{member.name}</div>
                    <div className={styles.winnerDesc}>{t(`craft_distinction_${d.id}_desc` as TranslationKey)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------- Insights ----------

function InsightsTab({
  config,
  result,
  statusValue,
  seasonSearch,
}: TabCommonProps & { config: ScoringConfig; result: ReturnType<typeof buildLeaderboard>; seasonSearch: string }) {
  const { t, locale } = useI18n();

  if (statusValue === 'upcoming') {
    return <StateMessage title={t('season_tab_insights')} body={t('season_upcoming_note')} />;
  }

  const categoryLeaders = CATEGORY_KEYS.map((c) => {
    const candidates = result.rows.filter((r) => r.current.categories[c] != null);
    const row = candidates.length
      ? candidates.reduce((best, r) => ((r.current.categories[c] ?? -Infinity) > (best.current.categories[c] ?? -Infinity) ? r : best))
      : null;
    return { category: c, row };
  });

  const consistent = [...result.rows]
    .filter((r) => r.trend.filter((v) => v != null).length >= 2)
    .map((r) => {
      const vals = r.trend.filter((v): v is number => v != null);
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
      return { row: r, stdDev: Math.sqrt(variance) };
    })
    .sort((a, b) => a.stdDev - b.stdDev)
    .slice(0, 3);

  return (
    <div className={styles.tabBody}>
      <section className={styles.panel}>
        <h2>{t('season_detail_insight_strongest_category_title')}</h2>
        <p className={styles.sub}>{t('season_detail_insight_strongest_category_criteria')}</p>
        <ul className={styles.insightList}>
          {categoryLeaders.map(({ category, row }) =>
            row ? (
              <li key={category} className={styles.insightRow}>
                <span className={styles.insightCategory}>{categoryLabel(t, category)}</span>
                <Avatar id={row.member.id} name={row.member.name} photoUrl={row.member.avatarPhoto} size={24} />
                <Link className={styles.memberLink} to={{ pathname: `/member/${row.member.id}`, search: seasonSearch }}>
                  {row.member.name}
                </Link>
                <b className="tabular">{formatScore(row.current.categories[category], locale)}%</b>
              </li>
            ) : (
              <li key={category} className={styles.insightRow}>
                <span className={styles.insightCategory}>{categoryLabel(t, category)}</span>
                <span className={styles.sub}>{t('missing_value')}</span>
              </li>
            ),
          )}
        </ul>
      </section>

      <section className={styles.panel}>
        <h2>{t('season_detail_insight_consistent_title')}</h2>
        <p className={styles.sub}>{t('season_detail_insight_consistent_criteria')}</p>
        {consistent.length === 0 ? (
          <p className={styles.sub}>{t('season_detail_insight_no_data')}</p>
        ) : (
          <ul className={styles.insightList}>
            {consistent.map(({ row, stdDev }) => (
              <li key={row.member.id} className={styles.insightRow}>
                <Avatar id={row.member.id} name={row.member.name} photoUrl={row.member.avatarPhoto} size={24} />
                <Link className={styles.memberLink} to={{ pathname: `/member/${row.member.id}`, search: seasonSearch }}>
                  {row.member.name}
                </Link>
                <span className={styles.sub}>{roleLabel(t, row.member.role)}</span>
                <b className="tabular">±{stdDev.toFixed(1)}</b>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.panel}>
        <h2>{t('season_detail_insight_team_trend_title')}</h2>
        <p className={styles.sub}>{t('season_detail_insight_team_trend_criteria')}</p>
        <p className={styles.statLine} style={{ color: zoneColorVar(zoneOf(result.team.average, config)) }}>
          {formatScore(result.team.average, locale)} <small>/100</small>
        </p>
        {result.previousWeekIndexes && result.team.previousAverage != null && result.team.average != null && (
          <p className={styles.sub}>{t('season_detail_key_changes_line', { delta: formatSigned(result.team.average - result.team.previousAverage, locale) })}</p>
        )}
      </section>
    </div>
  );
}
