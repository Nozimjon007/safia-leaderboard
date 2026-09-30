import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { LeaderboardDataset, ScoringConfig } from '../data/types';
import { useDatasetContext } from '../state/DatasetProvider';
import { useScoringConfig } from '../state/ScoringConfigProvider';
import { useLeaderboardFilters } from '../hooks/useLeaderboardFilters';
import { useSeasons } from '../hooks/useSeasons';
import { useClanAssignments } from '../hooks/useClans';
import { buildLeaderboard, type LeaderboardRow } from '../lib/scoring';
import { formatShortDate, weekIndexesInRange } from '../lib/dates';
import { findContainingSeason, type Season } from '../lib/seasons';
import { CLAN_IDS, type ClanId } from '../lib/clans';
import {
  computeClanContributionEvents,
  computeClanRoster,
  computeClanStandings,
  type ClanContributionEvent,
  type ClanMemberContribution,
} from '../lib/clanPoints';
import { clanIdentity, clanName, roleIcon, roleLabel, useI18n, type TFunction } from '../i18n';
import type { TranslationKey } from '../i18n/locales/en';
import { medalFor } from '../lib/zoneStyle';
import { DemoBanner } from '../components/common/DemoBanner';
import { StateMessage } from '../components/common/StateMessage';
import { LeaderboardSkeleton } from '../components/leaderboard/LeaderboardSkeleton';
import { Avatar } from '../components/common/Avatar';
import { MoveBadge } from '../components/common/MoveBadge';
import { ClanCrest } from '../components/common/ClanCrest';
import styles from './ClanDetailPage.module.css';

function isClanId(v: string | undefined): v is ClanId {
  return v != null && (CLAN_IDS as readonly string[]).includes(v);
}

function reasonLabel(t: TFunction, event: ClanContributionEvent): string {
  if (event.reason === 'clan_mission' && event.missionId) return t(`clan_mission_${event.missionId}_name` as TranslationKey);
  if (event.reason === 'quality_achievement' && event.achievementId) return t(`achievement_${event.achievementId}_title` as TranslationKey);
  return t(`clan_reason_${event.reason}` as TranslationKey);
}

export function ClanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const location = useLocation();
  const { status, dataset, error, reload } = useDatasetContext();
  const { filters } = useLeaderboardFilters(dataset);
  const { config } = useScoringConfig();
  const seasonsInfo = useSeasons(dataset);
  const clanAssignments = useClanAssignments(dataset);
  const [query, setQuery] = useState('');
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

  if (status === 'loading' || !dataset || !seasonsInfo) {
    return (
      <>
        <DemoBanner />
        <LeaderboardSkeleton />
      </>
    );
  }

  const clanId = isClanId(id) ? id : null;
  if (!clanId) {
    return (
      <>
        <div className={styles.crumbs}>
          <Link className={styles.backLink} to={backHref}>
            {t('back_to_clans')}
          </Link>
        </div>
        <StateMessage title={t('not_found_title')} body={error ?? undefined} />
      </>
    );
  }

  const matchedSeason = findContainingSeason(dataset, seasonsInfo.seasons, filters.fromISO, filters.toISO);
  const season = matchedSeason ?? seasonsInfo.currentSeason;
  const seasonIdx = seasonsInfo.seasons.findIndex((s) => s.id === season.id);
  const previousSeason = seasonIdx > 0 ? seasonsInfo.seasons[seasonIdx - 1] : null;

  return (
    <ClanDetailContent
      key={`${clanId}:${season.id}`}
      clanId={clanId}
      season={season}
      previousSeason={previousSeason}
      dataset={dataset}
      config={config}
      clanAssignments={clanAssignments}
      backHref={backHref}
      query={query}
      onQueryChange={setQuery}
    />
  );
}

interface ClanDetailContentProps {
  clanId: ClanId;
  season: Season;
  previousSeason: Season | null;
  dataset: LeaderboardDataset;
  config: ScoringConfig;
  clanAssignments: Record<string, ClanId>;
  backHref: { pathname: string; search: string };
  query: string;
  onQueryChange: (q: string) => void;
}

function ClanDetailContent({ clanId, season, previousSeason, dataset, config, clanAssignments, backHref, query, onQueryChange }: ClanDetailContentProps) {
  const { t, locale } = useI18n();

  const standing = useMemo(
    () => computeClanStandings(dataset, config, clanAssignments, CLAN_IDS, season, previousSeason).find((s) => s.clanId === clanId) ?? null,
    [dataset, config, clanAssignments, season, previousSeason, clanId],
  );

  const roster = useMemo(() => {
    const events = computeClanContributionEvents(dataset, config, season);
    return computeClanRoster(dataset, clanAssignments, clanId, events);
  }, [dataset, config, clanAssignments, season, clanId]);

  const soloRankByMember = useMemo(() => {
    const weekIndexes = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, season.startISO, season.endISO);
    const result = buildLeaderboard({ members: dataset.members, scores: dataset.scores, weekIndexes, weekCount: dataset.weekCount, metric: 'overall', config });
    const byId: Record<string, LeaderboardRow> = {};
    for (const row of result.rows) byId[row.member.id] = row;
    return byId;
  }, [dataset, config, season]);

  const filteredRoster = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((r) => r.member.name.toLowerCase().includes(q) || roleLabel(t, r.member.role).toLowerCase().includes(q));
  }, [roster, query, t]);

  if (!standing) return null; // clanId is always one of CLAN_IDS, so computeClanStandings always includes it

  return (
    <>
      <DemoBanner />
      <div className={styles.crumbs}>
        <Link className={styles.backLink} to={backHref}>
          {t('back_to_clans')}
        </Link>
      </div>

      <header className={styles.header} data-clan={clanId}>
        <ClanCrest clanId={clanId} size={64} />
        <div>
          <h1 className={styles.name}>{clanName(t, clanId)}</h1>
          <p className={styles.identity}>{clanIdentity(t, clanId)}</p>
        </div>
      </header>
      <p className={styles.disclaimer}>
        {t('clan_disclaimer')} {t('clan_points_disclaimer')}
      </p>

      <section className={styles.stats} aria-label={t('clan_standings_heading')}>
        <div className={styles.stat}>
          <span className={`${styles.statNum} tabular`} data-medal={medalFor(standing.rank)}>
            #{standing.rank}
          </span>
          <span className={styles.statLabel}>{t('clan_rank_label')}</span>
        </div>
        <div className={styles.stat}>
          <span className="tabular">{standing.totalPoints.toLocaleString(locale)}</span>
          <span className={styles.statLabel}>{t('clan_points_total_label')}</span>
        </div>
        <div className={styles.stat}>
          <span className="tabular">{standing.averagePoints.toLocaleString(locale, { maximumFractionDigits: 1 })}</span>
          <span className={styles.statLabel}>{t('clan_points_avg_label')}</span>
        </div>
        <div className={styles.stat}>
          <MoveBadge move={standing.move} />
          <span className={styles.statLabel}>{t('sort_move')}</span>
        </div>
        <div className={styles.stat}>
          <span className="tabular">{standing.memberCount}</span>
          <span className={styles.statLabel}>{t('clan_members_count', { n: standing.memberCount })}</span>
        </div>
      </section>
      <p className={styles.pipelineNote}>{t('clan_pipeline_note')}</p>

      <section aria-labelledby="clan-roster-heading">
        <div className={styles.rosterHead}>
          <h2 id="clan-roster-heading">{t('clan_roster_heading')}</h2>
          <input
            type="search"
            className={styles.search}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t('clan_roster_search_placeholder')}
            aria-label={t('clan_roster_search_placeholder')}
          />
        </div>

        {filteredRoster.length === 0 ? (
          <StateMessage title={t('clan_roster_empty')} dashed={false} />
        ) : (
          <ul className={styles.roster}>
            {filteredRoster.map((r) => (
              <RosterRow key={r.member.id} contribution={r} soloRow={soloRankByMember[r.member.id] ?? null} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

interface RosterRowProps {
  contribution: ClanMemberContribution;
  soloRow: LeaderboardRow | null;
}

function RosterRow({ contribution, soloRow }: RosterRowProps) {
  const { t, locale } = useI18n();
  const { member, totalPoints, events } = contribution;
  const memberHref = { pathname: `/member/${member.id}` };
  const sortedEvents = [...events].sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  return (
    <li className={styles.row}>
      <div className={styles.rowHead}>
        <Avatar id={member.id} name={member.name} photoUrl={member.avatarPhoto} size={40} />
        <div className={styles.who}>
          <Link to={memberHref} className={styles.memberName}>
            {member.name}
          </Link>
          <small>
            <span aria-hidden="true">{roleIcon(member.role)}</span> {roleLabel(t, member.role)}
          </small>
        </div>
        <div className={styles.rowStats}>
          <div className={styles.rowStat}>
            <b className="tabular">{totalPoints.toLocaleString(locale)}</b>
            <span>{t('clan_roster_points_col')}</span>
          </div>
          <div className={styles.rowStat}>
            <b className="tabular">{soloRow?.overallRank != null ? `#${soloRow.overallRank}` : '—'}</b>
            <span>{t('clan_roster_solo_rank_col')}</span>
          </div>
        </div>
      </div>
      <details className={styles.activity}>
        <summary>{t('clan_activity_show', { n: events.length })}</summary>
        {sortedEvents.length === 0 ? (
          <p className={styles.activityEmpty}>{t('clan_activity_empty')}</p>
        ) : (
          <ul className={styles.activityList}>
            {sortedEvents.map((e, i) => (
              <li key={i}>
                <span className={styles.activityReason}>{reasonLabel(t, e)}</span>
                <span className={`${styles.activityPoints} tabular`}>+{e.points}</span>
                <span className={styles.activityDate}>{formatShortDate(e.dateISO)}</span>
              </li>
            ))}
          </ul>
        )}
      </details>
    </li>
  );
}
