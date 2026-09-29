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
}

/** Stat-tile contract: label, value (proportional figures), optional delta and free-form extra content. */
export function StatTile({ label, value, valueColor, delta, description, children, accentBorder }: StatTileProps) {
  return (
    <div className={styles.tile} style={accentBorder ? { borderTopColor: accentBorder } : undefined}>
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
