import { useI18n } from '../../i18n';
import styles from './MoveBadge.module.css';

export function MoveBadge({ move, className }: { move: number | null; className?: string }) {
  const { t } = useI18n();

  if (move == null) {
    return (
      <span className={`${styles.badge} ${className ?? ''}`} data-dir="na">
        <span aria-hidden="true">–</span>
        <span className="visually-hidden">{t('move_na')}</span>
      </span>
    );
  }
  if (move > 0) {
    return (
      <span className={`${styles.badge} ${className ?? ''}`} data-dir="up">
        <span aria-hidden="true">▲ {move}</span>
        <span className="visually-hidden">{t('move_up', { n: move })}</span>
      </span>
    );
  }
  if (move < 0) {
    return (
      <span className={`${styles.badge} ${className ?? ''}`} data-dir="down">
        <span aria-hidden="true">▼ {-move}</span>
        <span className="visually-hidden">{t('move_down', { n: -move })}</span>
      </span>
    );
  }
  return (
    <span className={`${styles.badge} ${className ?? ''}`} data-dir="same">
      <span aria-hidden="true">＝</span>
      <span className="visually-hidden">{t('move_same')}</span>
    </span>
  );
}
