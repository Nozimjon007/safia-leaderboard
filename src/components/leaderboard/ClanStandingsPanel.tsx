import type { LeaderboardDataset, Member, ScoringConfig } from '../../data/types';
import type { ClanId } from '../../lib/clans';
import type { ClanStanding } from '../../lib/clanPoints';
import type { Season } from '../../lib/seasons';
import { useI18n } from '../../i18n';
import { ClanStandingCard } from './ClanStandingCard';
import { ClanSeasonProgressChart } from './ClanSeasonProgressChart';
import styles from './ClanStandingsPanel.module.css';

interface ClanStandingsPanelProps {
  standings: readonly ClanStanding[];
  memberById: Record<string, Member>;
  /** e.g. "Site 2" or "Shift 1" — mirrors TopFive's own filterLabel so a narrowed Clans view is
   * never mistaken for the whole season's standings. */
  filterLabel: string | null;
  dataset: LeaderboardDataset;
  config: ScoringConfig;
  clanAssignments: Record<string, ClanId>;
  season: Season | null;
}

/** The Clans view of the Season Results hero (BoardModeToggle) — four full standings cards in place
 * of the solo top five. */
export function ClanStandingsPanel({ standings, memberById, filterLabel, dataset, config, clanAssignments, season }: ClanStandingsPanelProps) {
  const { t } = useI18n();

  return (
    <section className={styles.section} aria-labelledby="clan-standings-heading">
      <h2 id="clan-standings-heading" className={styles.heading}>
        {filterLabel ? t('clan_standings_heading_filtered', { filter: filterLabel }) : t('clan_standings_heading')}
      </h2>
      <p className={styles.disclaimer}>
        {t('clan_disclaimer')} {t('clan_points_disclaimer')}
      </p>
      <ClanSeasonProgressChart dataset={dataset} config={config} clanAssignments={clanAssignments} season={season} />
      <ul className={styles.grid}>
        {standings.map((s) => (
          <li key={s.clanId}>
            <ClanStandingCard standing={s} memberById={memberById} />
          </li>
        ))}
      </ul>
      <p className={styles.note}>{t('clan_points_avg_note')}</p>
    </section>
  );
}
