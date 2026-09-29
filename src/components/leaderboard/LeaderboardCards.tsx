import { Link, useLocation } from 'react-router-dom';
import { CATEGORY_KEYS, type EarnedAchievement, type Zone } from '../../data/types';
import { categoryLabel, roleLabel, useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import { computeHighlight, trendDirection, zoneOf, type LeaderboardRow, type TeamStats } from '../../lib/scoring';
import { formatPercent, formatScore, formatSigned } from '../../lib/format';
import { ACHIEVEMENT_GLYPHS, countOf, earnedAchievementTypes } from '../../lib/achievements';
import { useScoringConfig } from '../../state/ScoringConfigProvider';
import { zoneColorVar } from '../../lib/zoneStyle';
import { Avatar } from '../common/Avatar';
import { MoveBadge } from '../common/MoveBadge';
import { ZoneBadge } from '../common/ZoneBadge';
import { Meter } from '../charts/Meter';
import { Sparkline } from '../charts/Sparkline';
import { CompareToggle } from './CompareToggle';
import styles from './LeaderboardCards.module.css';

interface LeaderboardCardsProps {
  rows: LeaderboardRow[];
  team: TeamStats;
  compareIds: string[];
  onToggleCompare: (id: string) => void;
  achievementsByMember?: Record<string, EarnedAchievement[]>;
}

export function LeaderboardCards({ rows, team, compareIds, onToggleCompare, achievementsByMember }: LeaderboardCardsProps) {
  return (
    <div className={styles.grid}>
      {rows.map((row) => (
        <MemberCard
          key={row.member.id}
          row={row}
          team={team}
          compareSelected={compareIds.includes(row.member.id)}
          onToggleCompare={() => onToggleCompare(row.member.id)}
          earned={achievementsByMember?.[row.member.id] ?? []}
        />
      ))}
    </div>
  );
}

interface MemberCardProps {
  row: LeaderboardRow;
  team: TeamStats;
  compareSelected: boolean;
  onToggleCompare: () => void;
  earned: EarnedAchievement[];
}

function MemberCard({ row, team, compareSelected, onToggleCompare, earned }: MemberCardProps) {
  const { t, locale } = useI18n();
  const { config } = useScoringConfig();
  const location = useLocation();
  const zone = zoneOf(row.current.overall, config);
  const highlight = computeHighlight(row.current, row.previous);
  const earnedTypes = earnedAchievementTypes(earned);
  const memberHref = { pathname: `/member/${row.member.id}`, search: location.search };
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
    <article className={styles.card} data-compare-selected={compareSelected || undefined} style={{ borderTopColor: zoneColorVar(zone) }}>
      <CompareToggle selected={compareSelected} name={row.member.name} onToggle={onToggleCompare} className={styles.compareBtn} />
      <div className={styles.head}>
        <Avatar id={row.member.id} name={row.member.name} photoUrl={row.member.avatarPhoto} />
        <div className={styles.who}>
          <h3>
            <Link to={memberHref}>{row.member.name}</Link>
          </h3>
          <small>
            {roleLabel(t, row.member.role)} · {row.member.area} · {row.member.shift}
          </small>
        </div>
        <div className={styles.rank}>
          {row.rank == null ? (
            <span className={styles.rankNum} title={t('unranked_note')}>
              –
            </span>
          ) : (
            <span className={`${styles.rankNum} tabular`}>
              <span className="visually-hidden">{t('rank_label')} </span>
              {row.rank}
            </span>
          )}
          <MoveBadge move={row.move} />
        </div>
      </div>

      <div className={styles.score}>
        <b className="tabular" style={{ color: zoneColorVar(zone) }}>
          {formatScore(row.current.overall, locale)}
        </b>
        <span className={styles.scoreUnit}>/100</span>
        {row.current.overall != null && <ZoneBadge zone={zone} />}
        <span className={styles.trend}>
          <Sparkline values={row.trend} zone={trendZone} ariaLabel={trendLabel} emptyLabel={t('trend_na')} />
        </span>
      </div>

      <ul className={styles.mini}>
        {CATEGORY_KEYS.map((c) => {
          const v = row.current.categories[c];
          const zz = zoneOf(v, config);
          return (
            <li key={c}>
              <span className={styles.miniLabel}>{categoryLabel(t, c)}</span>
              <Meter value={v} zone={zz} markerValue={team.categoryAverages[c]} />
              <span className={styles.miniValue} style={{ color: zoneColorVar(zz) }}>
                {v == null ? '—' : formatPercent(v)}
              </span>
            </li>
          );
        })}
      </ul>

      <p className={styles.highlight}>
        {highlight.strongest ? (
          <b>
            {t('highlight_strong', {
              category: categoryLabel(t, highlight.strongest.category),
              value: Math.round(highlight.strongest.value),
            })}
          </b>
        ) : (
          t('highlight_none')
        )}
        {highlight.mostImproved && (
          <>
            <br />
            {t('highlight_improved', {
              category: categoryLabel(t, highlight.mostImproved.category),
              delta: formatSigned(highlight.mostImproved.delta, locale),
            })}
          </>
        )}
      </p>

      {earnedTypes.length > 0 && (
        <ul className={styles.badges} aria-label={t('badges_title')}>
          {earnedTypes.map((id) => {
            const count = countOf(earned, id);
            const title = t(`achievement_${id}_title` as TranslationKey);
            return (
              <li key={id} className={styles.badge} title={count > 1 ? `${title} ×${count}` : title}>
                <span aria-hidden="true">{ACHIEVEMENT_GLYPHS[id]}</span>
                <span className="visually-hidden">{title}</span>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.footer}>
        <Link className="btn" to={memberHref} aria-label={`${t('open_profile')}: ${row.member.name}`}>
          {t('open_profile')}
        </Link>
      </div>
    </article>
  );
}
