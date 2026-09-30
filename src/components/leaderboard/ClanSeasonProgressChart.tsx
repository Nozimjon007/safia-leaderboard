import type { LeaderboardDataset, ScoringConfig } from '../../data/types';
import type { Season } from '../../lib/seasons';
import { CLAN_COLOR_VAR, CLAN_IDS, type ClanId } from '../../lib/clans';
import { computeClanSeasonProgress } from '../../lib/clanPoints';
import { formatShortDate, weekStartISO } from '../../lib/dates';
import { clanName, useI18n } from '../../i18n';
import { LineChart } from '../charts/LineChart';
import styles from './ClanSeasonProgressChart.module.css';

interface ClanSeasonProgressChartProps {
  dataset: LeaderboardDataset;
  config: ScoringConfig;
  clanAssignments: Record<string, ClanId>;
  /** Null when the current board filter matches no real season (e.g. a hand-customized date range) —
   * clan progress, like clan standings themselves, only ever makes sense against a real season. */
  season: Season | null;
}

/** The one visual all four clans share: their fair average-points measure, accumulating week by
 * week across the season, on a single timeline — "who's ahead" from ClanStandingCard plus "how the
 * race actually unfolded" that the cards alone can't show. Same underlying event stream, so it can
 * never disagree with the standings next to it. */
export function ClanSeasonProgressChart({ dataset, config, clanAssignments, season }: ClanSeasonProgressChartProps) {
  const { t } = useI18n();
  if (!season) return null;
  const progress = computeClanSeasonProgress(dataset, config, clanAssignments, CLAN_IDS, season);

  if (progress.weekIndexes.length === 0) return null;

  const labels = progress.weekIndexes.map((w) => formatShortDate(weekStartISO(dataset.firstWeekStart, w)));
  const maxVal = Math.max(1, ...CLAN_IDS.flatMap((id) => progress.averageByClan[id]));
  const yMax = Math.max(10, Math.ceil(maxVal / 10) * 10);
  const yTicks = [0, yMax / 4, yMax / 2, (yMax * 3) / 4, yMax].map((v) => Math.round(v));

  return (
    <div className={styles.wrap}>
      <h3 className={styles.heading}>{t('clan_progress_chart_heading')}</h3>
      <p className={styles.sub}>{t('clan_progress_chart_subtitle')}</p>
      <LineChart
        labels={labels}
        series={CLAN_IDS.map((id) => ({
          id,
          label: clanName(t, id),
          values: progress.averageByClan[id],
          kind: 'accent',
          color: `var(${CLAN_COLOR_VAR[id]})`,
        }))}
        yMin={0}
        yMax={yMax}
        yTicks={yTicks}
        ariaLabel={t('clan_progress_chart_title')}
        valueLabel={(v) => v.toFixed(1)}
        showDataTableLabel={t('show_data_table')}
        emptyValueLabel={t('missing_value')}
      />
    </div>
  );
}
