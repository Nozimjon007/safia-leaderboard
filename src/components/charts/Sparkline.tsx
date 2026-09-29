import { zoneColorVar } from '../../lib/zoneStyle';
import type { Zone } from '../../data/types';
import styles from './Sparkline.module.css';

interface SparklineProps {
  values: ReadonlyArray<number | null>;
  /** Direction the trend line should be colored: good (rising), low (falling), mid (flat/insufficient data). */
  zone: Zone;
  ariaLabel: string;
  emptyLabel: string;
}

const W = 84;
const H = 28;
const PAD = 3;

export function Sparkline({ values, zone, ariaLabel, emptyLabel }: SparklineProps) {
  const present = values.filter((v): v is number => v != null);
  if (present.length < 2) {
    return (
      <span className={styles.empty} title={emptyLabel}>
        —<span className="visually-hidden"> {emptyLabel}</span>
      </span>
    );
  }
  const lo = Math.min(...present);
  const hi = Math.max(...present);
  const span = Math.max(hi - lo, 4);
  const points: Array<[number, number]> = [];
  values.forEach((v, i) => {
    if (v == null) return;
    const px = PAD + (i * (W - 2 * PAD)) / (values.length - 1);
    const py = H - PAD - ((v - lo) / span) * (H - 2 * PAD);
    points.push([px, py]);
  });
  const line = points.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  const last = points[points.length - 1];
  const first = points[0];
  const area = `${line}L${last[0].toFixed(1)} ${H}L${first[0].toFixed(1)} ${H}Z`;
  const color = zoneColorVar(zone);

  return (
    <svg className={styles.spark} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
      <path d={area} fill={color} opacity={0.12} stroke="none" />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.8} fill={color} stroke="var(--surface)" strokeWidth={1.4} />
    </svg>
  );
}
