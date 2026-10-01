import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { LeaderboardDataset, Member, ScoringConfig } from '../../data/types';
import { categoryLabel, craftPathLabel, useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import {
  computeCraftMastery,
  computeLeadershipPathsProgress,
  computeRoleRank,
  craftPathForRole,
  CRAFT_CONCEPT_CATEGORY,
  milestoneTier,
  type CraftMissionProgress,
  type LeadershipPathProgress,
} from '../../lib/craftPaths';
import { CLAN_POINT_VALUES } from '../../lib/clanPoints';
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

function milestoneTitleKey(m: CraftMissionProgress): TranslationKey {
  return `leadership_milestone_${m.def.pathId}_${milestoneTier(m.def)}_title` as TranslationKey;
}
function milestoneDescKey(m: CraftMissionProgress): TranslationKey {
  return `leadership_milestone_${m.def.pathId}_${milestoneTier(m.def)}_desc` as TranslationKey;
}

interface MilestoneRowProps {
  mission: CraftMissionProgress;
  locked: boolean;
  isNew: boolean;
  dataset: LeaderboardDataset;
  reduceMotion: boolean;
}

/** One milestone — earned / in-progress / locked, expandable on click into its full criteria,
 * progress, what remains, and how it's verified (never just a bare progress bar). */
function MilestoneRow({ mission: m, locked, isNew, dataset, reduceMotion }: MilestoneRowProps) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const category = categoryLabel(t, CRAFT_CONCEPT_CATEGORY[m.def.concept]);
  const unit = t(`craft_concept_${m.def.concept}_unit` as TranslationKey);
  const pct = locked ? 0 : Math.round((m.current / m.def.threshold) * 100);
  const earnedDate = m.earnedWeekIndex != null ? formatDate(weekStartISO(dataset.firstWeekStart, m.earnedWeekIndex), locale) : null;
  const status = m.complete ? 'complete' : locked ? 'locked' : 'active';

  return (
    <li className={styles.mission} data-status={status} data-new={isNew || undefined}>
      <button type="button" className={styles.missionTrigger} aria-expanded={open} aria-controls={panelId} onClick={() => !locked && setOpen((v) => !v)} disabled={locked}>
        <span className={styles.missionGlyph} aria-hidden="true">
          {m.complete ? '★' : locked ? '🔒' : '☆'}
        </span>
        <span className={styles.missionTitleWrap}>
          <b>{t(milestoneTitleKey(m))}</b>
          {isNew && <span className={styles.newChip}>{t('craft_new_chip')}</span>}
        </span>
        {!locked && (
          <span className={styles.missionChevron} data-open={open || undefined} aria-hidden="true">
            ▾
          </span>
        )}
      </button>

      {!locked && (
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${pct}%` }} />
        </div>
      )}
      {locked ? (
        <p className={styles.missionLockedNote}>{t('leadership_milestone_locked_note')}</p>
      ) : !m.complete ? (
        <p className={styles.missionProgress}>{t('craft_mission_progress', { current: m.current, threshold: m.def.threshold, unit })}</p>
      ) : (
        earnedDate && <p className={styles.missionEarned}>{t('craft_mission_complete_on', { date: earnedDate })}</p>
      )}

      <AnimatePresence initial={false}>
        {open && !locked && (
          <motion.div
            id={panelId}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.001 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className={styles.detail}>
              <div>
                <span className={styles.detailLabel}>{t('leadership_milestone_criteria_label')}</span>
                <p>{t(milestoneDescKey(m))}</p>
              </div>
              <div>
                <span className={styles.detailLabel}>{t('leadership_milestone_progress_label')}</span>
                <p>{t('craft_mission_progress', { current: m.current, threshold: m.def.threshold, unit })}</p>
              </div>
              <div>
                <span className={styles.detailLabel}>{t('leadership_milestone_remaining_label')}</span>
                <p>{m.complete ? t('leadership_milestone_remaining_done') : t('leadership_milestone_remaining_text', { n: m.def.threshold - m.current, unit })}</p>
              </div>
              <div>
                <span className={styles.detailLabel}>{t('leadership_milestone_verified_label')}</span>
                <p>{t('leadership_milestone_verification', { category })}</p>
              </div>
              <p className={styles.detailClanNote}>
                {t('passport_feeds_clan', { points: m.def.concept === 'kaizen' ? CLAN_POINT_VALUES.process_improvement : CLAN_POINT_VALUES.role_milestone })}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function PathSection({ path, dataset, newIds, reduceMotion }: { path: LeadershipPathProgress; dataset: LeaderboardDataset; newIds: ReadonlySet<string>; reduceMotion: boolean }) {
  const { t } = useI18n();
  return (
    <div className={styles.pathSection}>
      <div className={styles.pathHead}>
        <h3>{t(`leadership_path_${path.pathId}` as TranslationKey)}</h3>
        <span className={styles.pathDesc}>{t(`leadership_path_${path.pathId}_desc` as TranslationKey)}</span>
        <span className={styles.pathStars}>{t('craft_stars_of', { earned: path.starsEarned, possible: path.starsPossible })}</span>
      </div>
      <ul className={styles.missionList}>
        {path.missions.map((m, i) => (
          <MilestoneRow
            key={m.def.id}
            mission={m}
            locked={i > 0 && !path.missions[i - 1].complete}
            isNew={newIds.has(m.def.id)}
            dataset={dataset}
            reduceMotion={reduceMotion}
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * Four Leadership Paths — this season's milestone progress (earned / in-progress / locked) grouped
 * by path, plus lifetime Craft Mastery. Every number traces back to already-published weekly
 * category scores (see lib/craftPaths.ts); nothing here is a separate, unverifiable input. Shown as
 * proposed, transparent recognition, never as an official HR assessment (craft_path_disclaimer,
 * always visible).
 */
export function CraftPathPanel({ member, dataset, config, currentSeason, seasons, periodWeekIndexes }: CraftPathPanelProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion() ?? false;
  const path = craftPathForRole(member.role);
  const paths = path && currentSeason ? computeLeadershipPathsProgress(dataset, member, currentSeason) : null;
  const completedIds = paths ? paths.flatMap((p) => p.missions.filter((m) => m.complete).map((m) => m.def.id)) : [];
  // A hook, so it must run unconditionally every render — see the early return just below, which
  // renders before this could otherwise be reached.
  const newIds = useNewlyEarnedMissionIds(member.id, completedIds);

  if (!path || !currentSeason || !paths) {
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
  const starsEarned = paths.reduce((s, p) => s + p.starsEarned, 0);
  const starsPossible = paths.reduce((s, p) => s + p.starsPossible, 0);

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
        <b>{t('craft_stars_of', { earned: starsEarned, possible: starsPossible })}</b>
      </div>

      <div className={styles.paths}>
        {paths.map((p) => (
          <PathSection key={p.pathId} path={p} dataset={dataset} newIds={newIds} reduceMotion={reduceMotion} />
        ))}
      </div>

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
