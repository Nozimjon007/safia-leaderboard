import { Link, useLocation } from 'react-router-dom';
import type { EarnedAchievement } from '../../data/types';
import { CATEGORY_KEYS } from '../../data/types';
import type { LeaderboardRow, TeamStats } from '../../lib/scoring';
import type { ClanId } from '../../lib/clans';
import { medalFor } from '../../lib/zoneStyle';
import { categoryLabel, useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import { formatScore } from '../../lib/format';
import { usePointerTilt } from '../../hooks/usePointerTilt';
import { MoveBadge } from '../common/MoveBadge';
import { PortraitFallback } from '../common/PortraitFallback';
import { JobPanel } from '../common/JobPanel';
import { CompareToggle } from './CompareToggle';
import { WhyThisRank } from './WhyThisRank';
import type { ChampionEmblem } from './ChampionFeature';
import { ACHIEVEMENT_GLYPHS } from '../../lib/achievements';
import { REWARD_GLYPHS } from '../member/RewardBadge';
import styles from './ContenderCard.module.css';

interface ContenderCardProps {
  row: LeaderboardRow;
  clanId: ClanId | null;
  emblem: ChampionEmblem;
  team: TeamStats;
  achievements: EarnedAchievement[];
  compareSelected: boolean;
  onToggleCompare: () => void;
}

/** One of #2-5 — a real, roomy portrait (same family as the champion feature, just smaller), full
 * category numbers, and its own "why this rank" detail. Never a small avatar adrift in white space. */
export function ContenderCard({ row, clanId, emblem, team, achievements, compareSelected, onToggleCompare }: ContenderCardProps) {
  const { t, locale } = useI18n();
  const location = useLocation();
  const tiltRef = usePointerTilt<HTMLElement>();
  const medal = medalFor(row.overallRank);
  const memberHref = { pathname: `/member/${row.member.id}`, search: location.search };
  const emblemGlyph = emblem ? (emblem.kind === 'reward' ? REWARD_GLYPHS[emblem.id] : ACHIEVEMENT_GLYPHS[emblem.id]) : null;
  const emblemTitle = emblem
    ? emblem.kind === 'reward'
      ? `${t(`reward_${emblem.id}_title` as TranslationKey)} (${t('podium_emblem_demo')})`
      : t(`achievement_${emblem.id}_title` as TranslationKey)
    : null;

  return (
    <article ref={tiltRef} className={styles.card} data-medal={medal ?? undefined} data-compare-selected={compareSelected || undefined}>
      <CompareToggle selected={compareSelected} name={row.member.name} onToggle={onToggleCompare} className={styles.compareBtn} />
      <Link
        to={memberHref}
        className={styles.cardLink}
        aria-label={`${t('open_profile')}: ${row.member.name}, ${t('rank_label')} ${row.overallRank}, ${formatScore(row.current.overall, locale)}/100`}
      >
        <div className={styles.portrait}>
          <span className={styles.facets} aria-hidden="true" />
          <span className={styles.sheen} aria-hidden="true" />
          <span className={styles.rankNum} data-medal={medal ?? undefined}>
            <span className="visually-hidden">{t('rank_label')} </span>#{row.overallRank}
          </span>
          {row.member.fullBodyPhoto ? (
            <img src={row.member.fullBodyPhoto} alt="" className={styles.photo} />
          ) : (
            <PortraitFallback id={row.member.id} name={row.member.name} className={styles.portraitFallback} />
          )}
          {emblem && emblemGlyph && (
            <span className={styles.emblem} title={emblemTitle ?? undefined}>
              {emblemGlyph}
            </span>
          )}
        </div>

        <div className={styles.info}>
          <h3 className={styles.name}>{row.member.name}</h3>

          <div className={styles.scoreRow}>
            <b className="tabular">{formatScore(row.current.overall, locale)}</b>
            <span className={styles.scoreUnit}>/100</span>
            <MoveBadge move={row.overallMove} />
          </div>

          <div className={styles.cats}>
            {CATEGORY_KEYS.map((c) => {
              const v = row.current.categories[c];
              return (
                <div key={c}>
                  <b className="tabular" title={v == null ? t('missing_value') : undefined}>
                    {v == null ? '-' : Math.round(v)}
                  </b>
                  <span>{categoryLabel(t, c)}</span>
                </div>
              );
            })}
          </div>

          <span className={styles.viewProfile}>
            {t('open_profile')} <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>

      {/* Outside the profile Link on purpose — JobPanel's own clan-crest link would be an invalid
          nested <a> otherwise. */}
      <div className={styles.jobWrap}>
        <JobPanel member={row.member} clanId={clanId} overallRank={row.overallRank} overallScore={row.current.overall} compact showSoloStat={false} />
        <WhyThisRank row={row} team={team} achievements={achievements} />
      </div>
    </article>
  );
}
