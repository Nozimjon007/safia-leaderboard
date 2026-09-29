import { Link, useLocation } from 'react-router-dom';
import type { Member } from '../../data/types';
import { useI18n } from '../../i18n';
import { Avatar } from '../common/Avatar';
import styles from './CompareTray.module.css';

interface CompareTrayProps {
  selected: Member[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

/** Floating selection tray for the "compare two members" flow — appears once at least one member is picked. */
export function CompareTray({ selected, onRemove, onClear }: CompareTrayProps) {
  const { t } = useI18n();
  const location = useLocation();
  if (!selected.length) return null;

  const canCompare = selected.length === 2;
  let compareHref: { pathname: string; search: string } | null = null;
  if (canCompare) {
    const params = new URLSearchParams(location.search);
    params.set('a', selected[0].id);
    params.set('b', selected[1].id);
    compareHref = { pathname: '/compare', search: `?${params.toString()}` };
  }

  return (
    <div className={styles.tray} role="region" aria-label={t('compare_tray_label')}>
      <div className={styles.inner}>
        <div className={styles.chips}>
          <span className={styles.count}>{t('compare_selected_count', { n: selected.length })}</span>
          {selected.map((m) => (
            <span key={m.id} className={styles.chip}>
              <Avatar id={m.id} name={m.name} photoUrl={m.avatarPhoto} size={22} />
              <span className={styles.chipName}>{m.name}</span>
              <button type="button" onClick={() => onRemove(m.id)} aria-label={`${t('compare_remove')}: ${m.name}`}>
                ×
              </button>
            </span>
          ))}
          {!canCompare && <span className={styles.hint}>{t('compare_pick_second')}</span>}
        </div>
        <div className={styles.actions}>
          <button type="button" className="btn" onClick={onClear}>
            {t('compare_clear')}
          </button>
          {compareHref && (
            <Link className="btn btnPrimary" to={compareHref}>
              {t('compare_button')} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
