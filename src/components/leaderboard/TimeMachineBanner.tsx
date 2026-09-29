import { Link, useLocation } from 'react-router-dom';
import type { Member } from '../../data/types';
import type { TimeMachineState } from '../../hooks/useTimeMachine';
import { useI18n } from '../../i18n';
import { formatTimeMachineCaption } from './TimeMachineControl';
import styles from './TimeMachineBanner.module.css';

interface TimeMachineBannerProps {
  tm: TimeMachineState | null;
  members: readonly Member[];
}

/**
 * Read-only notice for pages that render Time-Machine-filtered data but not
 * the slider itself (profile, compare) — without this, landing here mid-Time-
 * Machine (e.g. via a shared link) could read as live standings instead of a
 * frozen historical snapshot.
 */
export function TimeMachineBanner({ tm, members }: TimeMachineBannerProps) {
  const { t, locale } = useI18n();
  const location = useLocation();

  if (!tm || !tm.active) return null;

  return (
    <div className={styles.banner} role="note">
      <b className={styles.badge}>
        <span aria-hidden="true">🕐</span> {t('time_machine_open')}
      </b>
      <span>
        {t('time_machine_banner_note', { n: tm.seasonOffset + 1 })} {formatTimeMachineCaption(tm.caption, members, t, locale)}
      </span>
      <Link className={styles.link} to={{ pathname: '/', search: location.search }}>
        {t('nav_leaderboard')} →
      </Link>
    </div>
  );
}
