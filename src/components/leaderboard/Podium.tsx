import { useEffect, useState } from 'react';
import type { EarnedAchievement, LeaderboardDataset, MetricKey, RewardId, ScoringConfig } from '../../data/types';
import type { LeaderboardRow } from '../../lib/scoring';
import { bestAchievement } from '../../lib/achievements';
import { computeSeasonRewards } from '../../lib/rewards';
import { seasonCountdown, seasonStatus, seasonWeekRange, type Season } from '../../lib/seasons';
import { formatDateRange } from '../../lib/dates';
import { readSignatureMap } from '../../hooks/useSignatureAchievement';
import { seasonCountdownText, seasonQuarterLabel, useI18n } from '../../i18n';
import { PodiumCard, type PodiumEmblem } from './PodiumCard';
import styles from './Podium.module.css';

interface PodiumProps {
  /** The top three rows, already in rank order (1st, 2nd, 3rd). Visual reordering (2nd–1st–3rd) is CSS-only. */
  rows: LeaderboardRow[];
  metric: MetricKey;
  metricLabel: string;
  /** Each shown member's earned achievements, for the card's fallback emblem. */
  achievementsByMember?: Record<string, EarnedAchievement[]>;
  dataset: LeaderboardDataset;
  config: ScoringConfig;
  seasons: readonly Season[] | null;
  periodFromISO: string;
  periodToISO: string;
  compareIds: string[];
  onToggleCompare: (id: string) => void;
}

const REWARD_PRIORITY: readonly RewardId[] = ['place_1', 'place_2', 'place_3', 'most_improved'];

export function Podium({
  rows,
  metric,
  metricLabel,
  achievementsByMember,
  dataset,
  config,
  seasons,
  periodFromISO,
  periodToISO,
  compareIds,
  onToggleCompare,
}: PodiumProps) {
  const { t, locale } = useI18n();
  const [now, setNow] = useState(() => Date.now());

  const matchedSeason = seasons?.find((s) => {
    const r = seasonWeekRange(dataset, s);
    return r && r.from === periodFromISO && r.to === periodToISO;
  });
  const status = matchedSeason ? seasonStatus(matchedSeason, now) : null;
  const complete = status === 'awaiting_approval' || status === 'approved';
  const approved = status === 'approved';

  useEffect(() => {
    if (!matchedSeason || complete) return;
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [matchedSeason, complete]);

  if (!rows.length) return null;

  // Rewards only exist for an *approved* season that this exact period matches — a live/in-progress
  // season, one still awaiting its approval grace window, or an arbitrary custom range never claims
  // a finalized prize. See lib/rewards.ts and lib/seasons.ts's seasonStatus.
  const rewardByMember: Record<string, RewardId> = {};
  if (matchedSeason && approved) {
    const rewards = computeSeasonRewards(dataset, config, matchedSeason);
    for (const id of REWARD_PRIORITY) {
      for (const r of rewards) {
        if (r.rewardId === id && !rewardByMember[r.memberId]) rewardByMember[r.memberId] = id;
      }
    }
  }

  const signatureMap = readSignatureMap();

  function emblemFor(memberId: string): PodiumEmblem {
    const memberEarned = achievementsByMember?.[memberId] ?? [];
    const signatureId = signatureMap[memberId];
    if (signatureId && memberEarned.some((e) => e.id === signatureId)) return { kind: 'achievement', id: signatureId };
    const rewardId = rewardByMember[memberId];
    if (rewardId) return { kind: 'reward', id: rewardId };
    const achievement = bestAchievement(memberEarned);
    return achievement ? { kind: 'achievement', id: achievement.id } : null;
  }

  return (
    <section className={styles.podium} aria-labelledby="podium-heading">
      <div className={styles.header}>
        <h2 id="podium-heading">{t('podium_title')}</h2>
        <p>{t('podium_subtitle', { metric: metricLabel })}</p>
      </div>

      {matchedSeason ? (
        <div className={styles.seasonStrip}>
          <span className={styles.seasonBadge} data-status={status ?? undefined}>
            {status === 'approved'
              ? t('season_complete_badge')
              : status === 'awaiting_approval'
                ? t('season_awaiting_approval_badge')
                : t('season_current_badge')}
          </span>
          <span className={styles.seasonName}>
            {seasonQuarterLabel(t, matchedSeason)} · {formatDateRange(matchedSeason.startISO, matchedSeason.endISO, locale)}
          </span>
          {!complete && (
            <span className={styles.seasonCountdown}>
              {t('season_countdown_label')}: {seasonCountdownText(t, seasonCountdown(matchedSeason, now))}
            </span>
          )}
        </div>
      ) : (
        <div className={styles.seasonStrip}>
          <span className={styles.seasonName}>{t('podium_custom_period', { range: formatDateRange(periodFromISO, periodToISO, locale) })}</span>
        </div>
      )}

      <div className={styles.grid}>
        {rows.map((row, idx) => (
          <PodiumCard
            key={row.member.id}
            row={row}
            place={(idx + 1) as 1 | 2 | 3}
            metric={metric}
            metricLabel={metricLabel}
            emblem={emblemFor(row.member.id)}
            compareSelected={compareIds.includes(row.member.id)}
            onToggleCompare={() => onToggleCompare(row.member.id)}
          />
        ))}
      </div>
    </section>
  );
}
