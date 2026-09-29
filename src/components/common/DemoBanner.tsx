import { useI18n } from '../../i18n';
import styles from './DemoBanner.module.css';

export function DemoBanner() {
  const { t } = useI18n();
  return (
    <div className={styles.banner} role="note">
      <b className={styles.badge}>{t('demo_badge')}</b>
      <span>{t('demo_text')}</span>
    </div>
  );
}
