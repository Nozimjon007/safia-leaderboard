import { motion, useReducedMotion } from 'motion/react';
import type { AchievementId, XpTier } from '../../data/types';
import { ACHIEVEMENT_GLYPHS } from '../../lib/achievements';
import { usePointerGlint } from '../../hooks/usePointerGlint';
import { useI18n } from '../../i18n';
import styles from './LeadershipMedallion.module.css';

interface LeadershipMedallionProps {
  achievementId: AchievementId | null;
  tier: XpTier | null;
  size?: 'large' | 'small';
  /** An empty display case (no achievement to show) — a dormant, clearly-unlit medal outline, never
   * an implied-but-unearned award. */
  empty?: boolean;
  /** Plays the one-time "resolves into focus" unlock sequence — see useNewlyEarnedAchievementIds;
   * never set for an achievement the viewer has already seen before. */
  celebrate?: boolean;
  className?: string;
}

/**
 * A circular medal, not a game icon: a metal bezel (tier-colored), an enamel face carrying the
 * achievement's glyph, and a pointer-driven light catch on hover-capable devices (see
 * usePointerGlint) — same "real gem, not flat color" technique as Career Crystal, applied to a medal
 * instead. All text (name/level/season/date) is deliberately NOT part of this graphic — it lives in
 * the caller's own typography next to it, so nothing here can end up painted under or over a label.
 */
export function LeadershipMedallion({ achievementId, tier, size = 'large', empty = false, celebrate = false, className }: LeadershipMedallionProps) {
  const { t } = useI18n();
  const glintRef = usePointerGlint<HTMLDivElement>();
  const reduceMotion = useReducedMotion();
  const glyph = achievementId ? ACHIEVEMENT_GLYPHS[achievementId] : '';
  const lit = !empty && achievementId != null;
  const playCelebrate = celebrate && lit && !reduceMotion;

  return (
    <motion.div
      ref={glintRef}
      className={`${styles.medal} ${size === 'small' ? styles.small : styles.large} ${className ?? ''}`}
      data-lit={lit || undefined}
      data-tier={tier ?? undefined}
      role="img"
      aria-label={lit ? t('passport_signature_label') : t('passport_no_achievements_title')}
      initial={playCelebrate ? { opacity: 0, scale: 0.72, filter: 'blur(6px)' } : false}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={playCelebrate ? { duration: 0.85, ease: [0.16, 1, 0.3, 1] } : { duration: 0 }}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={styles.svg}>
        <circle className={styles.bezelOuter} cx="50" cy="50" r="47" />
        <circle className={styles.bezelRim} cx="50" cy="50" r="41" />
        <circle className={styles.face} cx="50" cy="50" r="37" />
        {/* Engraved ring detail — two offset circles standing in for a cut groove near the rim. */}
        <circle className={styles.engraveRing} cx="50" cy="50" r="31" />
        {lit && (
          <text x="50" y="58" textAnchor="middle" className={styles.glyphText}>
            {glyph}
          </text>
        )}
        <circle className={styles.rimHighlight} cx="50" cy="50" r="44" />
      </svg>
      {playCelebrate && (
        <motion.span
          className={styles.sweep}
          aria-hidden="true"
          initial={{ x: '-120%', opacity: 0 }}
          animate={{ x: '120%', opacity: [0, 1, 0] }}
          transition={{ delay: 0.55, duration: 0.7, ease: 'easeOut', times: [0, 0.2, 1] }}
        />
      )}
      <span className={styles.glint} aria-hidden="true" />
    </motion.div>
  );
}
