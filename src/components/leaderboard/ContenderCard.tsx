import { Link, useLocation } from 'react-router-dom';
import type { LeaderboardRow } from '../../lib/scoring';
import { computeHighlight } from '../../lib/scoring';
import type { ClanId } from '../../lib/clans';
import { medalFor } from '../../lib/zoneStyle';
import { categoryLabel, useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import { formatScore } from '../../lib/format';
import { MoveBadge } from '../common/MoveBadge';
import { PortraitFallback } from '../common/PortraitFallback';
import { JobPanel } from '../common/JobPanel';
import { CompareToggle } from './CompareToggle';
import type { ChampionEmblem } from './ChampionFeature';
import { ACHIEVEMENT_GLYPHS } from '../../lib/achievements';
import { REWARD_GLYPHS } from '../member/RewardBadge';
import styles from './ContenderCard.module.css';

interface ContenderCardProps {
  row: LeaderboardRow;
  clanId: ClanId | null;
  emblem: ChampionEmblem;
  compareSelected: boolean;
  onToggleCompare: () => void;
}

/** One of #2-5 — a real (if smaller) portrait band beside/above the identity, never a small avatar
 * floating in an otherwise empty card. */
export function ContenderCard({ row, clanId, emblem, compareSelected, onToggleCompare }: ContenderCardProps) {
  const { t, locale } = useI18n();
  const location = useLocation();
  const highlight = computeHighlight(row.current, row.previous);
  const memberHref = { pathname: `/member/${row.member.id}`, search: location.search };
  const emblemGlyph = emblem ? (emblem.kind === 'reward' ? REWARD_GLYPHS[emblem.id] : ACHIEVEMENT_GLYPHS[emblem.id]) : null;
  const emblemTitle = emblem
    ? emblem.kind === 'reward'
      ? `${t(`reward_${emblem.id}_title` as TranslationKey)} (${t('podium_emblem_demo')})`
      : t(`achievement_${emblem.id}_title` as TranslationKey)
    : null;

  return (
    <article className={styles.card} data-compare-selected={compareSelected || undefined}>
      <CompareToggle selected={compareSelected} name={row.member.name} onToggle={onToggleCompare} className={styles.compareBtn} />
      <Link
        to={memberHref}
        className={styles.cardLink}
        aria-label={`${t('open_profile')}: ${row.member.name}, ${t('rank_label')} ${row.overallRank}, ${formatScore(row.current.overall, locale)}/100`}
      >
        <div className={styles.portrait}>
          {row.member.fullBodyPhoto ? (
            <img src={row.member.fullBodyPhoto} alt="" className={styles.photo} />
          ) : (
            <PortraitFallback name={row.member.name} clanId={clanId} className={styles.portraitFallback} />
          )}
          <span className={`${styles.rankNum} tabular`} data-medal={medalFor(row.overallRank)}>
            <span className="visually-hidden">{t('rank_label')} </span>#{row.overallRank}
          </span>
          {emblem && emblemGlyph && (
            <span className={styles.emblem} title={emblemTitle ?? undefined}>
              {emblemGlyph}
            </span>
          )}
        </div>

        <div className={styles.body}>
          <h3 className={styles.name}>{row.member.name}</h3>

          <div className={styles.scoreRow}>
            <b className="tabular">{formatScore(row.current.overall, locale)}</b>
            <span className={styles.scoreUnit}>/100</span>
            <MoveBadge move={row.overallMove} />
          </div>

          <p className={styles.highlight}>
            {highlight.strongest
              ? t('highlight_strong', { category: categoryLabel(t, highlight.strongest.category), value: Math.round(highlight.strongest.value) })
              : t('highlight_none')}
          </p>
        </div>
      </Link>

      {/* Outside the profile Link on purpose — JobPanel's own clan-crest link would be an invalid
          nested <a> otherwise. */}
      <div className={styles.jobWrap}>
        <JobPanel member={row.member} clanId={clanId} overallRank={row.overallRank} overallScore={row.current.overall} compact showSoloStat={false} />
      </div>
    </article>
  );
}
