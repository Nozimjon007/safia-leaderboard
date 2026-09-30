import { CATEGORY_KEYS, type CategoryKey } from '../../data/types';
import styles from './RadarChart.module.css';

export interface RadarSeries {
  values: Record<CategoryKey, number | null>;
  label: string;
  /** CSS color (a token or literal) used for the stroke, fill wash, and legend swatch. */
  color: string;
  /** Outline-only dashed treatment for a reference/context series (e.g. a team average). Default: solid fill + stroke. */
  dashed?: boolean;
}

interface RadarChartProps {
  seriesA: RadarSeries;
  seriesB: RadarSeries;
  categoryLabels: Record<CategoryKey, string>;
  ariaLabel: string;
  missingValueLabel: string;
  formatValue: (v: number) => string;
}

const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2 + 6;
const R = 96;
const RINGS = [25, 50, 75, 100];

function angleFor(i: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / CATEGORY_KEYS.length;
}
function pointFor(i: number, value: number): [number, number] {
  const a = angleFor(i);
  return [CX + Math.cos(a) * R * (value / 100), CY + Math.sin(a) * R * (value / 100)];
}
function polygonPoints(series: RadarSeries): [number, number][] {
  return CATEGORY_KEYS.map((c, i) => (series.values[c] == null ? null : pointFor(i, series.values[c] as number))).filter(
    (p): p is [number, number] => p != null,
  );
}

/** Two-series comparison across the five categories — member vs. team average, or member vs. member. Always paired with a numeric breakdown as its table-view twin. */
export function RadarChart({ seriesA, seriesB, categoryLabels, ariaLabel, missingValueLabel, formatValue }: RadarChartProps) {
  const polyA = polygonPoints(seriesA);
  const polyB = polygonPoints(seriesB);

  const describedValues = CATEGORY_KEYS.map((c) => {
    const av = seriesA.values[c];
    const bv = seriesB.values[c];
    return `${categoryLabels[c]} ${av == null ? missingValueLabel : formatValue(av)} / ${bv == null ? missingValueLabel : formatValue(bv)}`;
  }).join('; ');

  return (
    <figure className={styles.figure}>
      <svg
        viewBox={`-64 -6 ${SIZE + 128} ${SIZE + 40}`}
        width="100%"
        className={styles.svg}
        role="img"
        aria-label={`${ariaLabel}: ${describedValues}`}
      >
        {RINGS.map((r) => (
          <polygon key={r} className={styles.ring} points={CATEGORY_KEYS.map((_, i) => pointFor(i, r).join(',')).join(' ')} />
        ))}
        {CATEGORY_KEYS.map((c, i) => {
          const p = pointFor(i, 100);
          return <line key={c} className={styles.axis} x1={CX} y1={CY} x2={p[0]} y2={p[1]} />;
        })}
        {[seriesB, seriesA].map((s, idx) =>
          (idx === 0 ? polyB : polyA).length >= 3 ? (
            <polygon
              key={idx}
              points={(idx === 0 ? polyB : polyA).map((p) => p.join(',')).join(' ')}
              fill={s.dashed ? 'none' : s.color}
              fillOpacity={s.dashed ? 1 : 0.16}
              stroke={s.color}
              strokeWidth={s.dashed ? 2 : 2.4}
              strokeDasharray={s.dashed ? '6 4' : undefined}
              strokeLinejoin="round"
              opacity={s.dashed ? 0.85 : 1}
            />
          ) : null,
        )}
        {CATEGORY_KEYS.map((c, i) => {
          const a = angleFor(i);
          const lx = CX + Math.cos(a) * (R + 20);
          const ly = CY + Math.sin(a) * (R + 20);
          const anchor = Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle';
          const dy = Math.sin(a) > 0.5 ? 14 : Math.sin(a) < -0.5 ? -10 : 4;
          const av = seriesA.values[c];
          const bv = seriesB.values[c];
          return (
            <g key={c}>
              <text x={lx} y={ly + dy - 8} textAnchor={anchor} className={styles.axisLabel}>
                {categoryLabels[c]}
              </text>
              <text x={lx} y={ly + dy + 7} textAnchor={anchor} className={styles.axisValue}>
                {/* Inline value stays short (a dash for "no data") so it never overflows the chart's edge; the full
                    word is still in the figure's aria-label, and the numeric breakdown alongside the chart has it too. */}
                <tspan fill={seriesA.color}>{av == null ? '-' : formatValue(av)}</tspan>
                <tspan className={styles.axisSep}> / </tspan>
                <tspan fill={seriesB.color}>{bv == null ? '-' : formatValue(bv)}</tspan>
              </text>
            </g>
          );
        })}
      </svg>
      <div className={styles.legend}>
        {[seriesA, seriesB].map((s, i) => (
          <span key={i} className={styles.legendItem}>
            <span
              className={s.dashed ? styles.swatchDashed : styles.swatchSolid}
              style={{ borderColor: s.color }}
              aria-hidden="true"
            />
            {s.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
