import type { RewardId } from '../../data/types';
import { seasonQuarterLabel, useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import type { Season } from '../../lib/seasons';
import styles from './RewardBadge.module.css';

export const REWARD_GLYPHS: Record<RewardId, string> = {
  place_1: '①',
  place_2: '②',
  place_3: '③',
  most_improved: '↑',
};

interface RewardBadgeProps {
  rewardId: RewardId;
  season: Season;
}

/** One earned (or on-offer) reward chip — always labeled proposed/demo by the surrounding page, never itself. */
export function RewardBadge({ rewardId, season }: RewardBadgeProps) {
  const { t } = useI18n();
  return (
    <div className={styles.badge} data-reward={rewardId}>
      <span className={styles.glyph} aria-hidden="true">
        {REWARD_GLYPHS[rewardId]}
      </span>
      <div className={styles.body}>
        <div className={styles.title}>{t(`reward_${rewardId}_title` as TranslationKey)}</div>
        <div className={styles.desc}>{t(`reward_${rewardId}_desc` as TranslationKey)}</div>
        <div className={styles.season}>{t('reward_earned_in', { season: seasonQuarterLabel(t, season) })}</div>
      </div>
    </div>
  );
}
