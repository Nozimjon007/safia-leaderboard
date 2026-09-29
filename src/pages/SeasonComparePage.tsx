import { useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CATEGORY_KEYS } from '../data/types';
import { categoryLabel, roleLabel, seasonQuarterLabel, useI18n } from '../i18n';
import { useDatasetContext } from '../state/DatasetProvider';
import { useScoringConfig } from '../state/ScoringConfigProvider';
import { buildLeaderboard } from '../lib/scoring';
import { isSeasonApproved, listSeasons, type Season } from '../lib/seasons';
import { weekIndexesInRange } from '../lib/dates';
import { formatScore, formatSigned } from '../lib/format';
import { DemoBanner } from '../components/common/DemoBanner';
import { StateMessage } from '../components/common/StateMessage';
import { LeaderboardSkeleton } from '../components/leaderboard/LeaderboardSkeleton';
import { Avatar } from '../components/common/Avatar';
import type { LeaderboardDataset, ScoringConfig } from '../data/types';
import styles from './SeasonComparePage.module.css';

export function SeasonComparePage() {
  const { t, locale } = useI18n();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { status, dataset, error, reload } = useDatasetContext();
  const { config } = useScoringConfig();

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
              {error}
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

  if (status === 'loading' || !dataset) {
    return (
      <>
        <DemoBanner />
        <LeaderboardSkeleton />
      </>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const approvedSeasons = listSeasons(dataset.firstWeekStart, today)
    .filter((s) => isSeasonApproved(s))
    .reverse();

  const idA = params.get('a');
  const idB = params.get('b');
  const memberId = params.get('member');
  const seasonA = approvedSeasons.find((s) => s.id === idA) ?? null;
  const seasonB = approvedSeasons.find((s) => s.id === idB) ?? null;

  function pick(key: 'a' | 'b' | 'member', value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value) {
          next.delete(key);
          return next;
        }
        next.set(key, value);
        if (key === 'a' && next.get('b') === value) next.delete('b');
        if (key === 'b' && next.get('a') === value) next.delete('a');
        return next;
      },
      { replace: true },
    );
  }

  return (
    <>
      <DemoBanner />
      <div className={styles.crumbs}>
        <Link className={styles.backLink} to={{ pathname: '/seasons', search: location.search }}>
          ← {t('seasons_page_title')}
        </Link>
      </div>
      <div className={styles.head}>
        <h1>{t('seasons_compare_title')}</h1>
        <p className={styles.subtitle}>{t('seasons_compare_subtitle')}</p>
      </div>

      {approvedSeasons.length < 2 ? (
        <StateMessage title={t('seasons_compare_title')} body={t('seasons_compare_not_enough')} />
      ) : (
        <>
          <div className={styles.pickers}>
            <label className={styles.pickerField}>
              <span className="fieldLabel">{t('seasons_compare_pick_a')}</span>
              <select className="select" value={idA ?? ''} onChange={(e) => pick('a', e.target.value)}>
                <option value="">{t('seasons_compare_select_placeholder')}</option>
                {approvedSeasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {seasonQuarterLabel(t, s)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.pickerField}>
              <span className="fieldLabel">{t('seasons_compare_pick_b')}</span>
              <select className="select" value={idB ?? ''} onChange={(e) => pick('b', e.target.value)}>
                <option value="">{t('seasons_compare_select_placeholder')}</option>
                {approvedSeasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {seasonQuarterLabel(t, s)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.pickerField}>
              <span className="fieldLabel">{t('seasons_compare_pick_member')}</span>
              <select className="select" value={memberId ?? ''} onChange={(e) => pick('member', e.target.value)}>
                <option value="">{t('seasons_compare_pick_member_none')}</option>
                {[...dataset.members]
                  .sort((x, y) => x.name.localeCompare(y.name))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          {!seasonA || !seasonB ? (
            <StateMessage title={t('seasons_compare_title')} body={t('seasons_compare_choose_prompt')} />
          ) : (
            <ComparisonBody dataset={dataset} config={config} seasonA={seasonA} seasonB={seasonB} memberId={memberId} locale={locale} />
          )}
        </>
      )}
    </>
  );
}

interface ComparisonBodyProps {
  dataset: LeaderboardDataset;
  config: ScoringConfig;
  seasonA: Season;
  seasonB: Season;
  memberId: string | null;
  locale: string;
}

function seasonResult(dataset: LeaderboardDataset, config: ScoringConfig, season: Season) {
  const weekIndexes = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, season.startISO, season.endISO);
  return buildLeaderboard({ members: dataset.members, scores: dataset.scores, weekIndexes, weekCount: dataset.weekCount, metric: 'overall', config });
}

function ComparisonBody({ dataset, config, seasonA, seasonB, memberId, locale }: ComparisonBodyProps) {
  const { t } = useI18n();

  const resultA = useMemo(() => seasonResult(dataset, config, seasonA), [dataset, config, seasonA]);
  const resultB = useMemo(() => seasonResult(dataset, config, seasonB), [dataset, config, seasonB]);

  const avgDelta = resultA.team.average != null && resultB.team.average != null ? resultB.team.average - resultA.team.average : null;
  const participationDelta = resultB.team.scoredCount - resultA.team.scoredCount;

  const member = memberId ? dataset.members.find((m) => m.id === memberId) : null;
  const rowA = member ? resultA.rows.find((r) => r.member.id === member.id) : null;
  const rowB = member ? resultB.rows.find((r) => r.member.id === member.id) : null;

  return (
    <div className={styles.body}>
      <section className={styles.panel}>
        <h2>{t('seasons_compare_team_title')}</h2>
        <div className={styles.grid}>
          <div className={styles.col} />
          <div className={styles.colHead}>{seasonQuarterLabel(t, seasonA)}</div>
          <div className={styles.colHead}>{seasonQuarterLabel(t, seasonB)}</div>
          <div className={styles.colHead}>{t('seasons_compare_change')}</div>

          <div className={styles.rowLabel}>{t('kpi_team_avg')}</div>
          <div className="tabular">{formatScore(resultA.team.average, locale)}</div>
          <div className="tabular">{formatScore(resultB.team.average, locale)}</div>
          <div className="tabular">{avgDelta != null ? formatSigned(avgDelta, locale) : t('seasons_compare_na')}</div>

          <div className={styles.rowLabel}>{t('seasons_compare_participation')}</div>
          <div className="tabular">{resultA.team.scoredCount}</div>
          <div className="tabular">{resultB.team.scoredCount}</div>
          <div className="tabular">{formatSigned(participationDelta, locale, 0)}</div>

          {CATEGORY_KEYS.map((c) => {
            const a = resultA.team.categoryAverages[c];
            const b = resultB.team.categoryAverages[c];
            const delta = a != null && b != null ? b - a : null;
            return (
              <>
                <div key={`${c}-label`} className={styles.rowLabel}>
                  {categoryLabel(t, c)}
                </div>
                <div key={`${c}-a`} className="tabular">
                  {a != null ? `${formatScore(a, locale)}%` : t('missing_value')}
                </div>
                <div key={`${c}-b`} className="tabular">
                  {b != null ? `${formatScore(b, locale)}%` : t('missing_value')}
                </div>
                <div key={`${c}-d`} className="tabular">
                  {delta != null ? formatSigned(delta, locale) : t('seasons_compare_na')}
                </div>
              </>
            );
          })}
        </div>
      </section>

      {member && (
        <section className={styles.panel}>
          <h2>
            <Avatar id={member.id} name={member.name} photoUrl={member.avatarPhoto} size={26} className={styles.memberAvatar} />
            <Link className={styles.memberTitleLink} to={`/member/${member.id}`}>
              {t('seasons_compare_member_title', { name: member.name })}
            </Link>
          </h2>
          <p className={styles.sub}>{roleLabel(t, member.role)}</p>
          <div className={styles.grid}>
            <div className={styles.col} />
            <div className={styles.colHead}>{seasonQuarterLabel(t, seasonA)}</div>
            <div className={styles.colHead}>{seasonQuarterLabel(t, seasonB)}</div>
            <div className={styles.colHead}>{t('seasons_compare_change')}</div>

            <div className={styles.rowLabel}>{t('col_rank')}</div>
            <div className="tabular">{rowA?.rank ?? t('seasons_compare_not_ranked')}</div>
            <div className="tabular">{rowB?.rank ?? t('seasons_compare_not_ranked')}</div>
            <div className="tabular">
              {rowA?.rank != null && rowB?.rank != null ? formatSigned(rowA.rank - rowB.rank, locale, 0) : t('seasons_compare_na')}
            </div>

            <div className={styles.rowLabel}>{t('overall_score')}</div>
            <div className="tabular">{rowA?.current.overall != null ? formatScore(rowA.current.overall, locale) : t('missing_value')}</div>
            <div className="tabular">{rowB?.current.overall != null ? formatScore(rowB.current.overall, locale) : t('missing_value')}</div>
            <div className="tabular">
              {rowA?.current.overall != null && rowB?.current.overall != null
                ? formatSigned(rowB.current.overall - rowA.current.overall, locale)
                : t('seasons_compare_na')}
            </div>
          </div>
          {(!rowA || rowA.rank == null || !rowB || rowB.rank == null) && <p className={styles.sub}>{t('seasons_compare_member_incomplete_note')}</p>}
        </section>
      )}
    </div>
  );
}
