import type { Zone } from '../../data/types';
import { zoneColorVar } from '../../lib/zoneStyle';
import styles from './Meter.module.css';

interface MeterProps {
  value: number | null;
  zone: Zone;
  /** Reference marker, e.g. the team average for the same category/period. */
  markerValue?: number | null;
  max?: number;
}

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** A same-ramp progress track. Fill uses the status color for the value's zone — paired everywhere with a numeric label + zone badge, never color alone. */
export function Meter({ value, zone, markerValue, max = 100 }: MeterProps) {
  const pct = value == null ? 0 : clampPct((value / max) * 100);
  const markerPct = markerValue == null ? null : clampPct((markerValue / max) * 100);
  return (
    <div className={styles.track} aria-hidden="true">
      <div className={styles.fill} style={{ width: `${pct}%`, background: zoneColorVar(zone) }} />
      {markerPct != null && <div className={styles.marker} style={{ left: `${markerPct}%` }} />}
    </div>
  );
}
