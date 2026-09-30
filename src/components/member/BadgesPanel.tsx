import { motion, useReducedMotion } from 'motion/react';
import type { EarnedAchievement } from '../../data/types';
import { ACHIEVEMENT_GLYPHS, ACHIEVEMENT_IDS, categoryLeaderDetails, countOf, mostRecentBySeason } from '../../lib/achievements';
import { categoryLabel, seasonQuarterLabel, useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import type { Season } from '../../lib/seasons';
import { useNewlyEarnedAchievementIds } from '../../hooks/useNewlyEarnedStars';
import styles from './BadgesPanel.module.css';

interface BadgesPanelProps {
  memberId: string;
  earned: EarnedAchievement[];
  seasons: readonly Season[];
}

/** Earned vs. locked achievement badges — demo content, see lib/achievements.ts for the exact rule behind each one. A badge earned since this browser's last visit to this profile gets a brief, one-time unlock pop (see useNewlyEarnedAchievementIds), never a repeating celebration. */
export function BadgesPanel({ memberId, earned, seasons }: BadgesPanelProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const bySeasonId = new Map(seasons.map((s) => [s.id, s]));
  const categoryLeaderCats = categoryLeaderDetails(earned);
  const earnedIds = [...new Set(earned.map((a) => a.id))];
  const newIds = useNewlyEarnedAchievementIds(memberId, earnedIds);

  return (
    <section className={styles.panel} aria-labelledby="badges-heading">
      <h2 id="badges-heading">{t('badges_title')}</h2>
      <p className={styles.subtitle}>{t('badges_subtitle')}</p>
      {earned.length === 0 && <p className={styles.empty}>{t('badges_none_yet')}</p>}
      <div className={styles.grid}>
        {ACHIEVEMENT_IDS.map((id) => {
          const count = countOf(earned, id);
          const has = count > 0;
          const recent = mostRecentBySeason(earned, id);
          const recentSeason = recent ? bySeasonId.get(recent.seasonId) : null;
          const desc =
            id === 'category_leader' && has
              ? categoryLeaderCats.map((c) => categoryLabel(t, c)).join(', ')
              : t(`achievement_${id}_desc` as TranslationKey);
          const isNew = has && newIds.has(id);
          return (
            <div key={id} className={styles.badge} data-earned={has || undefined} data-new={isNew || undefined}>
              <motion.span
                className={styles.glyph}
                aria-hidden="true"
                initial={isNew && !reduceMotion ? { scale: 0, rotate: -35 } : false}
                animate={{ scale: 1, rotate: 0 }}
                transition={isNew && !reduceMotion ? { type: 'spring', stiffness: 300, damping: 11, delay: 0.15 } : { duration: 0 }}
              >
                {ACHIEVEMENT_GLYPHS[id]}
              </motion.span>
              <div className={styles.badgeBody}>
                <div className={styles.badgeTitle}>
                  {t(`achievement_${id}_title` as TranslationKey)}
                  {has && count > 1 && <span className={styles.count}> ×{count}</span>}
                  {isNew && <span className={styles.newChip}>{t('craft_new_chip')}</span>}
                </div>
                <div className={styles.badgeDesc}>{desc}</div>
                {has && recentSeason ? (
                  <div className={styles.badgeMeta}>{t('reward_earned_in', { season: seasonQuarterLabel(t, recentSeason) })}</div>
                ) : (
                  <div className={styles.lockedTag}>{t('badges_locked')}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
