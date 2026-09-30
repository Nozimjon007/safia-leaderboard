import { Link, useLocation } from 'react-router-dom';
import type { Member } from '../../data/types';
import type { ClanId } from '../../lib/clans';
import { clanName, roleDescription, roleIcon, roleLabel, useI18n } from '../../i18n';
import { formatScore } from '../../lib/format';
import { ClanCrest } from './ClanCrest';
import styles from './JobPanel.module.css';

interface JobPanelProps {
  member: Member;
  clanId: ClanId | null;
  /** This member's own season rank/score — always shown as *individual*, never mixed with clan
   * contribution points (see lib/clans.ts / the clan detail page for those). */
  overallRank: number | null;
  overallScore: number | null;
  compact?: boolean;
  /** False only where the surrounding card already shows the same rank/score a step away (e.g. the
   * top-five supporting cards) — everywhere else this is the one place that number appears. */
  showSoloStat?: boolean;
}

/**
 * "Understand the employee's work without opening their profile" — job title, a real one-sentence
 * description (never "Works at Safia" filler, see i18n's roleDescription), site/team, and which
 * clan they belong to. Reused at every size from the top-five centerpiece down to a table row.
 */
export function JobPanel({ member, clanId, overallRank, overallScore, compact, showSoloStat = true }: JobPanelProps) {
  const { t, locale } = useI18n();
  const location = useLocation();
  const description = roleDescription(t, member.role);

  return (
    <div className={styles.panel} data-compact={compact || undefined}>
      <div className={styles.titleRow}>
        <span className={styles.roleIcon} aria-hidden="true">
          {roleIcon(member.role)}
        </span>
        <span className={styles.roleTitle}>{roleLabel(t, member.role)}</span>
      </div>

      {description && <p className={styles.roleDesc}>{description}</p>}

      <p className={styles.siteLine}>
        {member.area} <span className={styles.shiftTag}>{member.shift}</span>
      </p>

      {clanId && (
        <Link className={styles.clanRow} to={{ pathname: `/clans/${clanId}`, search: location.search }}>
          <ClanCrest clanId={clanId} size={compact ? 18 : 24} />
          <span className={styles.clanName}>{clanName(t, clanId)}</span>
        </Link>
      )}

      {showSoloStat && (
        <div className={styles.soloStat}>
          <span className={styles.soloLabel}>{t('job_panel_solo_label')}</span>
          <span className={`${styles.soloValue} tabular`}>
            {overallRank != null ? `#${overallRank}` : '—'} <span className={styles.soloScore}>· {formatScore(overallScore, locale)}</span>
          </span>
        </div>
      )}
    </div>
  );
}
