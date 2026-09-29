import { useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import type { CategoryKey, LeaderboardDataset, Member, ScoringConfig } from '../data/types';
import { CATEGORY_KEYS } from '../data/types';
import { categoryLabel, roleLabel, seasonQuarterLabel, useI18n } from '../i18n';
import { useDatasetContext } from '../state/DatasetProvider';
import { useLeaderboardFilters, type LeaderboardFilters } from '../hooks/useLeaderboardFilters';
import { useLeaderboardResult } from '../hooks/useLeaderboardResult';
import { useSeasons } from '../hooks/useSeasons';
import { useScoringConfig } from '../state/ScoringConfigProvider';
import { compareMembers, weekOverall, type LeaderboardResult } from '../lib/scoring';
import { formatDateRange, formatShortDate, weekEndISO, weekIndexesInRange, weekStartISO } from '../lib/dates';
import { formatScore } from '../lib/format';
import { DemoBanner } from '../components/common/DemoBanner';
import { StateMessage } from '../components/common/StateMessage';
import { RadarChart } from '../components/charts/RadarChart';
import { LineChart } from '../components/charts/LineChart';
import { CompareIdentityCard } from '../components/compare/CompareIdentityCard';
import { CompareCategoryRow } from '../components/compare/CompareCategoryRow';
import { LeaderboardSkeleton } from '../components/leaderboard/LeaderboardSkeleton';
import styles from './ComparePage.module.css';

const COLOR_A = 'var(--accent)';
const COLOR_B = 'var(--cat-2)';

function stripCompareParams(search: string): string {
  const params = new URLSearchParams(search);
  params.delete('a');
  params.delete('b');
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function ComparePage() {
  const { t, locale } = useI18n();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { status, dataset, error, reload } = useDatasetContext();
  const { filters } = useLeaderboardFilters(dataset);
  const { config } = useScoringConfig();
  const result = useLeaderboardResult(dataset, filters, config);
  const seasonsInfo = useSeasons(dataset);
  const [allowCrossRole, setAllowCrossRole] = useState(false);
  const backHref = { pathname: '/', search: stripCompareParams(location.search) };

  if (status === 'error') {
    return (
      <>
        <DemoBanner />
        <StateMessage
          title={t('state_error_title')}
          role="alert"
          body={
            <>
              {t('state_error_body')}
              <br />
              <span className={styles.errDetail}>{error}</span>
            </>
          }
          action={
            <button type="button" className="btn btnPrimary" onClick={reload}>
              {t('state_retry')}
            </button>
          }
        />
      </>
    );
  }

  if (status === 'loading' || !dataset || !result) {
    return (
      <>
        <DemoBanner />
        <LeaderboardSkeleton />
      </>
    );
  }

  const idA = params.get('a');
  const idB = params.get('b');
  const memberA = idA ? (dataset.members.find((m) => m.id === idA) ?? null) : null;
  const memberB = idB ? (dataset.members.find((m) => m.id === idB) ?? null) : null;
  const sameMember = Boolean(memberA && memberB && memberA.id === memberB.id);
  const sortedMembers = [...dataset.members].sort((x, y) => x.name.localeCompare(y.name));
  const bOptions =
    memberA && !allowCrossRole ? sortedMembers.filter((m) => m.role === memberA.role || m.id === idB) : sortedMembers;
  const isCrossRole = Boolean(memberA && memberB && memberA.role !== memberB.role);

  const periodMatchLabel = (() => {
    if (!seasonsInfo) return null;
    const match = seasonsInfo.seasons.find((s) => {
      const idxs = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, s.startISO, s.endISO);
      if (!idxs.length) return false;
      return (
        weekStartISO(dataset.firstWeekStart, idxs[0]) === filters.fromISO &&
        weekEndISO(dataset.firstWeekStart, idxs[idxs.length - 1]) === filters.toISO
      );
    });
    return match ? seasonQuarterLabel(t, match) : formatDateRange(filters.fromISO, filters.toISO, locale);
  })();

  function pick(side: 'a' | 'b', id: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!id) {
          next.delete(side);
          return next;
        }
        next.set(side, id);
        const other = side === 'a' ? 'b' : 'a';
        if (next.get(other) === id) next.delete(other);
        return next;
      },
      { replace: true },
    );
  }

  return (
    <>
      <DemoBanner />
      <div className={styles.crumbs}>
        <Link className={styles.backLink} to={backHref}>
          ← {t('back_to_leaderboard')}
        </Link>
      </div>
      <div className={styles.head}>
        <h1>{t('compare_title')}</h1>
        <p className={styles.subtitle}>{t('compare_subtitle')}</p>
        {periodMatchLabel && <p className={styles.seasonNote}>{t('compare_season_note', { season: periodMatchLabel })}</p>}
      </div>

      <div className={styles.pickers}>
        <label className={styles.pickerField}>
          <span className="fieldLabel">{t('compare_pick_a')}</span>
          <select className="select" value={idA ?? ''} onChange={(e) => pick('a', e.target.value)}>
            <option value="">{t('compare_select_placeholder')}</option>
            {sortedMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {roleLabel(t, m.role)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.pickerField}>
          <span className="fieldLabel">{t('compare_pick_b')}</span>
          <select className="select" value={idB ?? ''} onChange={(e) => pick('b', e.target.value)}>
            <option value="">{t('compare_select_placeholder')}</option>
            {bOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {roleLabel(t, m.role)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.crossRoleToggle}>
          <input type="checkbox" checked={allowCrossRole} onChange={(e) => setAllowCrossRole(e.target.checked)} />
          {t('compare_cross_role')}
        </label>
      </div>
      {memberA && memberB && !isCrossRole && <p className={styles.roleNote}>{t('compare_role_note', { role: memberA.role })}</p>}
      {isCrossRole && <p className={styles.roleNoteWarn}>{t('compare_cross_role_note')}</p>}

      {!memberA || !memberB ? (
        <StateMessage title={t('compare_title')} body={t('compare_choose_prompt')} />
      ) : sameMember ? (
        <StateMessage title={t('compare_title')} body={t('compare_same_member_error')} />
      ) : (
        <ComparisonBody dataset={dataset} filters={filters} config={config} result={result} memberA={memberA} memberB={memberB} />
      )}
    </>
  );
}

interface ComparisonBodyProps {
  dataset: LeaderboardDataset;
  filters: LeaderboardFilters;
  config: ScoringConfig;
  result: LeaderboardResult;
  memberA: Member;
  memberB: Member;
}

function ComparisonBody({ dataset, filters, config, result, memberA, memberB }: ComparisonBodyProps) {
  const { t, locale } = useI18n();

  const weekIndexes = useMemo(
    () => weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, filters.fromISO, filters.toISO),
    [dataset, filters.fromISO, filters.toISO],
  );

  const comparison = useMemo(
    () => compareMembers(dataset.scores[memberA.id], dataset.scores[memberB.id], weekIndexes, config),
    [dataset, memberA.id, memberB.id, weekIndexes, config],
  );

  const rowA = result.rows.find((r) => r.member.id === memberA.id) ?? null;
  const rowB = result.rows.find((r) => r.member.id === memberB.id) ?? null;
  const rankedCount = result.rows.filter((r) => r.rank != null).length;

  const categoryLabels = Object.fromEntries(CATEGORY_KEYS.map((c) => [c, categoryLabel(t, c)])) as Record<CategoryKey, string>;

  const history = useMemo(() => {
    const labels: string[] = [];
    const a: Array<number | null> = [];
    const b: Array<number | null> = [];
    for (let w = 0; w < dataset.weekCount; w++) {
      labels.push(formatShortDate(weekStartISO(dataset.firstWeekStart, w)));
      a.push(weekOverall(dataset.scores[memberA.id], w, config));
      b.push(weekOverall(dataset.scores[memberB.id], w, config));
    }
    return { labels, a, b };
  }, [dataset, memberA.id, memberB.id, config]);

  const band: [number, number] | null = weekIndexes.length ? [weekIndexes[0], weekIndexes[weekIndexes.length - 1]] : null;
  const hasHistory = history.a.some((v) => v != null) && history.b.some((v) => v != null);

  let insight: string;
  if (comparison.aWins === 0 && comparison.bWins === 0 && comparison.ties === 0) {
    // No category has data on both sides — a "tie" claim would be misleading here.
    insight = t('compare_insight_no_data');
  } else if (comparison.aWins === 0 && comparison.bWins === 0) {
    insight = t('compare_insight_overall_tie');
  } else {
    const leaderIsA = comparison.aWins >= comparison.bWins;
    const winsCount = leaderIsA ? comparison.aWins : comparison.bWins;
    const leaderName = leaderIsA ? memberA.name : memberB.name;
    insight = t('compare_insight_lead', { name: leaderName, n: winsCount, total: CATEGORY_KEYS.length });
    if (comparison.ties > 0) insight += t('compare_insight_tied', { n: comparison.ties });
  }

  return (
    <>
      <div className={styles.identities}>
        <CompareIdentityCard
          member={memberA}
          stats={comparison.a}
          color={COLOR_A}
          rank={rowA?.rank ?? null}
          rankedCount={rankedCount}
          inCurrentView={rowA != null}
          move={rowA?.move ?? null}
        />
        <CompareIdentityCard
          member={memberB}
          stats={comparison.b}
          color={COLOR_B}
          rank={rowB?.rank ?? null}
          rankedCount={rankedCount}
          inCurrentView={rowB != null}
          move={rowB?.move ?? null}
        />
      </div>

      <section className={styles.panel}>
        <h2>{t('breakdown_title')}</h2>
        <p className={styles.insight}>{insight}</p>
        <div className={styles.rows}>
          {comparison.categories.map((entry) => (
            <CompareCategoryRow key={entry.category} entry={entry} colorA={COLOR_A} colorB={COLOR_B} nameA={memberA.name} nameB={memberB.name} />
          ))}
        </div>
      </section>

      <div className={styles.twoCol}>
        <section className={styles.panel}>
          <h2>{t('compare_radar_title')}</h2>
          <RadarChart
            seriesA={{ values: comparison.a.categories, label: memberA.name, color: COLOR_A }}
            seriesB={{ values: comparison.b.categories, label: memberB.name, color: COLOR_B }}
            categoryLabels={categoryLabels}
            ariaLabel={t('compare_radar_title')}
            missingValueLabel={t('missing_value')}
            formatValue={(v) => `${Math.round(v)}%`}
          />
        </section>
        <section className={styles.panel}>
          <h2>{t('compare_history_title')}</h2>
          {hasHistory ? (
            <LineChart
              labels={history.labels}
              series={[
                { id: 'a', label: memberA.name, values: history.a, kind: 'accent', color: COLOR_A },
                { id: 'b', label: memberB.name, values: history.b, kind: 'accent', color: COLOR_B },
              ]}
              yMin={20}
              yMax={100}
              yTicks={[20, 40, 60, 80, 100]}
              bandRange={band}
              ariaLabel={t('compare_history_title')}
              valueLabel={(v) => formatScore(v, locale)}
              showDataTableLabel={t('show_data_table')}
              emptyValueLabel={t('missing_value')}
            />
          ) : (
            <p className={styles.insight}>{t('no_history')}</p>
          )}
        </section>
      </div>
    </>
  );
}
