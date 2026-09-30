import { Link, useLocation } from 'react-router-dom';
import type { Member } from '../../data/types';
import type { ClanStanding } from '../../lib/clanPoints';
import { medalFor } from '../../lib/zoneStyle';
import { clanIdentity, clanName, useI18n } from '../../i18n';
import { ClanCrest } from '../common/ClanCrest';
import { MoveBadge } from '../common/MoveBadge';
import styles from './ClanStandingCard.module.css';

interface ClanStandingCardProps {
  standing: ClanStanding;
  /** Looked up for the "leading contributors" list — full-mode only. */
  memberById?: Record<string, Member>;
  compact?: boolean;
}

/** One clan's standing — used both compactly (the preview strip under the solo top five) and in
 * full (the dedicated Clans view), so the two never quietly drift apart on numbers or labels. */
export function ClanStandingCard({ standing, memberById, compact = false }: ClanStandingCardProps) {
  const { t, locale } = useI18n();
  const location = useLocation();
  const href = { pathname: `/clans/${standing.clanId}`, search: location.search };
  const avgLabel = standing.averagePoints.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 0 });

  return (
    <article className={styles.card} data-clan={standing.clanId} data-compact={compact || undefined}>
      <Link to={href} className={styles.link}>
        <div className={styles.head}>
          <ClanCrest clanId={standing.clanId} size={compact ? 34 : 46} />
          <div className={styles.who}>
            <span className={`${styles.rankNum} tabular`} data-medal={medalFor(standing.rank)}>
              <span className="visually-hidden">{t('clan_rank_label')} </span>#{standing.rank}
            </span>
            <h3 className={styles.name}>{clanName(t, standing.clanId)}</h3>
            {!compact && <p className={styles.identity}>{clanIdentity(t, standing.clanId)}</p>}
          </div>
        </div>

        <div className={styles.points}>
          <div className={styles.pointsMain}>
            <b className="tabular">{avgLabel}</b>
            <span className={styles.pointsUnit}>{t('clan_points_avg_label')}</span>
          </div>
          <MoveBadge move={standing.move} />
        </div>

        {!compact && (
          <p className={`${styles.total} tabular`}>
            {t('clan_points_total_label')}: {standing.totalPoints.toLocaleString(locale)} · {t('clan_members_count', { n: standing.memberCount })}
          </p>
        )}

        {!compact && (
          <div className={styles.contributors}>
            <span className={styles.contributorsLabel}>{t('clan_leading_contributors_label')}</span>
            {standing.leadingContributors.length === 0 ? (
              <p className={styles.empty}>{t('clan_no_contributors_yet')}</p>
            ) : (
              <ol>
                {standing.leadingContributors.map((c) => (
                  <li key={c.memberId}>
                    <span className={styles.contributorName}>{memberById?.[c.memberId]?.name ?? c.memberId}</span>
                    <span className="tabular">{c.points}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {!compact && (
          <span className={styles.cta} aria-hidden="true">
            {t('clan_view_roster')}
          </span>
        )}
      </Link>
    </article>
  );
}
