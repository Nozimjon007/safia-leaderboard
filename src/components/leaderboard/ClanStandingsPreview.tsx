import type { Member } from '../../data/types';
import type { ClanStanding } from '../../lib/clanPoints';
import { useI18n } from '../../i18n';
import { ClanStandingCard } from './ClanStandingCard';
import styles from './ClanStandingsPreview.module.css';

interface ClanStandingsPreviewProps {
  standings: readonly ClanStanding[];
  memberById: Record<string, Member>;
}

/** A compact teaser strip under the solo top five — full detail lives one click away in the Clans
 * view (BoardModeToggle) or a clan's own detail page. */
export function ClanStandingsPreview({ standings, memberById }: ClanStandingsPreviewProps) {
  const { t } = useI18n();
  if (!standings.length) return null;

  return (
    <section className={styles.section} aria-labelledby="clan-preview-heading">
      <h3 id="clan-preview-heading" className={styles.heading}>
        {t('clan_standings_preview_heading')}
      </h3>
      <ul className={styles.grid}>
        {standings.map((s) => (
          <li key={s.clanId}>
            <ClanStandingCard standing={s} memberById={memberById} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}
