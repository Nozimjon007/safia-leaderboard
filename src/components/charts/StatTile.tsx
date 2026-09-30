import type { ReactNode } from 'react';
import styles from './StatTile.module.css';

interface StatTileProps {
  label: string;
  value: ReactNode;
  valueColor?: string;
  delta?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  accentBorder?: string;
  /** A denser, borderless rendering for inline use in a banner/header row (e.g. the season hero) —
   * same label/value/delta contract, just less padding and a smaller value. */
  compact?: boolean;
}

/** Stat-tile contract: label, value (proportional figures), optional delta and free-form extra content. */
export function StatTile({ label, value, valueColor, delta, description, children, accentBorder, compact }: StatTileProps) {
  return (
    <div className={styles.tile} data-compact={compact || undefined} style={accentBorder ? { borderTopColor: accentBorder } : undefined}>
      <h3 className={styles.label}>{label}</h3>
      <div className={styles.value} style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </div>
      {delta && <div className={styles.delta}>{delta}</div>}
      {children}
      {description && <p className={styles.description}>{description}</p>}
    </div>
  );
}
