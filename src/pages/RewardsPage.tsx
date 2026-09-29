import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { seasonQuarterLabel, useI18n } from '../i18n';
import { useDatasetContext } from '../state/DatasetProvider';
import { useSeasons } from '../hooks/useSeasons';
import { useScoringConfig } from '../state/ScoringConfigProvider';
import { computeAllSeasonRewards, REWARD_IDS } from '../lib/rewards';
import { isSeasonApproved } from '../lib/seasons';
import type { RewardId } from '../data/types';
import { DemoBanner } from '../components/common/DemoBanner';
import { StateMessage } from '../components/common/StateMessage';
import { LeaderboardSkeleton } from '../components/leaderboard/LeaderboardSkeleton';
import { Avatar } from '../components/common/Avatar';
import type { TranslationKey } from '../i18n/locales/en';
import styles from './RewardsPage.module.css';

const REWARD_GLYPHS: Record<RewardId, string> = {
  place_1: '①',
  place_2: '②',
  place_3: '③',
  most_improved: '↑',
};

export function RewardsPage() {
  const { t } = useI18n();
  const location = useLocation();
  const { status, dataset, error, reload } = useDatasetContext();
  const { config } = useScoringConfig();
  const seasonsInfo = useSeasons(dataset);

  const allRewards = useMemo(() => {
    if (!dataset || !seasonsInfo) return [];
    return computeAllSeasonRewards(dataset, config, seasonsInfo.seasons);
  }, [dataset, config, seasonsInfo]);

  if (status === 'error') {
    return (
      <>
        <DemoBanner />
        <StateMessage
          title={t('state_error_title')}
          role="alert"
          body={
            <>
              {t('state_error_body')}
              <br />
              <span className={styles.subtitle}>{error}</span>
            </>
          }
          action={
            <button type="button" className="btn btnPrimary" onClick={reload}>
              {t('state_retry')}
            </button>
          }
        />
      </>
    );
  }

  if (status === 'loading' || !dataset || !seasonsInfo) {
    return (
      <>
        <DemoBanner />
        <LeaderboardSkeleton />
      </>
    );
  }

  const completedSeasonsNewestFirst = [...seasonsInfo.seasons].filter((s) => isSeasonApproved(s)).reverse();

  return (
    <>
      <DemoBanner />
      <div className={styles.crumbs}>
        <Link className={styles.backLink} to={{ pathname: '/', search: location.search }}>
          ← {t('back_to_leaderboard')}
        </Link>
      </div>
      <div className={styles.head}>
        <h1>{t('rewards_title')}</h1>
        <p className={styles.subtitle}>{t('rewards_subtitle')}</p>
      </div>

      <div className={styles.proposedBanner} role="note">
        {t('rewards_proposed_banner')}
      </div>

      <section className={styles.catalog} aria-labelledby="reward-catalog-heading">
        <h2 id="reward-catalog-heading" className="visually-hidden">
          {t('rewards_title')}
        </h2>
        {REWARD_IDS.map((id) => (
          <div key={id} className={styles.catalogItem} data-reward={id}>
            <span className={styles.catalogGlyph} aria-hidden="true">
              {REWARD_GLYPHS[id]}
            </span>
            <div>
              <div className={styles.catalogTitle}>{t(`reward_${id}_title` as TranslationKey)}</div>
              <div className={styles.catalogDesc}>{t(`reward_${id}_desc` as TranslationKey)}</div>
            </div>
          </div>
        ))}
      </section>

      {completedSeasonsNewestFirst.length === 0 ? (
        <StateMessage title={t('rewards_title')} body={t('no_rewards_yet')} />
      ) : (
        completedSeasonsNewestFirst.map((season) => {
          const rows = allRewards.filter((r) => r.seasonId === season.id);
          const memberFor = (id: string) => dataset.members.find((m) => m.id === id) ?? null;
          return (
            <section key={season.id} className={styles.seasonBlock} aria-labelledby={`rewards-${season.id}`}>
              <h2 id={`rewards-${season.id}`}>{t('rewards_for_season', { season: seasonQuarterLabel(t, season) })}</h2>
              <div className={styles.winnersGrid}>
                {rows.map((r) => {
                  const member = memberFor(r.memberId);
                  if (!member) return null;
                  return (
                    <div key={`${r.rewardId}-${r.memberId}`} className={styles.winnerCard} data-reward={r.rewardId}>
                      <span className={styles.winnerGlyph} aria-hidden="true">
                        {REWARD_GLYPHS[r.rewardId]}
                      </span>
                      <Avatar id={member.id} name={member.name} photoUrl={member.avatarPhoto} size={34} />
                      <div className={styles.winnerBody}>
                        <div className={styles.winnerReward}>{t(`reward_${r.rewardId}_title` as TranslationKey)}</div>
                        <Link className={styles.winnerName} to={{ pathname: `/member/${member.id}`, search: location.search }}>
                          {member.name}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}
