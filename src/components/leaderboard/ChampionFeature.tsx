import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { CATEGORY_KEYS, type AchievementId, type EarnedAchievement, type RewardId } from '../../data/types';
import type { LeaderboardRow, TeamStats } from '../../lib/scoring';
import type { ClanId } from '../../lib/clans';
import { ACHIEVEMENT_GLYPHS } from '../../lib/achievements';
import { REWARD_GLYPHS } from '../member/RewardBadge';
import { categoryLabel, useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import { formatScore } from '../../lib/format';
import { usePointerTilt } from '../../hooks/usePointerTilt';
import { MoveBadge } from '../common/MoveBadge';
import { PortraitFallback } from '../common/PortraitFallback';
import { JobPanel } from '../common/JobPanel';
import { CompareToggle } from './CompareToggle';
import { WhyThisRank } from './WhyThisRank';
import styles from './ChampionFeature.module.css';

export type ChampionEmblem = { kind: 'reward'; id: RewardId } | { kind: 'achievement'; id: AchievementId } | null;

interface ChampionFeatureProps {
  row: LeaderboardRow;
  clanId: ClanId | null;
  emblem: ChampionEmblem;
  team: TeamStats;
  achievements: EarnedAchievement[];
  compareSelected: boolean;
  onToggleCompare: () => void;
  /** Seconds to wait before playing a one-time restrained sheen sweep, timed to land exactly when
   * this card finishes its own season-reveal entrance (see TopFive). Undefined outside a genuine
   * reveal moment — this never loops or replays on its own. */
  celebrateDelay?: number;
}

/**
 * The season's #1 — a wide, editorial "champion feature" rather than a tall trading card, so the
 * job identity (title, one-line description, site, clan) sits directly beside the portrait instead
 * of spilling below it. Real photo when available; otherwise PortraitFallback fills the frame with
 * an intentional design, never an empty cavity or a generic silhouette.
 */
export function ChampionFeature({ row, clanId, emblem, team, achievements, compareSelected, onToggleCompare, celebrateDelay }: ChampionFeatureProps) {
  const { t, locale } = useI18n();
  const location = useLocation();
  const tiltRef = usePointerTilt<HTMLElement>();
  const profileHref = { pathname: `/member/${row.member.id}`, search: location.search };

  const emblemGlyph = emblem ? (emblem.kind === 'reward' ? REWARD_GLYPHS[emblem.id] : ACHIEVEMENT_GLYPHS[emblem.id]) : null;
  const emblemTitle = emblem
    ? emblem.kind === 'reward'
      ? `${t(`reward_${emblem.id}_title` as TranslationKey)} (${t('podium_emblem_demo')})`
      : t(`achievement_${emblem.id}_title` as TranslationKey)
    : null;

  return (
    <article ref={tiltRef} className={styles.feature}>
      <CompareToggle selected={compareSelected} name={row.member.name} onToggle={onToggleCompare} className={styles.compareBtn} />

      <Link
        to={profileHref}
        className={styles.link}
        aria-label={`${t('open_profile')}: ${row.member.name}, ${t('rank_label')} 1, ${formatScore(row.current.overall, locale)}/100`}
      >
        <div className={styles.portrait}>
          <span className={styles.facets} aria-hidden="true" />
          <span className={styles.sheen} aria-hidden="true" />
          {/* A true child of .portrait (not a sibling positioned over it): always anchors to the
              portrait's own corner at any size, and its z-index is authored against the portrait's
              own facets/sheen/photo stack below, not guessed against an unrelated scope — see the
              CSS, which is what actually fixes it painting under the photo. */}
          <span className={styles.medalTag}>{t('podium_gold')}</span>
          {celebrateDelay != null && (
            <motion.span
              className={styles.celebrateSweep}
              aria-hidden="true"
              initial={{ x: '-140%', opacity: 0 }}
              animate={{ x: '140%', opacity: [0, 1, 0] }}
              transition={{ delay: celebrateDelay, duration: 0.9, ease: 'easeOut', times: [0, 0.15, 1] }}
            />
          )}
          {row.member.fullBodyPhoto ? (
            <img src={row.member.fullBodyPhoto} alt="" className={styles.photo} />
          ) : (
            <PortraitFallback id={row.member.id} name={row.member.name} className={styles.portraitFallback} />
          )}
          {emblem && emblemGlyph && (
            <span className={styles.emblem} title={emblemTitle ?? undefined}>
              {emblemGlyph}
            </span>
          )}
        </div>

        <div className={styles.info}>
          <h2 className={styles.name}>{row.member.name}</h2>
          <div className={styles.rankScoreRow}>
            <span className={styles.rankNum}>
              <span className="visually-hidden">{t('rank_label')} </span>#1
            </span>
            <b className="tabular">{formatScore(row.current.overall, locale)}</b>
            <span className={styles.scoreUnit}>/100</span>
            <MoveBadge move={row.overallMove} />
          </div>

          <div className={styles.cats}>
            {CATEGORY_KEYS.map((c) => {
              const v = row.current.categories[c];
              return (
                <div key={c}>
                  <b className="tabular" title={v == null ? t('missing_value') : undefined}>
                    {v == null ? '-' : Math.round(v)}
                  </b>
                  <span>{categoryLabel(t, c)}</span>
                </div>
              );
            })}
          </div>

          <span className={styles.viewProfile}>
            {t('open_profile')} <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>

      {/* Outside the profile Link on purpose — JobPanel's own clan-crest link would be an invalid
          nested <a> otherwise (see TopFive's SupportingCard for the same pattern). */}
      <div className={styles.jobWrap}>
        <JobPanel member={row.member} clanId={clanId} overallRank={row.overallRank} overallScore={row.current.overall} showSoloStat={false} />
        <WhyThisRank row={row} team={team} achievements={achievements} />
      </div>
    </article>
  );
}
