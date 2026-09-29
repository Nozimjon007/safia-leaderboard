import { useI18n } from '../../i18n';
import styles from './LeaderboardSkeleton.module.css';

export function LeaderboardSkeleton() {
  const { t } = useI18n();
  return (
    <div className={styles.skel} aria-busy="true" aria-live="polite">
      <span className="visually-hidden">{t('state_loading')}</span>
      <div className={`${styles.block} ${styles.big}`} />
      <div className={styles.row}>
        <div className={styles.block} />
        <div className={styles.block} />
        <div className={styles.block} />
        <div className={styles.block} />
      </div>
      <div className={`${styles.block} ${styles.tall}`} />
    </div>
  );
}
