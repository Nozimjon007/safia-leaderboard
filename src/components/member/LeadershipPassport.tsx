import type { CategoryKey, EarnedAchievement, LeaderboardDataset, Member } from '../../data/types';
import { ACHIEVEMENT_TIER, bestAchievement, earnedAchievementTypes, mostRecentBySeason } from '../../lib/achievements';
import { CRAFT_CONCEPT_CATEGORY, computeCraftPathProgress, milestoneTier, nextCraftMissionGoal } from '../../lib/craftPaths';
import { CLAN_POINT_VALUES } from '../../lib/clanPoints';
import type { Season } from '../../lib/seasons';
import { formatDate } from '../../lib/dates';
import { useSignatureAchievement } from '../../hooks/useSignatureAchievement';
import { useNewlyEarnedAchievementIds } from '../../hooks/useNewlyEarnedStars';
import { categoryLabel, seasonQuarterLabel, useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import { LeadershipMedallion } from './LeadershipMedallion';
import styles from './LeadershipPassport.module.css';

interface LeadershipPassportProps {
  member: Member;
  dataset: LeaderboardDataset;
  currentSeason: Season | null;
  seasons: readonly Season[] | null;
  earnedAchievements: EarnedAchievement[];
}

function milestoneUnit(t: ReturnType<typeof useI18n>['t'], concept: string) {
  return t(`craft_concept_${concept}_unit` as TranslationKey);
}

/**
 * "Leadership Passport" — the profile's prestige showcase, directly below the profile introduction.
 * A large featured medallion (the leader's pinned Signature Achievement, or their single most
 * impressive earned one — see lib/achievements.ts's ACHIEVEMENT_PRIORITY), the next verified
 * milestone within reach, and the season/career achievement split. Every number here traces back to
 * lib/achievements.ts's already-computed, rule-based badges — nothing invented for this display.
 */
export function LeadershipPassport({ member, dataset, currentSeason, seasons, earnedAchievements }: LeadershipPassportProps) {
  const { t, locale } = useI18n();
  const { signatureId, setSignature, clearSignature } = useSignatureAchievement(member.id);

  const distinctTypes = earnedAchievementTypes(earnedAchievements);
  const newIds = useNewlyEarnedAchievementIds(member.id, distinctTypes);

  const best = bestAchievement(earnedAchievements);
  const featuredId = signatureId && distinctTypes.includes(signatureId) ? signatureId : (best?.id ?? null);
  const featuredInstance = featuredId ? mostRecentBySeason(earnedAchievements, featuredId) : null;
  const featuredSeason = featuredInstance ? (seasons?.find((s) => s.id === featuredInstance.seasonId) ?? null) : null;
  const featuredTier = featuredId ? ACHIEVEMENT_TIER[featuredId] : null;
  const featuredDesc =
    featuredId === 'category_leader' && featuredInstance?.detail
      ? t('achievement_category_leader_desc', { category: categoryLabel(t, featuredInstance.detail as CategoryKey) })
      : featuredId
        ? t(`achievement_${featuredId}_desc` as TranslationKey)
        : null;
  const celebrate = featuredId != null && newIds.has(featuredId) && signatureId == null;

  const progress = currentSeason ? computeCraftPathProgress(dataset, member, currentSeason) : null;
  const nextGoal = nextCraftMissionGoal(progress);
  const nextGoalCategory = nextGoal ? categoryLabel(t, CRAFT_CONCEPT_CATEGORY[nextGoal.def.concept]) : null;

  const thisSeasonIds = [...new Set(earnedAchievements.filter((e) => e.seasonId === currentSeason?.id).map((e) => e.id))];
  const pastIds = [...new Set(earnedAchievements.filter((e) => e.seasonId !== currentSeason?.id).map((e) => e.id))];

  function collectionRow(ids: readonly (typeof distinctTypes)[number][], emptyKey: TranslationKey) {
    if (ids.length === 0) return <p className={styles.collectionEmpty}>{t(emptyKey)}</p>;
    return (
      <ul className={styles.collectionList}>
        {ids.map((id) => {
          const instance = mostRecentBySeason(earnedAchievements, id);
          const season = instance ? (seasons?.find((s) => s.id === instance.seasonId) ?? null) : null;
          const isPinned = signatureId === id;
          return (
            <li key={id}>
              <button
                type="button"
                className={styles.collectionItem}
                data-pinned={isPinned || undefined}
                onClick={() => (isPinned ? clearSignature() : setSignature(id))}
                title={isPinned ? t('passport_unpin_action') : t('passport_pin_action')}
              >
                <LeadershipMedallion achievementId={id} tier={ACHIEVEMENT_TIER[id]} size="small" />
                <span className={styles.collectionLabel}>
                  {t(`achievement_${id}_title` as TranslationKey)}
                  {season && <span className={styles.collectionSeason}>{seasonQuarterLabel(t, season)}</span>}
                </span>
                {isPinned && (
                  <span className={styles.collectionPinnedDot} aria-hidden="true">
                    ◈
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="passport-heading">
      <div className={styles.headRow}>
        <h2 id="passport-heading">{t('passport_heading')}</h2>
        <p className={styles.subtitle}>{t('passport_subtitle')}</p>
      </div>

      <div className={styles.featured}>
        <LeadershipMedallion achievementId={featuredId} tier={featuredTier} size="large" empty={!featuredId} celebrate={celebrate} />
        <div className={styles.featuredBody}>
          {featuredId ? (
            <>
              <div className={styles.featuredTitleRow}>
                <h3 className={styles.featuredTitle}>{t(`achievement_${featuredId}_title` as TranslationKey)}</h3>
                {featuredTier && <span className={styles.tierChip} data-tier={featuredTier}>{t(`xp_tier_${featuredTier}` as TranslationKey)}</span>}
              </div>
              {featuredSeason && (
                <p className={styles.featuredMeta}>
                  {seasonQuarterLabel(t, featuredSeason)} · {t('passport_medallion_earned_on', { date: formatDate(featuredSeason.endISO, locale) })}
                </p>
              )}
              <p className={styles.featuredDesc}>{featuredDesc}</p>
              <p className={styles.feedsNote}>{t('passport_feeds_clan', { points: CLAN_POINT_VALUES.quality_achievement })}</p>
              <div className={styles.pinRow}>
                {signatureId === featuredId ? (
                  <>
                    <span className={styles.pinnedTag}>{t('passport_pinned_note')}</span>
                    <button type="button" className={styles.pinBtn} onClick={clearSignature}>
                      {t('passport_unpin_action')}
                    </button>
                  </>
                ) : (
                  <button type="button" className={styles.pinBtn} onClick={() => setSignature(featuredId)}>
                    {t('passport_pin_action')}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <h3 className={styles.featuredTitle}>{t('passport_no_achievements_title')}</h3>
              <p className={styles.featuredDesc}>{t('passport_no_achievements_body')}</p>
            </>
          )}
        </div>
      </div>

      <div className={styles.nextMilestone}>
        <span className={styles.nextMilestoneLabel}>{t('passport_next_milestone_heading')}</span>
        {nextGoal ? (
          <p className={styles.nextMilestoneBody}>
            <b>{t(`leadership_milestone_${nextGoal.def.pathId}_${milestoneTier(nextGoal.def)}_title` as TranslationKey)}</b>
            {' · '}
            {t('leadership_milestone_remaining_text', { n: nextGoal.def.threshold - nextGoal.current, unit: nextGoalCategory ? milestoneUnit(t, nextGoal.def.concept) : '' })}{' '}
            <a className={styles.nextMilestoneCta} href="#craft-path-heading">
              {t('passport_next_milestone_cta')}
            </a>
          </p>
        ) : (
          <p className={styles.nextMilestoneBody}>{t('passport_next_milestone_none')}</p>
        )}
      </div>

      <div className={styles.collections}>
        <div>
          <h4 className={styles.collectionHeading}>{t('passport_season_collection_heading')}</h4>
          {collectionRow(thisSeasonIds, 'passport_season_collection_empty')}
        </div>
        <div>
          <h4 className={styles.collectionHeading}>{t('passport_career_collection_heading')}</h4>
          {collectionRow(pastIds, 'passport_career_collection_empty')}
        </div>
      </div>
    </section>
  );
}
