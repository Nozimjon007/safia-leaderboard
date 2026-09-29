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

export function RankHistorySection({ dataset, result, metric }: RankHistorySectionProps) {
  const { t } = useI18n();
  const { config } = useScoringConfig();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pool = useMemo(() => result.rows.map((r) => r.member), [result.rows]);

  const { fromWeek, toWeek, seriesByMemberId } = useMemo(
    () => weeklyRankSeries(pool, dataset.scores, result.weekIndexes, dataset.weekCount, metric, config),
    [pool, dataset, result.weekIndexes, metric, config],
  );

  const weekSpan = toWeek - fromWeek + 1;
  if (weekSpan < 2 || !pool.length) return null;

  const labels = Array.from({ length: weekSpan }, (_, i) => formatShortDate(weekStartISO(dataset.firstWeekStart, fromWeek + i)));
  const activeId = selectedId && pool.some((m) => m.id === selectedId) ? selectedId : (result.rows[0]?.member.id ?? null);
  const maxRank = Math.max(pool.length, 2);

  const series: LineSeriesSpec[] = result.rows.map((r) => ({
    id: r.member.id,
    label: r.member.name,
    values: seriesByMemberId[r.member.id] ?? [],
    kind: r.member.id === activeId ? 'accent' : 'muted',
    onSelect: () => setSelectedId(r.member.id),
  }));

  const heading = t('rank_history_title', { n: weekSpan });

  return (
    <section className={styles.panel} aria-labelledby="rank-history-heading">
      <h2 id="rank-history-heading">{heading}</h2>
      <p className={styles.sub}>{t('rank_history_subtitle')}</p>
      <LineChart
        labels={labels}
        series={series}
        yMin={1}
        yMax={maxRank}
        yTicks={Array.from({ length: maxRank }, (_, i) => i + 1).filter((v) => v === 1 || v === maxRank || v % 2 === 0)}
        invertY
        ariaLabel={heading}
        height={Math.max(260, Math.min(560, pool.length * 20 + 60))}
        valueLabel={(v) => String(Math.round(v))}
        showDataTableLabel={t('show_data_table')}
        emptyValueLabel={t('missing_value')}
      />
    </section>
  );
}
