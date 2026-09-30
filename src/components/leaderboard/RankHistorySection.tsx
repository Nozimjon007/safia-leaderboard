import { useMemo, useState } from 'react';
import type { LeaderboardDataset, MetricKey } from '../../data/types';
import { weeklyRankSeries, type LeaderboardResult } from '../../lib/scoring';
import { useI18n } from '../../i18n';
import { useScoringConfig } from '../../state/ScoringConfigProvider';
import { formatShortDate, weekStartISO } from '../../lib/dates';
import { LineChart, type LineSeriesSpec } from '../charts/LineChart';
import styles from './RankHistorySection.module.css';

interface RankHistorySectionProps {
  dataset: LeaderboardDataset;
  result: LeaderboardResult;
  metric: MetricKey;
}

/** Cap on how many members' lines ever get drawn — with 100+ (later 500+) people, plotting every
 * single one turns this into illegible spaghetti and mounts a same-sized hidden data table for
 * each. Capping to the top-ranked slice keeps the chart readable and its cost bounded regardless
 * of dataset size, and the top of the pack is the part of "how did the ranking move" most worth
 * seeing anyway. */
const MAX_LINES = 20;

export function RankHistorySection({ dataset, result, metric }: RankHistorySectionProps) {
  const { t } = useI18n();
  const { config } = useScoringConfig();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Rank is always computed against the FULL filtered pool (never just the slice below), so a
  // drawn line's numbers stay someone's true rank — "#15" here must mean 15th of everyone, not
  // 15th of an arbitrary top slice.
  const fullPool = useMemo(() => result.rows.map((r) => r.member), [result.rows]);
  const shownRows = useMemo(() => result.rows.slice(0, MAX_LINES), [result.rows]);

  const { fromWeek, toWeek, seriesByMemberId } = useMemo(
    () => weeklyRankSeries(fullPool, dataset.scores, result.weekIndexes, dataset.weekCount, metric, config),
    [fullPool, dataset, result.weekIndexes, metric, config],
  );

  const weekSpan = toWeek - fromWeek + 1;
  if (weekSpan < 2 || !shownRows.length) return null;

  const labels = Array.from({ length: weekSpan }, (_, i) => formatShortDate(weekStartISO(dataset.firstWeekStart, fromWeek + i)));
  const activeId = selectedId && shownRows.some((r) => r.member.id === selectedId) ? selectedId : (result.rows[0]?.member.id ?? null);

  const series: LineSeriesSpec[] = shownRows.map((r) => ({
    id: r.member.id,
    label: r.member.name,
    values: seriesByMemberId[r.member.id] ?? [],
    kind: r.member.id === activeId ? 'accent' : 'muted',
    onSelect: () => setSelectedId(r.member.id),
  }));
  // The Y-axis fits whatever range the *drawn* lines actually swing through (a top-20-today member
  // may well have been ranked lower a few weeks back), not a fixed constant.
  const drawnValues = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  const maxRank = Math.max(2, ...drawnValues, shownRows.length);

  const heading = t('rank_history_title', { n: weekSpan });
  const truncated = result.rows.length > shownRows.length;

  return (
    <section className={styles.panel} aria-labelledby="rank-history-heading">
      <h2 id="rank-history-heading">{heading}</h2>
      <p className={styles.sub}>{t('rank_history_subtitle')}</p>
      {truncated && <p className={styles.sub}>{t('rank_history_limited_note', { n: shownRows.length, total: result.rows.length })}</p>}
      <LineChart
        labels={labels}
        series={series}
        yMin={1}
        yMax={maxRank}
        yTicks={Array.from({ length: maxRank }, (_, i) => i + 1).filter((v) => v === 1 || v === maxRank || v % 2 === 0)}
        invertY
        ariaLabel={heading}
        height={Math.max(260, Math.min(560, shownRows.length * 20 + 60))}
        valueLabel={(v) => String(Math.round(v))}
        showDataTableLabel={t('show_data_table')}
        emptyValueLabel={t('missing_value')}
      />
    </section>
  );
}
