import type { LeaderboardDataset, Member } from '../../data/types';
import { computeLeadershipPathsProgress, LEADERSHIP_PATH_IDS } from '../../lib/craftPaths';
import type { Season } from '../../lib/seasons';
import { useI18n } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import styles from './ComparePathSummary.module.css';

interface ComparePathSummaryProps {
  dataset: LeaderboardDataset;
  memberA: Member;
  memberB: Member;
  currentSeason: Season | null;
  nameA: string;
  nameB: string;
  colorA: string;
  colorB: string;
}

/** A concise, this-season Leadership Mastery comparison — four paths, each side's stars out of the
 * same two possible, reusing the exact computation the profile's own passport and Craft Path panel
 * already use (never a separate, re-derived number). */
export function ComparePathSummary({ dataset, memberA, memberB, currentSeason, nameA, nameB, colorA, colorB }: ComparePathSummaryProps) {
  const { t } = useI18n();
  if (!currentSeason) return null;
  const pathsA = computeLeadershipPathsProgress(dataset, memberA, currentSeason);
  const pathsB = computeLeadershipPathsProgress(dataset, memberB, currentSeason);
  if (!pathsA || !pathsB) return null;

  return (
    <section className={styles.panel}>
      <h2>{t('compare_paths_title')}</h2>
      <p className={styles.note}>{t('craft_path_disclaimer')}</p>
      <div className={styles.rows}>
        {LEADERSHIP_PATH_IDS.map((pathId) => {
          const a = pathsA.find((p) => p.pathId === pathId)!;
          const b = pathsB.find((p) => p.pathId === pathId)!;
          return (
            <div key={pathId} className={styles.row}>
              <span className={styles.pathName}>{t(`leadership_path_${pathId}` as TranslationKey)}</span>
              <span className={styles.stars} style={{ color: colorA }} title={nameA}>
                {'★'.repeat(a.starsEarned)}
                {'☆'.repeat(a.starsPossible - a.starsEarned)}
              </span>
              <span className={styles.stars} style={{ color: colorB }} title={nameB}>
                {'★'.repeat(b.starsEarned)}
                {'☆'.repeat(b.starsPossible - b.starsEarned)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
