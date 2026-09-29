import type { EarnedAchievement } from '../../data/types';
import { ACHIEVEMENT_GLYPHS, ACHIEVEMENT_IDS, categoryLeaderDetails, countOf, mostRecentBySeason } from '../../lib/achievements';
import { categoryLabel, seasonQuarterLabel, useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import type { Season } from '../../lib/seasons';
import styles from './BadgesPanel.module.css';

interface BadgesPanelProps {
  earned: EarnedAchievement[];
  seasons: readonly Season[];
}

/** Earned vs. locked achievement badges — demo content, see lib/achievements.ts for the exact rule behind each one. */
export function BadgesPanel({ earned, seasons }: BadgesPanelProps) {
  const { t } = useI18n();
  const bySeasonId = new Map(seasons.map((s) => [s.id, s]));
  const categoryLeaderCats = categoryLeaderDetails(earned);

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
          return (
            <div key={id} className={styles.badge} data-earned={has || undefined}>
              <span className={styles.glyph} aria-hidden="true">
                {ACHIEVEMENT_GLYPHS[id]}
              </span>
              <div className={styles.badgeBody}>
                <div className={styles.badgeTitle}>
                  {t(`achievement_${id}_title` as TranslationKey)}
                  {has && count > 1 && <span className={styles.count}> ×{count}</span>}
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
