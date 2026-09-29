import { useI18n } from '../../i18n';
import { usePointerGlint } from '../../hooks/usePointerGlint';
import styles from './CareerCrystal.module.css';

interface CareerCrystalProps {
  /** Distinct earned achievement types (see lib/achievements.ts). */
  achievementCount: number;
  /** Recorded promotions in the member's career history. */
  promotionCount: number;
}

/**
 * "Career Crystal" — a small faceted emblem standing in for a member's
 * verified milestones. Lights up only when there's real data behind it
 * (achievements and/or career-history promotions); otherwise renders a
 * neutral, clearly-dormant gem rather than implying something was earned.
 */
export function CareerCrystal({ achievementCount, promotionCount }: CareerCrystalProps) {
  const { t } = useI18n();
  const glintRef = usePointerGlint<HTMLDivElement>();
  const lit = achievementCount + promotionCount > 0;
  const caption = lit
    ? t('career_crystal_desc_earned', { achievements: achievementCount, promotions: promotionCount })
    : t('career_crystal_desc_neutral');

  return (
    <div className={styles.wrap}>
      <div ref={glintRef} className={styles.gem} data-lit={lit || undefined} role="img" aria-label={`${t('career_crystal_title')}. ${caption}`}>
        <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={styles.svg}>
          <polygon className={styles.f1} points="50,50 50,4 90,27" />
          <polygon className={styles.f2} points="50,50 90,27 90,73" />
          <polygon className={styles.f3} points="50,50 90,73 50,96" />
          <polygon className={styles.f4} points="50,50 50,96 10,73" />
          <polygon className={styles.f5} points="50,50 10,73 10,27" />
          <polygon className={styles.f6} points="50,50 10,27 50,4" />
          <polygon className={styles.outline} points="50,4 90,27 90,73 50,96 10,73 10,27" />
        </svg>
        <span className={styles.glint} aria-hidden="true" />
      </div>
      <div className={styles.captionWrap}>
        <div className={styles.title}>{t('career_crystal_title')}</div>
        <p className={styles.caption}>{caption}</p>
      </div>
    </div>
  );
}
