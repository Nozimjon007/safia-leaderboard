import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
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
  /** True only during a genuine reveal moment (first-ever view of this season, or an explicit
   * replay) — see useSeasonReveal. Everywhere else the cards just appear in their resting state. */
  shouldAnimateReveal: boolean;
  /** Changes exactly when a fresh play should start (new season, or replay) — used as the `key` on
   * the animated subtree so Motion remounts it and its entrance transitions actually run again. */
  playKey: string;
}

const REWARD_PRIORITY: readonly RewardId[] = ['place_1', 'place_2', 'place_3', 'most_improved'];

// Reveal timing: the season status badge (SeasonPanel) gets roughly this long to land before the
// cards start — there's no direct handoff between the two components, just a shared fixed offset,
// which is enough to read as one sequence without coupling their internals together.
const CARDS_START_S = 0.4;
const CARD_STAGGER_S = 0.12;
const CARD_DURATION_S = 0.42;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * The results-first hero's main event: #1 as a full podium-style centerpiece, #2–5 as a lighter
 * "supporting" row. Always built from the overall-ranked result (never whatever metric the table
 * explorer happens to be sorted/displayed by), so this never silently disagrees with who the
 * season's actual top performers are.
 */
export function TopFive({
  rows,
  dataset,
  config,
  matchedSeason,
  achievementsByMember,
  filterLabel,
  compareIds,
  onToggleCompare,
  shouldAnimateReveal,
  playKey,
}: TopFiveProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const playEntrance = shouldAnimateReveal && !reduceMotion;

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
  // Reveal order is #5 -> #2 (building anticipation), the champion last: `rest[0]` is rank 2 and
  // `rest[rest.length-1]` is the lowest-ranked supporting card, so array index 0 must animate LAST
  // among the supporting group.
  const championDelay = CARDS_START_S + rest.length * CARD_STAGGER_S;

  return (
    <section className={styles.section} aria-labelledby="top-five-heading">
      <h2 id="top-five-heading" className={styles.heading}>
        {filterLabel ? t('top_five_heading_filtered', { filter: filterLabel }) : t('top_five_heading')}
      </h2>

      <div className={styles.layout} key={playKey}>
        <motion.div
          className={styles.centerpiece}
          initial={playEntrance ? { opacity: 0, y: 34, scale: 0.9 } : false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={playEntrance ? { delay: championDelay, type: 'spring', stiffness: 240, damping: 22, mass: 0.9 } : { duration: 0 }}
        >
          <PodiumCard
            row={first}
            place={1}
            metric="overall"
            metricLabel={t('metric_overall')}
            emblem={emblemFor(first.member.id)}
            compareSelected={compareIds.includes(first.member.id)}
            onToggleCompare={() => onToggleCompare(first.member.id)}
            celebrateDelay={playEntrance ? championDelay + 0.45 : undefined}
          />
        </motion.div>

        {rest.length > 0 && (
          <ul className={styles.supportGrid}>
            {rest.map((row, idx) => {
              const orderFromLast = rest.length - 1 - idx; // idx0 (#2) goes last among supporting cards
              const delay = CARDS_START_S + orderFromLast * CARD_STAGGER_S;
              return (
                <motion.li
                  key={row.member.id}
                  initial={playEntrance ? { opacity: 0, y: 22 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={playEntrance ? { delay, duration: CARD_DURATION_S, ease: EASE_OUT } : { duration: 0 }}
                >
                  <SupportingCard
                    row={row}
                    emblem={emblemFor(row.member.id)}
                    compareSelected={compareIds.includes(row.member.id)}
                    onToggleCompare={() => onToggleCompare(row.member.id)}
                  />
                </motion.li>
              );
            })}
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
