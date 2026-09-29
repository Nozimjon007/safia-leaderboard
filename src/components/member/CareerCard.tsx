import type { EarnedAchievement, Member } from '../../data/types';
import { roleLabel, seasonQuarterLabel, useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import { careerTimeline, deriveCareerHighlight, tenureBreakdown } from '../../lib/career';
import { ACHIEVEMENT_GLYPHS, earnedAchievementTypes } from '../../lib/achievements';
import { formatDate } from '../../lib/dates';
import { formatScore } from '../../lib/format';
import type { Season } from '../../lib/seasons';
import { usePointerGlint } from '../../hooks/usePointerGlint';
import { CareerCrystal } from './CareerCrystal';
import styles from './CareerCard.module.css';

interface CareerCardProps {
  member: Member;
  todayISO: string;
  currentSeason: Season | null;
  currentSeasonRank: number | null;
  currentSeasonScore: number | null;
  currentSeasonRankedCount: number;
  earnedAchievements: readonly EarnedAchievement[];
  rewardCount: number;
}

export function CareerCard({
  member,
  todayISO,
  currentSeason,
  currentSeasonRank,
  currentSeasonScore,
  currentSeasonRankedCount,
  earnedAchievements,
  rewardCount,
}: CareerCardProps) {
  const { t, locale } = useI18n();
  const frameRef = usePointerGlint<HTMLDivElement>();
  const timeline = careerTimeline(member);
  const promotionCount = Math.max(0, timeline.length - 1);
  const earnedTypes = earnedAchievementTypes(earnedAchievements);
  const highlight = deriveCareerHighlight(member, earnedAchievements);
  const tenure = member.dateJoinedISO ? tenureBreakdown(member.dateJoinedISO, todayISO) : null;

  const highlightText =
    highlight?.type === 'achievement'
      ? t('career_highlight_achievement', {
          title: t(`achievement_${highlight.id}_title` as TranslationKey),
          season: seasonQuarterLabelForId(highlight.seasonId, t),
        })
      : highlight?.type === 'promotion'
        ? t('career_highlight_promotion', { role: highlight.role, date: formatDate(highlight.dateISO, locale) })
        : null;

  return (
    <section className={styles.card} aria-labelledby="career-card-heading">
      <h2 id="career-card-heading" className="visually-hidden">
        {t('career_card_title')}
      </h2>

      <div ref={frameRef} className={styles.portraitPanel}>
        <span className={styles.facets} aria-hidden="true" />
        <span className={styles.sheen} aria-hidden="true" />
        <span className={styles.glint} aria-hidden="true" />
        {member.fullBodyPhoto ? (
          <img src={member.fullBodyPhoto} alt="" className={styles.photo} />
        ) : (
          <div className={styles.placeholder} aria-hidden="true" title={t('career_photo_placeholder_note')}>
            <svg viewBox="0 0 200 400" className={styles.figure} focusable="false">
              <ellipse className={styles.figureFoot} cx="88" cy="372" rx="18" ry="9" />
              <ellipse className={styles.figureFoot} cx="112" cy="372" rx="18" ry="9" />
              <rect className={styles.figureLeg} x="78" y="222" width="20" height="145" rx="9" />
              <rect className={styles.figureLeg} x="102" y="222" width="20" height="145" rx="9" />
              <path className={styles.figureArm} d="M60,120 L45,218 L59,224 L71,126 Z" />
              <path className={styles.figureArm} d="M140,120 L155,218 L141,224 L129,126 Z" />
              <path className={styles.figureTorso} d="M66,116 L134,116 L124,228 L76,228 Z" />
              <circle className={styles.figureHead} cx="100" cy="42" r="28" />
            </svg>
          </div>
        )}
      </div>

      <div className={styles.info}>
        <header className={styles.identity}>
          <h3 className={styles.name}>{member.name}</h3>
          <p className={styles.jobTitle}>{roleLabel(t, member.role)}</p>
        </header>

        <dl className={styles.factGrid}>
          <div className={styles.fact}>
            <dt>{t('career_team_label')}</dt>
            <dd>
              {member.area} · {member.shift}
            </dd>
          </div>
          {member.dateJoinedISO && tenure && (
            <div className={styles.fact}>
              <dt>{t('career_joined_label')}</dt>
              <dd>
                {formatDate(member.dateJoinedISO, locale)}
                <span className={styles.tenure}> · {t('career_tenure_value', { years: tenure.years, months: tenure.months })}</span>
              </dd>
            </div>
          )}
          {currentSeasonRank != null && currentSeason && (
            <div className={styles.fact}>
              <dt>{t('career_season_rank_label', { season: seasonQuarterLabel(t, currentSeason) })}</dt>
              <dd>
                #{currentSeasonRank} <span className={styles.tenure}>/ {currentSeasonRankedCount}</span> ·{' '}
                {formatScore(currentSeasonScore, locale)}
                <span className={styles.tenure}>/100</span>
              </dd>
            </div>
          )}
        </dl>

        {timeline.length > 0 && (
          <div className={styles.journey}>
            <h4>{t('career_journey_title')}</h4>
            <ol className={styles.timeline}>
              {timeline.map((step) => (
                <li key={step.startISO} className={styles.timelineStep} data-current={step.endISO === null || undefined}>
                  <span className={styles.timelineDot} aria-hidden="true" />
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineRole}>{roleLabel(t, step.role)}</div>
                    <div className={styles.timelineDates}>
                      {formatDate(step.startISO, locale)} — {step.endISO ? formatDate(step.endISO, locale) : t('career_present_label')}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {(earnedTypes.length > 0 || rewardCount > 0) && (
          <div className={styles.recognition}>
            <h4>{t('career_recognition_title')}</h4>
            <div className={styles.recognitionRow}>
              {earnedTypes.map((id) => (
                <span key={id} className={styles.badgeGlyph} title={t(`achievement_${id}_title` as TranslationKey)}>
                  {ACHIEVEMENT_GLYPHS[id]}
                </span>
              ))}
              {rewardCount > 0 && <span className={styles.rewardCount}>{t('career_reward_count', { n: rewardCount })}</span>}
            </div>
          </div>
        )}

        {highlightText && (
          <p className={styles.highlight}>
            <b>{t('career_highlight_title')}</b> {highlightText}
          </p>
        )}

        <CareerCrystal achievementCount={earnedTypes.length} promotionCount={promotionCount} />
      </div>
    </section>
  );
}

function seasonQuarterLabelForId(seasonId: string, t: ReturnType<typeof useI18n>['t']): string {
  // The achievement's own season may not be the currently-selected one; year/quarter parse
  // straight out of the id ("2026-q1"), so no season-list lookup is needed for the label.
  const [yearStr, qStr] = seasonId.split('-q');
  const year = Number(yearStr);
  const quarter = Number(qStr);
  if (!year || !quarter) return seasonId;
  return seasonQuarterLabel(t, { year, quarter });
}
