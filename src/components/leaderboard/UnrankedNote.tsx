import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n';
import type { LeaderboardRow } from '../../lib/scoring';
import styles from './UnrankedNote.module.css';

export function UnrankedNote({ rows }: { rows: LeaderboardRow[] }) {
  const { t } = useI18n();
  const location = useLocation();
  const unranked = rows.filter((r) => r.rank == null);
  if (!unranked.length) return null;

  return (
    <p className={styles.note}>
      <b>{t('unranked_note')}</b>{' '}
      {unranked.map((r, i) => (
        <span key={r.member.id}>
          <Link to={{ pathname: `/member/${r.member.id}`, search: location.search }}>{r.member.name}</Link>
          {i < unranked.length - 1 ? ', ' : ''}
        </span>
      ))}
    </p>
  );
}
