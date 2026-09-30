import { Link, useLocation } from 'react-router-dom';
import type { LeaderboardDataset } from '../../data/types';
import type { LeaderboardResult } from '../../lib/scoring';
import type { ClanId } from '../../lib/clans';
import type { ClanStanding } from '../../lib/clanPoints';
import { gapToNextClan } from '../../lib/clanPoints';
import type { Season } from '../../lib/seasons';
import { CONCEPT_THRESHOLD, CRAFT_CONCEPT_CATEGORY, computeCraftPathProgress, craftPathForRole, nextCraftMissionGoal } from '../../lib/craftPaths';
import type { CoinTransaction } from '../../lib/coins';
import { balanceForMember } from '../../lib/coins';
import { nextSavingsGoal } from '../../lib/shop';
import { categoryLabel, clanName, craftPathLabel, shopItemName, useI18n } from '../../i18n';
import { MoveBadge } from '../common/MoveBadge';
import styles from './MyNextMove.module.css';

interface MyNextMoveProps {
  dataset: LeaderboardDataset;
  overallResult: LeaderboardResult;
  memberId: string | null;
  onSelectMember: (id: string) => void;
  clanAssignments: Record<string, ClanId>;
  clanStandings: readonly ClanStanding[] | null;
  currentSeason: Season | null;
  coinTransactions: readonly CoinTransaction[];
}

/**
 * A personal dashboard, not a leaderboard view — the five things one employee would actually want
 * to know today, each backed by real computed data (never a placeholder) and each linking straight
 * to where they'd act on it. Shares the same "view progress as" identity as the rest of the app
 * (SeasonPanel's own picker included) so picking someone here or there always agrees.
 */
export function MyNextMove({
  dataset,
  overallResult,
  memberId,
  onSelectMember,
  clanAssignments,
  clanStandings,
  currentSeason,
  coinTransactions,
}: MyNextMoveProps) {
  const { t, locale } = useI18n();
  const location = useLocation();
  const memberHref = memberId ? { pathname: `/member/${memberId}`, search: location.search } : null;

  const sortedMembers = [...dataset.members].sort((a, b) => a.name.localeCompare(b.name));

  const picker = (
    <label className={styles.switchField}>
      <span className="visually-hidden">{t('view_as_picker_label')}</span>
      <select className="select" value={memberId ?? ''} onChange={(e) => e.target.value && onSelectMember(e.target.value)}>
        <option value="">{t('view_as_picker_none')}</option>
        {sortedMembers.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </label>
  );

  if (!memberId || !memberHref) {
    return (
      <section className={styles.section} aria-labelledby="my-next-move-heading">
        <h2 id="my-next-move-heading">{t('my_next_move_heading')}</h2>
        <p className={styles.pickPrompt}>{t('my_next_move_pick_prompt')}</p>
        {picker}
      </section>
    );
  }

  const member = dataset.members.find((m) => m.id === memberId);
  if (!member) return null;

  const row = overallResult.rows.find((r) => r.member.id === memberId) ?? null;

  const clanId = clanAssignments[memberId] ?? null;
  const clanStanding = clanId && clanStandings ? (clanStandings.find((s) => s.clanId === clanId) ?? null) : null;
  const gap = clanId && clanStandings ? gapToNextClan(clanStandings, clanId) : null;
  const clanHref = clanId ? { pathname: `/clans/${clanId}`, search: location.search } : null;

  const craftPath = craftPathForRole(member.role);
  const progress = currentSeason ? computeCraftPathProgress(dataset, member, currentSeason) : null;
  const nextMission = nextCraftMissionGoal(progress);
  const weeksLeft = nextMission ? nextMission.def.threshold - nextMission.current : 0;
  const missionCategory = nextMission ? categoryLabel(t, CRAFT_CONCEPT_CATEGORY[nextMission.def.concept]) : null;
  const missionThreshold = nextMission ? CONCEPT_THRESHOLD[nextMission.def.concept] : null;

  const balance = balanceForMember(coinTransactions, memberId);
  const goal = nextSavingsGoal(balance);

  return (
    <section className={styles.section} aria-labelledby="my-next-move-heading">
      <div className={styles.head}>
        <h2 id="my-next-move-heading">{t('my_next_move_heading')}</h2>
        {picker}
      </div>

      <div className={styles.grid}>
        <Link to={memberHref} className={styles.tile}>
          <span className={styles.tileLabel}>{t('my_next_move_rank_label')}</span>
          <span className={styles.tileValue}>{row?.overallRank != null ? `#${row.overallRank}` : '—'}</span>
          <MoveBadge move={row?.overallMove ?? null} />
        </Link>

        <Link to={memberHref} className={styles.tile}>
          <span className={styles.tileLabel}>{t('my_next_move_star_label')}</span>
          {nextMission && missingOk(missionCategory) ? (
            <span className={styles.tileValue}>
              {weeksLeft === 1
                ? t('my_next_move_star_detail_1', { category: missionCategory, threshold: missionThreshold ?? 0 })
                : t('my_next_move_star_detail_n', { n: weeksLeft, category: missionCategory, threshold: missionThreshold ?? 0 })}
            </span>
          ) : progress ? (
            <span className={styles.tileValue}>{t('my_next_move_star_complete')}</span>
          ) : (
            <span className={styles.tileValue}>—</span>
          )}
          {craftPath && <span className={styles.tileSub}>{craftPathLabel(t, member.role)}</span>}
        </Link>

        <Link to={clanHref ?? memberHref} className={styles.tile} aria-disabled={!clanHref || undefined}>
          <span className={styles.tileLabel}>{t('my_next_move_clan_label')}</span>
          {clanStanding && clanId ? (
            <>
              <span className={styles.tileValue}>
                #{clanStanding.rank} · {clanName(t, clanId)}
              </span>
              <span className={styles.tileSub}>
                {gap ? t('my_next_move_clan_gap', { gap: gap.gap.toFixed(1), next: clanName(t, gap.next.clanId) }) : t('my_next_move_clan_leading')}
              </span>
            </>
          ) : (
            <span className={styles.tileValue}>—</span>
          )}
        </Link>

        <Link to="/shop" className={styles.tile}>
          <span className={styles.tileLabel}>{t('coins_balance_label')}</span>
          <span className={styles.tileValue}>
            {balance.toLocaleString(locale)} <small>{t('coins_balance_unit')}</small>
          </span>
        </Link>

        <Link to="/shop" className={styles.tile}>
          <span className={styles.tileLabel}>{t('my_next_move_saving_label')}</span>
          {goal ? (
            <>
              <span className={styles.tileValue}>{shopItemName(t, goal.id)}</span>
              <span className={styles.tileSub}>{t('my_next_move_saving_gap', { n: (goal.priceCoins - balance).toLocaleString(locale) })}</span>
            </>
          ) : (
            <span className={styles.tileValue}>{t('my_next_move_saving_done')}</span>
          )}
        </Link>
      </div>
    </section>
  );
}

function missingOk(v: string | null): v is string {
  return v != null;
}
