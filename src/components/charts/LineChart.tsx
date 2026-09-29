import { useId, useMemo, useRef, useState } from 'react';
import styles from './LineChart.module.css';

export interface LineSeriesSpec {
  id: string;
  label: string;
  values: ReadonlyArray<number | null>;
  /** accent = the one series that's the point; muted = de-emphasis context; dashedMuted = a reference line (e.g. team average). */
  kind: 'accent' | 'muted' | 'dashedMuted';
  onSelect?: () => void;
  /** Explicit color override (e.g. two true categorical hues for an A-vs-B comparison) — takes precedence over `kind`'s default color. */
  color?: string;
  /** Explicit dash override — takes precedence over `kind`'s default dash pattern. */
  dashed?: boolean;
}

interface LineChartProps {
  labels: readonly string[];
  series: readonly LineSeriesSpec[];
  yMin: number;
  yMax: number;
  yTicks: readonly number[];
  invertY?: boolean;
  /** Index range (inclusive) to shade as the selected period. */
  bandRange?: readonly [number, number] | null;
  ariaLabel: string;
  height?: number;
  valueLabel?: (value: number) => string;
  showDataTableLabel: string;
  emptyValueLabel: string;
}

const VIEW_W = 680;
const PAD_L = 40;
const PAD_R = 20;
const PAD_T = 16;
const PAD_B = 30;

export function LineChart({
  labels,
  series,
  yMin,
  yMax,
  yTicks,
  invertY = false,
  bandRange = null,
  ariaLabel,
  height = 260,
  valueLabel = (v) => String(Math.round(v * 10) / 10),
  showDataTableLabel,
  emptyValueLabel,
}: LineChartProps) {
  const n = labels.length;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const titleId = useId();

  const plotW = VIEW_W - PAD_L - PAD_R;
  const plotH = height - PAD_T - PAD_B;
  const x = (i: number) => PAD_L + (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const y = (v: number) => {
    const f = (v - yMin) / (yMax - yMin || 1);
    return invertY ? PAD_T + f * plotH : PAD_T + plotH - f * plotH;
  };

  const xStep = Math.max(1, Math.ceil(n / 8));

  const paths = useMemo(
    () =>
      series.map((s) => {
        let d = '';
        let pen = false;
        s.values.forEach((v, i) => {
          if (v == null) {
            pen = false;
            return;
          }
          d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1);
          pen = true;
        });
        let lastIdx = s.values.length - 1;
        while (lastIdx >= 0 && s.values[lastIdx] == null) lastIdx--;
        return { ...s, d, lastIdx, lastVal: lastIdx >= 0 ? s.values[lastIdx] : null };
      }),
    [series, yMin, yMax, invertY, n],
  );

  function handlePointerMove(clientX: number) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * VIEW_W;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(x(i) - relX);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    setHoverIndex(nearest);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setHoverIndex((i) => Math.min(n - 1, (i ?? -1) + 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setHoverIndex((i) => Math.max(0, (i ?? n) - 1));
    } else if (e.key === 'Escape') {
      setHoverIndex(null);
    }
  }

  const hasLegend = series.length >= 2;
  const cursorLabel = hoverIndex != null ? labels[hoverIndex] : null;

  return (
    <figure className={styles.figure}>
      <div
        className={styles.plotWrap}
        role="group"
        tabIndex={0}
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHoverIndex(null)}
        onBlur={() => setHoverIndex(null)}
      >
        <div className={styles.scroll}>
          <svg
            ref={svgRef}
            className={styles.svg}
            viewBox={`0 0 ${VIEW_W} ${height}`}
            role="img"
            aria-labelledby={titleId}
            onMouseMove={(e) => handlePointerMove(e.clientX)}
            onTouchMove={(e) => e.touches[0] && handlePointerMove(e.touches[0].clientX)}
          >
            <title id={titleId}>{ariaLabel}</title>
            {bandRange && (
              <rect
                className={styles.band}
                x={x(bandRange[0]) - (plotW / Math.max(1, n - 1)) / 2}
                y={PAD_T}
                width={x(bandRange[1]) - x(bandRange[0]) + plotW / Math.max(1, n - 1)}
                height={plotH}
                rx={6}
              />
            )}
            {yTicks.map((tick) => (
              <g key={tick}>
                <line className={styles.grid} x1={PAD_L} x2={VIEW_W - PAD_R} y1={y(tick)} y2={y(tick)} />
                <text className={styles.axisText} x={PAD_L - 8} y={y(tick) + 4} textAnchor="end">
                  {tick}
                </text>
              </g>
            ))}
            {labels.map((l, i) =>
              i % xStep === 0 || i === n - 1 ? (
                <text key={i} className={styles.axisText} x={x(i)} y={height - 8} textAnchor="middle">
                  {l}
                </text>
              ) : null,
            )}
            {hoverIndex != null && (
              <line className={styles.crosshair} x1={x(hoverIndex)} x2={x(hoverIndex)} y1={PAD_T} y2={PAD_T + plotH} />
            )}
            {paths
              .filter((p) => p.kind !== 'accent')
              .map((p) => (
                <path
                  key={p.id}
                  className={`${styles.line} ${p.kind === 'dashedMuted' ? styles.dashedMuted : styles.muted}`}
                  d={p.d}
                  onClick={p.onSelect}
                  style={{
                    cursor: p.onSelect ? 'pointer' : undefined,
                    stroke: p.color,
                    strokeDasharray: p.dashed == null ? undefined : p.dashed ? '6 4' : 'none',
                  }}
                >
                  {p.onSelect && <title>{p.label}</title>}
                </path>
              ))}
            {paths
              .filter((p) => p.kind === 'accent')
              .map((p) => (
                <path
                  key={p.id}
                  className={`${styles.line} ${styles.accent}`}
                  d={p.d}
                  style={{
                    stroke: p.color,
                    strokeDasharray: p.dashed == null ? undefined : p.dashed ? '6 4' : 'none',
                  }}
                />
              ))}
            {paths.map(
              (p) =>
                p.lastVal != null && (
                  <circle
                    key={p.id + '-end'}
                    className={p.kind === 'accent' ? styles.dotAccent : styles.dotMuted}
                    cx={x(p.lastIdx)}
                    cy={y(p.lastVal)}
                    r={4}
                    style={p.color ? { fill: p.color } : undefined}
                  />
                ),
            )}
            {hoverIndex != null &&
              paths.map((p) => {
                const v = p.values[hoverIndex];
                if (v == null) return null;
                return <circle key={p.id + '-hover'} className={styles.dotHover} cx={x(hoverIndex)} cy={y(v)} r={4.5} />;
              })}
          </svg>
        </div>
        {hoverIndex != null && (
          <div
            className={styles.tooltip}
            style={{ left: `${(x(hoverIndex) / VIEW_W) * 100}%` }}
            role="status"
            aria-live="polite"
          >
            <div className={styles.tooltipDate}>{cursorLabel}</div>
            {paths.map((p) => {
              const v = p.values[hoverIndex];
              return (
                <div key={p.id} className={styles.tooltipRow}>
                  <span
                    className={`${styles.tooltipKey} ${p.kind === 'accent' ? styles.keyAccent : styles.keyMuted}`}
                    style={p.color ? { background: p.color } : undefined}
                  />
                  <span className={styles.tooltipValue}>{v == null ? emptyValueLabel : valueLabel(v)}</span>
                  <span className={styles.tooltipLabel}>{p.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {hasLegend && (
        <div className={styles.legend} role="group" aria-label={ariaLabel}>
          {series.map((s) => (
            <button
              key={s.id}
              type="button"
              className={styles.legendChip}
              data-kind={s.kind}
              onClick={s.onSelect}
              disabled={!s.onSelect}
              aria-pressed={s.kind === 'accent'}
              style={s.color ? { borderColor: s.color, color: 'var(--ink)', fontWeight: 600 } : undefined}
            >
              <span
                className={styles.legendSwatch}
                data-kind={s.kind}
                style={s.color ? { background: s.dashed ? 'transparent' : s.color, borderColor: s.color } : undefined}
                aria-hidden="true"
              />
              {s.label}
            </button>
          ))}
        </div>
      )}
      <details className={styles.details}>
        <summary>{showDataTableLabel}</summary>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{ariaLabel}</th>
                {labels.map((l, i) => (
                  <th scope="col" key={i}>
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.id}>
                  <th scope="row">{s.label}</th>
                  {s.values.map((v, i) => (
                    <td key={i}>{v == null ? emptyValueLabel : valueLabel(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
