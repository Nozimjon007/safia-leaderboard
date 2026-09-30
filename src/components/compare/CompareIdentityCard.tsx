import type { Member } from '../../data/types';
import { areaLabel, roleLabel, shiftLabel, useI18n } from '../../i18n';
import type { PeriodStats } from '../../lib/scoring';
import { zoneOf } from '../../lib/scoring';
import { useScoringConfig } from '../../state/ScoringConfigProvider';
import { formatScore } from '../../lib/format';
import { zoneColorVar } from '../../lib/zoneStyle';
import { Avatar } from '../common/Avatar';
import { ZoneBadge } from '../common/ZoneBadge';
import { MoveBadge } from '../common/MoveBadge';
import styles from './CompareIdentityCard.module.css';

interface CompareIdentityCardProps {
  member: Member;
  stats: PeriodStats;
  color: string;
  rank: number | null;
  rankedCount: number;
  inCurrentView: boolean;
  move: number | null;
}

export function CompareIdentityCard({ member, stats, color, rank, rankedCount, inCurrentView, move }: CompareIdentityCardProps) {
  const { t, locale } = useI18n();
  const { config } = useScoringConfig();
  const zone = zoneOf(stats.overall, config);

  return (
    <div className={styles.card} style={{ borderTopColor: color }}>
      <div className={styles.head}>
        <Avatar id={member.id} name={member.name} photoUrl={member.avatarPhoto} size={56} />
        <div>
          <h2 className={styles.name} style={{ color }}>
            {member.name}
          </h2>
          <p className={styles.sub}>
            {roleLabel(t, member.role)} · {areaLabel(t, member.area)} · {shiftLabel(t, member.shift)}
          </p>
        </div>
      </div>
      <div className={styles.scoreRow}>
        <b className="tabular" style={{ color: zoneColorVar(zone) }}>
          {formatScore(stats.overall, locale)}
        </b>
        <span className={styles.unit}>/100</span>
        {stats.overall != null && <ZoneBadge zone={zone} />}
      </div>
      <div className={styles.rankRow}>
        {inCurrentView ? (
          <>
            <span className={styles.rankLabel}>{t('compare_rank_in_view')}:</span>{' '}
            {rank == null ? '—' : <span className="tabular">{`#${rank} / ${rankedCount}`}</span>}
            <MoveBadge move={move} className={styles.moveBadge} />
          </>
        ) : (
          <span className={styles.rankLabel}>{t('compare_not_in_view')}</span>
        )}
      </div>
    </div>
  );
}
