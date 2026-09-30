import type { CSSProperties } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { EarnedAchievement, LeaderboardDataset, RewardId, ScoringConfig } from '../../data/types';
import type { LeaderboardRow } from '../../lib/scoring';
import { computeHighlight } from '../../lib/scoring';
import { bestAchievement } from '../../lib/achievements';
import { computeSeasonRewards } from '../../lib/rewards';
import { medalFor } from '../../lib/zoneStyle';
import type { Season } from '../../lib/seasons';
import { isSeasonApproved } from '../../lib/seasons';
import { categoryLabel, roleLabel, useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import { formatScore } from '../../lib/format';
import { Avatar } from '../common/Avatar';
import { MoveBadge } from '../common/MoveBadge';
import { CompareToggle } from './CompareToggle';
import { PodiumCard, type PodiumEmblem } from './PodiumCard';
import { ACHIEVEMENT_GLYPHS } from '../../lib/achievements';
import { REWARD_GLYPHS } from '../member/RewardBadge';
import styles from './TopFive.module.css';

interface TopFiveProps {
  /** Rows already ranked by overallRank (from useOverallLeaderboardResult), sliced to however many are
   * actually ranked — never more than 5, but can be fewer for a brand-new season. */
  rows: LeaderboardRow[];
  dataset: LeaderboardDataset;
  config: ScoringConfig;
  matchedSeason: Season | null;
  achievementsByMember?: Record<string, EarnedAchievement[]>;
  /** e.g. "Site 2" or "Shift 1" when a shift/area filter narrows who's eligible — shown in the heading
   * so a narrowed top five is never mistaken for the whole season's winners. */
  filterLabel: string | null;
  compareIds: string[];
  onToggleCompare: (id: string) => void;
}

const REWARD_PRIORITY: readonly RewardId[] = ['place_1', 'place_2', 'place_3', 'most_improved'];

/**
 * The results-first hero's main event: #1 as a full podium-style centerpiece, #2–5 as a lighter
 * "supporting" row. Always built from the overall-ranked result (never whatever metric the table
 * explorer happens to be sorted/displayed by), so this never silently disagrees with who the
 * season's actual top performers are. Remounts (and replays its entrance animation) whenever the
 * matched season identity changes, via the `key` its parent puts on it.
 */
export function TopFive({ rows, dataset, config, matchedSeason, achievementsByMember, filterLabel, compareIds, onToggleCompare }: TopFiveProps) {
  const { t } = useI18n();

  const approved = matchedSeason ? isSeasonApproved(matchedSeason) : false;
  const rewardByMember: Record<string, RewardId> = {};
  if (matchedSeason && approved) {
    const rewards = computeSeasonRewards(dataset, config, matchedSeason);
    for (const id of REWARD_PRIORITY) {
      for (const r of rewards) {
        if (r.rewardId === id && !rewardByMember[r.memberId]) rewardByMember[r.memberId] = id;
      }
    }
  }

  function emblemFor(memberId: string): PodiumEmblem {
    const rewardId = rewardByMember[memberId];
    if (rewardId) return { kind: 'reward', id: rewardId };
    const achievement = bestAchievement(achievementsByMember?.[memberId] ?? []);
    return achievement ? { kind: 'achievement', id: achievement.id } : null;
  }

  if (!rows.length) {
    return (
      <section className={styles.section} aria-labelledby="top-five-heading">
        <h2 id="top-five-heading">{filterLabel ? t('top_five_heading_filtered', { filter: filterLabel }) : t('top_five_heading')}</h2>
        <p className={styles.empty}>{t('top_five_empty')}</p>
      </section>
    );
  }

  const [first, ...rest] = rows;

  return (
    <section className={styles.section} aria-labelledby="top-five-heading">
      <h2 id="top-five-heading" className={styles.heading}>
        {filterLabel ? t('top_five_heading_filtered', { filter: filterLabel }) : t('top_five_heading')}
      </h2>

      <div className={styles.layout} key={matchedSeason?.id ?? 'custom'}>
        <div className={styles.centerpiece} style={{ '--i': 0 } as CSSProperties}>
          <PodiumCard
            row={first}
            place={1}
            metric="overall"
            metricLabel={t('metric_overall')}
            emblem={emblemFor(first.member.id)}
            compareSelected={compareIds.includes(first.member.id)}
            onToggleCompare={() => onToggleCompare(first.member.id)}
          />
        </div>

        {rest.length > 0 && (
          <ul className={styles.supportGrid}>
            {rest.map((row, idx) => (
              <li key={row.member.id} style={{ '--i': idx + 1 } as CSSProperties}>
                <SupportingCard
                  row={row}
                  emblem={emblemFor(row.member.id)}
                  compareSelected={compareIds.includes(row.member.id)}
                  onToggleCompare={() => onToggleCompare(row.member.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

interface SupportingCardProps {
  row: LeaderboardRow;
  emblem: PodiumEmblem;
  compareSelected: boolean;
  onToggleCompare: () => void;
}

function SupportingCard({ row, emblem, compareSelected, onToggleCompare }: SupportingCardProps) {
  const { t, locale } = useI18n();
  const location = useLocation();
  const highlight = computeHighlight(row.current, row.previous);
  const memberHref = { pathname: `/member/${row.member.id}`, search: location.search };
  const emblemGlyph = emblem ? (emblem.kind === 'reward' ? REWARD_GLYPHS[emblem.id] : ACHIEVEMENT_GLYPHS[emblem.id]) : null;
  const emblemTitle = emblem
    ? emblem.kind === 'reward'
      ? `${t(`reward_${emblem.id}_title` as TranslationKey)} (${t('podium_emblem_demo')})`
      : t(`achievement_${emblem.id}_title` as TranslationKey)
    : null;

  return (
    <article className={styles.card} data-compare-selected={compareSelected || undefined}>
      <CompareToggle selected={compareSelected} name={row.member.name} onToggle={onToggleCompare} className={styles.compareBtn} />
      <Link
        to={memberHref}
        className={styles.cardLink}
        aria-label={`${t('open_profile')}: ${row.member.name}, ${t('rank_label')} ${row.overallRank}, ${formatScore(row.current.overall, locale)}/100`}
      >
        <div className={styles.avatarWrap}>
          <Avatar id={row.member.id} name={row.member.name} photoUrl={row.member.avatarPhoto} size={56} />
          <span className={`${styles.rankNum} tabular`} data-medal={medalFor(row.overallRank)}>
            <span className="visually-hidden">{t('rank_label')} </span>#{row.overallRank}
          </span>
          {emblem && emblemGlyph && (
            <span className={styles.emblem} title={emblemTitle ?? undefined}>
              {emblemGlyph}
            </span>
          )}
        </div>

        <h3 className={styles.name}>{row.member.name}</h3>
        <p className={styles.sub}>
          {roleLabel(t, row.member.role)} · {row.member.area} · {row.member.shift}
        </p>

        <div className={styles.scoreRow}>
          <b className="tabular">{formatScore(row.current.overall, locale)}</b>
          <span className={styles.scoreUnit}>/100</span>
          <MoveBadge move={row.overallMove} />
        </div>

        <p className={styles.highlight}>
          {highlight.strongest
            ? t('highlight_strong', { category: categoryLabel(t, highlight.strongest.category), value: Math.round(highlight.strongest.value) })
            : t('highlight_none')}
        </p>
      </Link>
    </article>
  );
}
