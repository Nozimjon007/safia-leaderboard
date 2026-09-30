import { motion, useReducedMotion } from 'motion/react';
import type { LeaderboardDataset, Member, ScoringConfig } from '../../data/types';
import { categoryLabel, craftPathLabel, useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import {
  computeCraftMastery,
  computeCraftPathProgress,
  computeRoleRank,
  craftPathForRole,
  CRAFT_CONCEPT_CATEGORY,
  type CraftConcept,
} from '../../lib/craftPaths';
import type { Season } from '../../lib/seasons';
import { formatDate, weekStartISO } from '../../lib/dates';
import { useNewlyEarnedMissionIds } from '../../hooks/useNewlyEarnedStars';
import styles from './CraftPathPanel.module.css';

interface CraftPathPanelProps {
  member: Member;
  dataset: LeaderboardDataset;
  config: ScoringConfig;
  currentSeason: Season | null;
  seasons: readonly Season[] | null;
  /** The week indexes the rest of the profile is currently showing (filters.fromISO..toISO) — role
   * rank stays consistent with whatever period the page is already on, the same convention as the
   * header's overall "Rank now" stat. */
  periodWeekIndexes: readonly number[];
}

/**
 * A member's Craft Path — this season's mission progress and stars, plus their lifetime Craft
 * Mastery tier. Every number here traces back to already-published weekly category scores (see
 * lib/craftPaths.ts); nothing is a separate, unverifiable input. Shown as proposed, transparent
 * recognition, never as an official HR assessment (craft_path_disclaimer, always visible).
 */
export function CraftPathPanel({ member, dataset, config, currentSeason, seasons, periodWeekIndexes }: CraftPathPanelProps) {
  const { t, locale } = useI18n();
  const reduceMotion = useReducedMotion();
  const path = craftPathForRole(member.role);
  const progress = path && currentSeason ? computeCraftPathProgress(dataset, member, currentSeason) : null;
  const completedIds = progress ? progress.missions.filter((m) => m.complete).map((m) => m.def.id) : [];
  // A hook, so it must run unconditionally every render — see the early return just below, which
  // renders before this could otherwise be reached.
  const newIds = useNewlyEarnedMissionIds(member.id, completedIds);

  if (!path || !currentSeason || !progress) {
    return (
      <section className={styles.panel} aria-labelledby="craft-path-heading">
        <h2 id="craft-path-heading">{t('craft_path_heading')}</h2>
        <p className={styles.sub}>{t('craft_path_none')}</p>
      </section>
    );
  }

  const mastery = seasons ? computeCraftMastery(dataset, member, seasons) : null;
  const roleRank = computeRoleRank(dataset, config, periodWeekIndexes, member.id);
  const pathName = craftPathLabel(t, path.role);
  const newMissions = progress.missions.filter((m) => newIds.has(m.def.id));

  return (
    <section className={styles.panel} aria-labelledby="craft-path-heading">
      <div className={styles.headerRow}>
        <h2 id="craft-path-heading">{pathName}</h2>
        <span className={styles.roleRank}>
          {roleRank.rank != null
            ? t('craft_role_rank', { role: pathName, rank: roleRank.rank, total: roleRank.total })
            : t('craft_role_rank_none')}
        </span>
      </div>
      <p className={styles.sub}>{t('craft_path_disclaimer')}</p>

      <div className={styles.starsRow}>
        <div className={styles.constellation} role="img" aria-label={t('craft_stars_of', { earned: progress.starsEarned, possible: progress.starsPossible })}>
          {progress.missions.map((m) => {
            const isNew = newIds.has(m.def.id);
            return (
              <motion.span
                key={m.def.id}
                className={styles.star}
                data-complete={m.complete || undefined}
                aria-hidden="true"
                initial={isNew && !reduceMotion ? { scale: 0, rotate: -35 } : false}
                animate={{ scale: 1, rotate: 0 }}
                transition={isNew && !reduceMotion ? { type: 'spring', stiffness: 300, damping: 11, delay: 0.2 } : { duration: 0 }}
              >
                ★
              </motion.span>
            );
          })}
        </div>
        <b>{t('craft_stars_of', { earned: progress.starsEarned, possible: progress.starsPossible })}</b>
      </div>

      {newMissions.length > 0 && (
        <div className={styles.newStarBanner} role="status">
          {newMissions.map((m) => (
            <p key={m.def.id}>
              <span aria-hidden="true">✨</span> {t('craft_new_star', { title: t(`craft_concept_${m.def.concept}_title` as TranslationKey) })}
            </p>
          ))}
        </div>
      )}

      <ul className={styles.missions}>
        {progress.missions.map((m) => {
          const concept: CraftConcept = m.def.concept;
          const pct = Math.round((m.current / m.def.threshold) * 100);
          const earnedDate = m.earnedWeekIndex != null ? formatDate(weekStartISO(dataset.firstWeekStart, m.earnedWeekIndex), locale) : null;
          const isNew = newIds.has(m.def.id);
          return (
            <li key={m.def.id} className={styles.mission} data-complete={m.complete || undefined} data-new={isNew || undefined}>
              <div className={styles.missionHead}>
                <span className={styles.missionGlyph} aria-hidden="true">
                  {m.complete ? '★' : '☆'}
                </span>
                <b>{t(`craft_concept_${concept}_title` as TranslationKey)}</b>
                <span className={styles.categoryTag}>{categoryLabel(t, CRAFT_CONCEPT_CATEGORY[concept])}</span>
                {isNew && <span className={styles.newChip}>{t('craft_new_chip')}</span>}
              </div>
              <p className={styles.missionDesc}>{t(`craft_concept_${concept}_desc` as TranslationKey)}</p>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${pct}%` }} />
              </div>
              {!m.complete && (
                <p className={styles.missionProgress}>
                  {t('craft_mission_progress', { current: m.current, threshold: m.def.threshold, unit: t(`craft_concept_${concept}_unit` as TranslationKey) })}
                </p>
              )}
              {earnedDate && <p className={styles.missionEarned}>{t('craft_mission_complete_on', { date: earnedDate })}</p>}
            </li>
          );
        })}
      </ul>

      {mastery && (
        <div className={styles.mastery} data-tier={mastery.tier}>
          <div className={styles.masteryHead}>
            <h3>{t('craft_mastery_heading')}</h3>
            <span className={styles.masteryTier}>{t(`xp_tier_${mastery.tier}` as TranslationKey)}</span>
          </div>
          <p>{t('craft_mastery_stars_total', { n: mastery.totalStars })}</p>
          <p className={styles.sub}>
            {mastery.toNextTier != null && mastery.nextTier
              ? t('craft_mastery_to_next', { n: mastery.toNextTier, tier: t(`xp_tier_${mastery.nextTier}` as TranslationKey) })
              : t('craft_mastery_top_tier')}
          </p>
          <p className={styles.sub}>{t('craft_mastery_subtitle')}</p>
        </div>
      )}

      <p className={styles.fairnessNote}>{t('craft_fairness_note')}</p>
    </section>
  );
}
