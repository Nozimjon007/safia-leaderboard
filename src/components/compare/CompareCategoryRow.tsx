import { categoryLabel, useI18n } from '../../i18n';
import type { CategoryKey } from '../../data/types';
import type { ComparisonCategoryEntry } from '../../lib/scoring';
import { formatPercent } from '../../lib/format';
import styles from './CompareCategoryRow.module.css';

interface CompareCategoryRowProps {
  entry: ComparisonCategoryEntry;
  colorA: string;
  colorB: string;
  nameA: string;
  nameB: string;
}

/** One category as a labeled dumbbell: two positioned dots on a 0–100 track, connected by a line — numbers always shown alongside, never color-only. */
export function CompareCategoryRow({ entry, colorA, colorB, nameA, nameB }: CompareCategoryRowProps) {
  const { t } = useI18n();
  const { a, b, leader, category } = entry;
  const label = categoryLabel(t, category as CategoryKey);

  const lo = a != null && b != null ? Math.min(a, b) : null;
  const hi = a != null && b != null ? Math.max(a, b) : null;

  const diff = a != null && b != null ? Math.round(Math.abs(a - b)) : 0;
  const fullSentence =
    leader === 'na'
      ? t('missing_value')
      : leader === 'tie'
        ? t('compare_tie_label')
        : t('compare_leads_by', { name: leader === 'a' ? nameA : nameB, n: diff });
  // Compact on-screen tag (avoids truncating a long name); the full sentence is always available via the title attribute.
  const shortTag = leader === 'na' ? '-' : leader === 'tie' ? t('compare_tie_label') : `+${diff}`;
  const leaderColor = leader === 'a' ? colorA : leader === 'b' ? colorB : undefined;

  return (
    <div className={styles.row}>
      <div className={styles.label}>{label}</div>
      <div className={styles.valueA} style={{ color: colorA }}>
        <span className={styles.name}>{nameA}</span>
        {a == null ? '-' : formatPercent(a)}
      </div>
      <div className={styles.track} aria-hidden="true">
        {lo != null && hi != null && <div className={styles.connector} style={{ left: `${lo}%`, width: `${hi - lo}%` }} />}
        {a != null && <div className={styles.dot} style={{ left: `${a}%`, background: colorA }} />}
        {b != null && <div className={styles.dot} style={{ left: `${b}%`, background: colorB }} />}
      </div>
      <div className={styles.valueB} style={{ color: colorB }}>
        <span className={styles.name}>{nameB}</span>
        {b == null ? '-' : formatPercent(b)}
      </div>
      <div className={styles.leaderTag} data-leader={leader} style={leaderColor ? { color: leaderColor } : undefined} title={fullSentence}>
        <span className="visually-hidden">{fullSentence}</span>
        <span aria-hidden="true">{shortTag}</span>
      </div>
    </div>
  );
}
