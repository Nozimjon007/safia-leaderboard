import { useI18n } from '../../i18n';
import styles from './CompareToggle.module.css';

interface CompareToggleProps {
  selected: boolean;
  name: string;
  onToggle: () => void;
  className?: string;
}

/** A small "add to comparison" control, shared by table rows and cards. */
export function CompareToggle({ selected, name, onToggle, className }: CompareToggleProps) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className={`${styles.toggle} ${className ?? ''}`}
      aria-pressed={selected}
      onClick={onToggle}
      title={t('compare_toggle_label')}
      aria-label={`${t('compare_toggle_label')}: ${name}`}
    >
      <span aria-hidden="true">{selected ? '✓' : '+'}</span>
    </button>
  );
}
