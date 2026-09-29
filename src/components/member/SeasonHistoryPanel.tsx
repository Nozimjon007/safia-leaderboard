import { Link } from 'react-router-dom';
import { seasonQuarterLabel, useI18n } from '../../i18n';
import { formatScore } from '../../lib/format';
import type { SeasonHistoryEntry } from '../../hooks/useMemberProgress';
import { weekEndISO, weekIndexesInRange, weekStartISO } from '../../lib/dates';
import type { LeaderboardDataset } from '../../data/types';
import styles from './SeasonHistoryPanel.module.css';

interface SeasonHistoryPanelProps {
  entries: SeasonHistoryEntry[]; // oldest first
  dataset: LeaderboardDataset;
}

/** This member's rank and score, season by season — completed seasons keep their standings permanently. */
export function SeasonHistoryPanel({ entries, dataset }: SeasonHistoryPanelProps) {
  const { t, locale } = useI18n();
  const newestFirst = [...entries].reverse();

  return (
    <section className={styles.panel} aria-labelledby="season-history-heading">
      <h2 id="season-history-heading">{t('seasons_archive_title')}</h2>
      <ul className={styles.list}>
        {newestFirst.map((entry) => {
          const idxs = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, entry.season.startISO, entry.season.endISO);
          const search = idxs.length
            ? `?from=${weekStartISO(dataset.firstWeekStart, idxs[0])}&to=${weekEndISO(dataset.firstWeekStart, idxs[idxs.length - 1])}`
            : '';
          return (
            <li key={entry.season.id} className={styles.row}>
              <Link className={styles.seasonLink} to={{ pathname: '/', search }}>
                {seasonQuarterLabel(t, entry.season)}
              </Link>
              <span className={styles.currentTag} hidden={entry.isComplete}>
                {t('season_current_badge')}
              </span>
              <span className={styles.rank}>
                {entry.rank == null ? '—' : `#${entry.rank}${entry.rankedCount ? ` / ${entry.rankedCount}` : ''}`}
              </span>
              <span className={`${styles.score} tabular`}>{formatScore(entry.overall, locale)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
