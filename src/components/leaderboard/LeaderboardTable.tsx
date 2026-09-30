import { useState } from 'react';
import { Link, useLocation, type Location } from 'react-router-dom';
import { CATEGORY_KEYS, type MetricKey, type SortKey, type Zone } from '../../data/types';
import { categoryLabel, roleLabel, useI18n } from '../../i18n';
import { trendDirection, zoneOf, type LeaderboardRow, type TeamStats } from '../../lib/scoring';
import { formatPercent, formatScore } from '../../lib/format';
import { useScoringConfig } from '../../state/ScoringConfigProvider';
import { medalFor, zoneColorVar, zoneGlyph } from '../../lib/zoneStyle';
import type { CraftPreview } from '../../lib/craftPaths';
import { Avatar } from '../common/Avatar';
import { MoveBadge } from '../common/MoveBadge';
import { ZoneBadge } from '../common/ZoneBadge';
import { Meter } from '../charts/Meter';
import { Sparkline } from '../charts/Sparkline';
import { RowExpandPanel } from './RowExpandPanel';
import { CompareToggle } from './CompareToggle';
import type { LeaderboardFilters } from '../../hooks/useLeaderboardFilters';
import styles from './LeaderboardTable.module.css';

interface LeaderboardTableProps {
  rows: LeaderboardRow[];
  team: TeamStats;
  filters: LeaderboardFilters;
  onChange: (patch: Partial<Record<keyof LeaderboardFilters, string>>) => void;
  compareIds: string[];
  onToggleCompare: (id: string) => void;
  /** The member "Find my position" just jumped to — briefly highlighted, not a persistent selection state. */
  highlightedId?: string | null;
  /** This season's Craft Path preview, keyed by member id — see LeaderboardPage. Only ever populated
   * for the rows actually being rendered. */
  craftPreviewByMember?: Record<string, CraftPreview>;
}

const COLUMN_COUNT = 4 + CATEGORY_KEYS.length + 2;

export function LeaderboardTable({ rows, team, filters, onChange, compareIds, onToggleCompare, highlightedId, craftPreviewByMember }: LeaderboardTableProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function sortHeader(key: SortKey, label: string, highlighted: boolean) {
    const active = filters.sortKey === key;
    const nextDir = active && filters.sortDir === 'asc' ? 'desc' : key === 'rank' || key === 'name' ? 'asc' : 'desc';
    return (
      <th scope="col" key={key} className={highlighted ? styles.hl : undefined} aria-sort={active ? (filters.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" onClick={() => onChange({ sortKey: key, sortDir: nextDir })}>
          {label} <span aria-hidden="true">{active ? (filters.sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
        </button>
      </th>
    );
  }

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption className="visually-hidden">{t('nav_leaderboard')}</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">{t('compare_toggle_label')}</span>
            </th>
            {sortHeader('rank', t('col_rank'), false)}
            {sortHeader('name', t('col_member'), false)}
            {sortHeader('overall', t('col_overall'), filters.metric === 'overall')}
            {CATEGORY_KEYS.map((c) => sortHeader(c, categoryLabel(t, c), filters.metric === c))}
            <th scope="col">{t('col_trend')}</th>
            <th scope="col">
              <span className="visually-hidden">{t('col_details')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TableRow
              key={row.member.id}
              row={row}
              team={team}
              metric={filters.metric}
              isOpen={expanded.has(row.member.id)}
              onToggle={() => toggle(row.member.id)}
              compareSelected={compareIds.includes(row.member.id)}
              onToggleCompare={() => onToggleCompare(row.member.id)}
              highlighted={highlightedId === row.member.id}
              craftPreview={craftPreviewByMember?.[row.member.id] ?? null}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface TableRowProps {
  row: LeaderboardRow;
  team: TeamStats;
  metric: MetricKey;
  isOpen: boolean;
  onToggle: () => void;
  compareSelected: boolean;
  onToggleCompare: () => void;
  highlighted: boolean;
  craftPreview: CraftPreview | null;
}

function TableRow({ row, team, metric, isOpen, onToggle, compareSelected, onToggleCompare, highlighted, craftPreview }: TableRowProps) {
  const { t, locale } = useI18n();
  const { config } = useScoringConfig();
  const location: Location = useLocation();
  const zone = zoneOf(row.current.overall, config);
  const { direction, delta } = trendDirection(row.trend);
  const trendZone: Zone = direction > 0 ? 'good' : direction < 0 ? 'low' : 'mid';
  const trendLabel =
    delta == null
      ? t('trend_na')
      : direction === 0
        ? t('trend_flat', { n: row.trend.length })
        : direction > 0
          ? t('trend_up', { d: formatScore(Math.abs(delta), locale), n: row.trend.length })
          : t('trend_down', { d: formatScore(Math.abs(delta), locale), n: row.trend.length });

  return (
    <>
      <tr id={`board-row-table-${row.member.id}`} className={styles.row} data-compare-selected={compareSelected || undefined} data-highlighted={highlighted || undefined}>
        <td>
          <CompareToggle selected={compareSelected} name={row.member.name} onToggle={onToggleCompare} />
        </td>
        <td>
          {row.overallRank == null ? (
            <span className={styles.rankNum} title={t('unranked_note')}>
              –
            </span>
          ) : (
            <div className={styles.rankCell} title={t('season_rank_note')}>
              <span className={`${styles.rankNum} tabular`} data-medal={medalFor(row.overallRank)}>
                {row.overallRank}
              </span>
              <MoveBadge move={row.overallMove} />
            </div>
          )}
        </td>
        <td>
          <div className={styles.member}>
            <Avatar id={row.member.id} name={row.member.name} photoUrl={row.member.avatarPhoto} />
            <div className={styles.memberWho}>
              <Link to={{ pathname: `/member/${row.member.id}`, search: location.search }} className={styles.memberName}>
                {row.member.name}
              </Link>
              <small>
                {roleLabel(t, row.member.role)} · {row.member.area} <span className={styles.shiftTag}>{row.member.shift}</span>
              </small>
            </div>
          </div>
        </td>
        <td className={styles.overallCell}>
          {row.current.overall == null ? (
            <span className={styles.naCell}>
              —<span className="visually-hidden"> {t('missing_value')}</span>
            </span>
          ) : (
            <>
              <div className={styles.overallValue}>
                <b className="tabular" style={{ color: zoneColorVar(zone) }}>
                  {formatScore(row.current.overall, locale)}
                </b>
                <span>/100</span>
              </div>
              <Meter value={row.current.overall} zone={zone} markerValue={team.average} />
              <ZoneBadge zone={zone} className={styles.zoneBadgeSpacing} />
              {row.current.missingCategories.length > 0 && (
                <div className={styles.partialNote}>
                  {t('zone_na')}: {row.current.missingCategories.map((c) => categoryLabel(t, c)).join(', ')}
                </div>
              )}
            </>
          )}
        </td>
        {CATEGORY_KEYS.map((c) => {
          const v = row.current.categories[c];
          const cellZone = zoneOf(v, config);
          const showMetricRank = metric === c && row.rank != null;
          return (
            <td key={c}>
              {v == null ? (
                <span className={styles.naCell}>
                  —<span className="visually-hidden"> {t('missing_value')}</span>
                </span>
              ) : (
                <span className={styles.catValue} style={{ color: zoneColorVar(cellZone) }}>
                  <span aria-hidden="true">{zoneGlyph(cellZone)}</span> {formatPercent(v)}
                  {showMetricRank && (
                    <span className={styles.metricRankChip} title={t('category_rank_note', { category: categoryLabel(t, c) })}>
                      #{row.rank}
                    </span>
                  )}
                </span>
              )}
            </td>
          );
        })}
        <td>
          <Sparkline values={row.trend} zone={trendZone} ariaLabel={trendLabel} emptyLabel={t('trend_na')} />
        </td>
        <td>
          <button
            type="button"
            className={styles.expandBtn}
            aria-expanded={isOpen}
            aria-controls={`expand-${row.member.id}`}
            aria-label={t('expand_row', { name: row.member.name })}
            onClick={onToggle}
          >
            <span aria-hidden="true">▾</span>
          </button>
        </td>
      </tr>
      {isOpen && (
        <tr className={styles.expandRow} id={`expand-${row.member.id}`}>
          <td colSpan={COLUMN_COUNT}>
            <RowExpandPanel row={row} team={team} craftPreview={craftPreview} />
          </td>
        </tr>
      )}
    </>
  );
}
