import { Link, useLocation } from 'react-router-dom';
import { CATEGORY_KEYS, type AchievementId, type MetricKey, type RewardId } from '../../data/types';
import type { LeaderboardRow } from '../../lib/scoring';
import { metricValue } from '../../lib/scoring';
import { ACHIEVEMENT_GLYPHS } from '../../lib/achievements';
import { REWARD_GLYPHS } from '../member/RewardBadge';
import { categoryLabel, roleLabel, useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import { formatScore } from '../../lib/format';
import { usePointerTilt } from '../../hooks/usePointerTilt';
import { MoveBadge } from '../common/MoveBadge';
import { CompareToggle } from './CompareToggle';
import styles from './PodiumCard.module.css';

export type PodiumEmblem = { kind: 'reward'; id: RewardId } | { kind: 'achievement'; id: AchievementId } | null;

interface PodiumCardProps {
  row: LeaderboardRow;
  place: 1 | 2 | 3;
  metric: MetricKey;
  metricLabel: string;
  emblem: PodiumEmblem;
  compareSelected: boolean;
  onToggleCompare: () => void;
}

const MEDAL_KEYS = ['podium_gold', 'podium_silver', 'podium_bronze'] as const;

/**
 * One collectible-style podium card. Reused for all three places — the gold/
 * silver/bronze finish and size come entirely from `data-place`, driven by
 * real rank data (see Podium.tsx). Every zone (rank+score, portrait, name,
 * categories, movement, action) has its own reserved space — nothing is
 * allowed to sit behind the portrait or the decorative facet/foil layers,
 * which are confined to the portrait band itself.
 */
export function PodiumCard({ row, place, metric, metricLabel, emblem, compareSelected, onToggleCompare }: PodiumCardProps) {
  const { t, locale } = useI18n();
  const location = useLocation();
  const tiltRef = usePointerTilt<HTMLElement>();
  const value = metricValue(row.current, metric);
  const profileHref = { pathname: `/member/${row.member.id}`, search: location.search };

  const emblemGlyph = emblem ? (emblem.kind === 'reward' ? REWARD_GLYPHS[emblem.id] : ACHIEVEMENT_GLYPHS[emblem.id]) : null;
  const emblemTitle = emblem
    ? emblem.kind === 'reward'
      ? `${t(`reward_${emblem.id}_title` as TranslationKey)} (${t('podium_emblem_demo')})`
      : t(`achievement_${emblem.id}_title` as TranslationKey)
    : null;

  return (
    <article ref={tiltRef} className={styles.card} data-place={place} data-compare-selected={compareSelected || undefined}>
      <CompareToggle selected={compareSelected} name={row.member.name} onToggle={onToggleCompare} className={styles.compareBtn} />

      <Link
        to={profileHref}
        className={styles.cardLink}
        aria-label={`${t('open_profile')}: ${row.member.name}, ${t('rank_label')} ${row.rank}, ${formatScore(value, locale)}/100 ${metricLabel}`}
      >
        <span className={styles.medalTag}>{t(MEDAL_KEYS[place - 1])}</span>

        {/* Zone 1: rank + score, deliberately upper-left, never centered or overlapped. */}
        <div className={styles.rankScoreZone}>
          <span className={styles.rankNum}>
            <span className="visually-hidden">{t('rank_label')} </span>#{row.rank}
          </span>
          <div className={styles.scoreBlock}>
            <b className="tabular">{formatScore(value, locale)}</b>
            <span className={styles.scoreUnit}>/100</span>
          </div>
        </div>

        {/* Zone 2: tall full-body portrait stage. */}
        <div className={styles.portraitZone}>
          <span className={styles.facets} aria-hidden="true" />
          <span className={styles.sheen} aria-hidden="true" />
          <span className={styles.glint} aria-hidden="true" />
          {row.member.fullBodyPhoto ? (
            <img src={row.member.fullBodyPhoto} alt="" className={styles.photo} />
          ) : (
            <div className={styles.placeholder} aria-hidden="true">
              <svg viewBox="0 0 200 400" className={styles.figure} focusable="false">
                <ellipse className={styles.figureFoot} cx="88" cy="372" rx="18" ry="9" />
                <ellipse className={styles.figureFoot} cx="112" cy="372" rx="18" ry="9" />
                <rect className={styles.figureLeg} x="78" y="222" width="20" height="145" rx="9" />
                <rect className={styles.figureLeg} x="102" y="222" width="20" height="145" rx="9" />
                <path className={styles.figureArm} d="M60,120 L45,218 L59,224 L71,126 Z" />
                <path className={styles.figureArm} d="M140,120 L155,218 L141,224 L129,126 Z" />
                <path className={styles.figureTorso} d="M66,116 L134,116 L124,228 L76,228 Z" />
                <circle className={styles.figureHead} cx="100" cy="42" r="28" />
              </svg>
            </div>
          )}
          {emblem && emblemGlyph && (
            <span className={styles.emblem} title={emblemTitle ?? undefined}>
              {emblemGlyph}
            </span>
          )}
        </div>

        {/* Zone 3+4: name, role/team/shift. */}
        <div className={styles.identity}>
          <h3 className={styles.name}>{row.member.name}</h3>
          <p className={styles.sub}>
            {roleLabel(t, row.member.role)} · {row.member.area} · {row.member.shift}
          </p>
        </div>

        {/* Zone 5: five category scores, 3+2 grid so labels stay readable. */}
        <div className={styles.cats}>
          {CATEGORY_KEYS.map((c) => {
            const v = row.current.categories[c];
            return (
              <div key={c}>
                <b className="tabular" title={v == null ? t('missing_value') : undefined}>
                  {v == null ? '—' : Math.round(v)}
                </b>
                <span>{categoryLabel(t, c)}</span>
              </div>
            );
          })}
        </div>

        {/* Zone 6: rank movement + what it's compared against. */}
        <div className={styles.moveZone}>
          <MoveBadge move={row.move} />
          <span className={styles.moveNote}>{t('podium_vs_previous')}</span>
        </div>

        {/* Zone 7: visible action. */}
        <div className={styles.footer}>
          <span className={styles.viewProfile}>
            {t('open_profile')} <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </article>
  );
}
