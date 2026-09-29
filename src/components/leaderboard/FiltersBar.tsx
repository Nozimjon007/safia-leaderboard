import { seasonQuarterLabel, useI18n } from '../../i18n';
import type { LeaderboardDataset } from '../../data/types';
import type { LeaderboardFilters } from '../../hooks/useLeaderboardFilters';
import { presetRangeFor } from '../../hooks/useLeaderboardFilters';
import { weekEndISO } from '../../lib/dates';
import { currentSeasonIndex, isSeasonComplete, listSeasons, seasonWeekRange } from '../../lib/seasons';
import styles from './FiltersBar.module.css';

interface FiltersBarProps {
  filters: LeaderboardFilters;
  dataset: LeaderboardDataset;
  areaOptions: string[];
  onChange: (patch: Partial<Record<keyof LeaderboardFilters, string>>) => void;
  onExport: () => void;
  exportDisabled?: boolean;
  /** True while the Season Time Machine owns the period — its slider is the one control for "when", so the
   * season/preset/date pickers here are disabled rather than left to silently fight it over the same from/to. */
  periodLockedByTimeMachine?: boolean;
}

const PRESETS = [1, 4, 8] as const;

export function FiltersBar({
  filters,
  dataset,
  areaOptions,
  onChange,
  onExport,
  exportDisabled,
  periodLockedByTimeMachine,
}: FiltersBarProps) {
  const { t } = useI18n();
  const minDate = dataset.firstWeekStart;
  const maxDate = weekEndISO(dataset.firstWeekStart, dataset.weekCount - 1);

  const today = new Date().toISOString().slice(0, 10);
  const seasons = listSeasons(dataset.firstWeekStart, today);
  const curIdx = currentSeasonIndex(seasons);
  const seasonsNewestFirst = [...seasons].reverse();
  const activeSeasonId =
    seasonsNewestFirst.find((s) => {
      const r = seasonWeekRange(dataset, s);
      return r && r.from === filters.fromISO && r.to === filters.toISO;
    })?.id ?? '';

  function isPresetActive(n: number): boolean {
    const r = presetRangeFor(dataset, n);
    return filters.fromISO === r.from && filters.toISO === r.to;
  }

  return (
    <form className={styles.filters} onSubmit={(e) => e.preventDefault()} aria-label={t('period_label')}>
      {periodLockedByTimeMachine && <p className={styles.timeMachineNote}>{t('filters_locked_by_time_machine')}</p>}
      <div className={styles.field}>
        <label className="fieldLabel" htmlFor="filter-season">
          {t('season_selector_label')}
        </label>
        <select
          id="filter-season"
          className="select"
          value={activeSeasonId}
          disabled={periodLockedByTimeMachine}
          onChange={(e) => {
            const season = seasons.find((s) => s.id === e.target.value);
            const r = season ? seasonWeekRange(dataset, season) : null;
            if (r) onChange({ fromISO: r.from, toISO: r.to });
          }}
        >
          {!activeSeasonId && <option value="">{t('period_label')}</option>}
          {seasonsNewestFirst.map((s) => {
            const isCurrent = seasons.indexOf(s) === curIdx;
            const isComplete = isSeasonComplete(s);
            const suffix = isCurrent ? ` — ${t('season_current_badge')}` : isComplete ? ` — ${t('season_complete_badge')}` : '';
            return (
              <option key={s.id} value={s.id}>
                {seasonQuarterLabel(t, s)}
                {suffix}
              </option>
            );
          })}
        </select>
      </div>

      <div className={styles.field}>
        <span className="fieldLabel" id="period-preset-label">
          {t('period_label')}
        </span>
        <div className="segment" role="group" aria-labelledby="period-preset-label">
          {PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={isPresetActive(n)}
              disabled={periodLockedByTimeMachine}
              onClick={() => {
                const r = presetRangeFor(dataset, n);
                onChange({ fromISO: r.from, toISO: r.to });
              }}
            >
              {n === 1 ? t('period_last_1') : t(n === 4 ? 'period_last_4' : 'period_last_8')}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label className="fieldLabel" htmlFor="filter-from">
          {t('period_from')}
        </label>
        <input
          id="filter-from"
          className="input"
          type="date"
          value={filters.fromISO}
          min={minDate}
          max={maxDate}
          disabled={periodLockedByTimeMachine}
          onChange={(e) => e.target.value && onChange({ fromISO: e.target.value })}
        />
      </div>
      <div className={styles.field}>
        <label className="fieldLabel" htmlFor="filter-to">
          {t('period_to')}
        </label>
        <input
          id="filter-to"
          className="input"
          type="date"
          value={filters.toISO}
          min={minDate}
          max={maxDate}
          disabled={periodLockedByTimeMachine}
          onChange={(e) => e.target.value && onChange({ toISO: e.target.value })}
        />
      </div>

      <div className={styles.field}>
        <label className="fieldLabel" htmlFor="filter-shift">
          {t('shift_label')}
        </label>
        <select id="filter-shift" className="select" value={filters.shift} onChange={(e) => onChange({ shift: e.target.value })}>
          <option value="all">{t('shift_all')}</option>
          <option value="S1">{t('shift_n', { n: 1 })}</option>
          <option value="S2">{t('shift_n', { n: 2 })}</option>
        </select>
      </div>

      <div className={styles.field}>
        <label className="fieldLabel" htmlFor="filter-area">
          {t('area_label')}
        </label>
        <select id="filter-area" className="select" value={filters.area} onChange={(e) => onChange({ area: e.target.value })}>
          <option value="all">{t('area_all')}</option>
          {areaOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className={`${styles.field} ${styles.grow}`}>
        <label className="fieldLabel" htmlFor="filter-search">
          {t('search_label')}
        </label>
        <input
          id="filter-search"
          className="input"
          type="search"
          placeholder={t('search_placeholder')}
          value={filters.query}
          autoComplete="off"
          onChange={(e) => onChange({ query: e.target.value })}
        />
      </div>

      <button type="button" className="btn" onClick={onExport} disabled={exportDisabled}>
        {t('export_button')}
      </button>
    </form>
  );
}
