import { categoryLabel, useI18n } from '../../i18n';
import type { CategoryGap } from '../../lib/scoring';
import { formatPercent, formatSigned } from '../../lib/format';
import styles from './StrengthsList.module.css';

interface PillsProps {
  items: CategoryGap[];
  empty: string;
  kind: 'good' | 'low';
}

function Pills({ items, empty, kind }: PillsProps) {
  const { t, locale } = useI18n();
  if (!items.length) return <p className={styles.empty}>{empty}</p>;
  return (
    <div className={styles.pills}>
      {items.map((g) => (
        <div key={g.category} className={styles.pill} data-kind={kind}>
          <span>
            <span aria-hidden="true">{kind === 'good' ? '▲' : '▼'}</span> {categoryLabel(t, g.category)} · {formatPercent(g.value)}
          </span>
          <span className={styles.gap}>
            {formatSigned(g.gap, locale)} {t('vs_team')}
          </span>
        </div>
      ))}
    </div>
  );
}

interface StrengthsListProps {
  strengths: CategoryGap[];
  weaknesses: CategoryGap[];
  compact?: boolean;
}

/** Strengths / areas-to-improve, derived from each member's real gap vs the team average — used compact (row expand) and full (profile page). */
export function StrengthsList({ strengths, weaknesses, compact = false }: StrengthsListProps) {
  const { t } = useI18n();
  return (
    <div className={compact ? styles.compactWrap : styles.fullWrap}>
      <div className={compact ? styles.compactBlock : styles.panel}>
        <h3 className={compact ? styles.compactTitle : styles.title}>{t('strengths_title')}</h3>
        <Pills items={strengths} empty={t('no_strengths')} kind="good" />
      </div>
      <div className={compact ? styles.compactBlock : styles.panel}>
        <h3 className={compact ? styles.compactTitle : styles.title}>{t('improve_title')}</h3>
        <Pills items={weaknesses} empty={t('no_weaknesses')} kind="low" />
      </div>
    </div>
  );
}
