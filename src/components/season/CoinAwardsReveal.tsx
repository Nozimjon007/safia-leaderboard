import { motion, useReducedMotion } from 'motion/react';
import type { LeaderboardDataset } from '../../data/types';
import type { CoinTransaction, CoinTransactionReason } from '../../lib/coins';
import type { Season } from '../../lib/seasons';
import { seasonQuarterLabel, useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import { Avatar } from '../common/Avatar';
import styles from './CoinAwardsReveal.module.css';

interface CoinAwardsRevealProps {
  season: Season;
  /** Already filtered to this season's award transactions (never redemptions). */
  transactions: readonly CoinTransaction[];
  dataset: LeaderboardDataset;
  /** Change to remount and replay — see the "Replay awards reveal" button in SeasonDetailPage. */
  playKey: string;
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const SOLO_ORDER: readonly CoinTransactionReason[] = ['solo_place_1', 'solo_place_2', 'solo_place_3', 'solo_place_4', 'solo_place_5'];

/**
 * A restrained, replayable list of who earned Safia Coins this season — one row per member (an
 * employee earning both a solo and a clan award shows both reasons on one row), solo places first
 * in order, then clan-only winners. Only ever rendered for an already-approved, already-finalized
 * season (see SeasonDetailPage), so it can never be mistaken for announcing a still-active season's
 * end.
 */
export function CoinAwardsReveal({ season, transactions, dataset, playKey }: CoinAwardsRevealProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const playEntrance = !reduceMotion;

  if (transactions.length === 0) {
    return <p className={styles.empty}>{t('coins_awarded_empty')}</p>;
  }

  const byMember = new Map<string, CoinTransaction[]>();
  for (const tx of transactions) {
    const list = byMember.get(tx.memberId) ?? [];
    list.push(tx);
    byMember.set(tx.memberId, list);
  }
  const memberIds = [...byMember.keys()].sort((a, b) => {
    const rankOf = (id: string) => {
      const idx = SOLO_ORDER.findIndex((r) => byMember.get(id)!.some((tx) => tx.reason === r));
      return idx === -1 ? SOLO_ORDER.length : idx;
    };
    return rankOf(a) - rankOf(b) || a.localeCompare(b);
  });

  return (
    <div key={playKey}>
      <h3 className={styles.heading}>{t('coins_reveal_heading', { season: seasonQuarterLabel(t, season) })}</h3>
      <ul className={styles.list}>
        {memberIds.map((memberId, i) => {
          const member = dataset.members.find((m) => m.id === memberId);
          if (!member) return null;
          const txs = byMember.get(memberId)!;
          const total = txs.reduce((sum, tx) => sum + tx.amount, 0);
          return (
            <motion.li
              key={memberId}
              className={styles.row}
              initial={playEntrance ? { opacity: 0, y: 10 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={playEntrance ? { delay: i * 0.08, duration: 0.32, ease: EASE_OUT } : { duration: 0 }}
            >
              <Avatar id={member.id} name={member.name} photoUrl={member.avatarPhoto} size={32} />
              <div className={styles.who}>
                <span className={styles.name}>{member.name}</span>
                <span className={styles.reasons}>{txs.map((tx) => t(`coin_reason_${tx.reason}` as TranslationKey)).join(' · ')}</span>
              </div>
              <b className={`${styles.amount} tabular`}>
                +{total.toLocaleString()} {t('coins_balance_unit')}
              </b>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
