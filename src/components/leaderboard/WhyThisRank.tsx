import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { EarnedAchievement } from '../../data/types';
import type { LeaderboardRow, TeamStats } from '../../lib/scoring';
import { strengthsAndWeaknesses } from '../../lib/scoring';
import { ACHIEVEMENT_GLYPHS } from '../../lib/achievements';
import { useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import { StrengthsList } from './StrengthsList';
import styles from './WhyThisRank.module.css';

interface WhyThisRankProps {
  row: LeaderboardRow;
  team: TeamStats;
  /** This member's full earned-achievement history — never filtered to just the one "best" badge
   * used for the card's corner emblem, so this can actually say what backs the rank up. */
  achievements: EarnedAchievement[];
}

/**
 * An expandable, per-card explanation of the rank above it — real category gaps vs. the team
 * average (the same computation the leaderboard table's own row-expand uses) plus this member's
 * verified, rule-based achievements (lib/achievements.ts). Never a separate or invented metric.
 */
export function WhyThisRank({ row, team, achievements }: WhyThisRankProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const panelId = useId();
  const { strengths, weaknesses } = strengthsAndWeaknesses(row.current.categories, team.categoryAverages);
  // A member can earn the same badge in more than one season — this only needs to say THAT it's
  // verified, not list it once per season.
  const uniqueAchievements = [...new Map(achievements.map((a) => [a.id, a])).values()];

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.trigger} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
        <span>{t('why_this_rank')}</span>
        <span aria-hidden="true" className={styles.chevron} data-open={open || undefined}>
          ▾
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            className={styles.panelOuter}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.001 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className={styles.panel}>
              <StrengthsList strengths={strengths} weaknesses={weaknesses} compact />
              <div className={styles.achievements}>
                <h4 className={styles.achievementsTitle}>{t('why_rank_achievements_title')}</h4>
                {uniqueAchievements.length === 0 ? (
                  <p className={styles.noAchievements}>{t('why_rank_no_achievements')}</p>
                ) : (
                  <ul className={styles.achievementsList}>
                    {uniqueAchievements.map((a) => (
                      <li key={a.id} className={styles.achievementChip}>
                        <span aria-hidden="true">{ACHIEVEMENT_GLYPHS[a.id]}</span>
                        {t(`achievement_${a.id}_title` as TranslationKey)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
