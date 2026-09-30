import { useMemo, useState } from 'react';
import type { AchievementId, LeaderboardDataset, Member, ScoringConfig } from '../../data/types';
import type { Season } from '../../lib/seasons';
import type { SeasonHistoryEntry } from '../../hooks/useMemberProgress';
import { computeCraftPathProgress, CRAFT_CONCEPT_CATEGORY, type CraftConcept } from '../../lib/craftPaths';
import { computeClanContributionEvents } from '../../lib/clanPoints';
import { ACHIEVEMENT_GLYPHS } from '../../lib/achievements';
import { formatShortDate, weekStartISO } from '../../lib/dates';
import { categoryLabel, seasonQuarterLabel, useI18n, type TFunction } from '../../i18n';
import type { TranslationKey } from '../../i18n/locales/en';
import styles from './CraftJournal.module.css';

type JournalEntry =
  | { kind: 'craft_star'; dateISO: string; seasonId: string; concept: CraftConcept; threshold: number }
  | { kind: 'clan_summary'; dateISO: string; seasonId: string; count: number; points: number }
  | { kind: 'achievement'; dateISO: string; seasonId: string; achievementId: AchievementId }
  | { kind: 'team_mentor'; dateISO: string; seasonId: string }
  | { kind: 'season_result'; dateISO: string; seasonId: string; rank: number; rankedCount: number };

const VISIBLE_COUNT = 8;

/**
 * A chronological, employee-facing explanation of "how I got here" — never a raw HR log. Every entry
 * traces to a function this app already uses elsewhere for the same underlying fact (craft-mission
 * completion, a clan-points event, a season's frozen standings), just re-narrated in first person.
 * Nothing here is invented for the journal: if the underlying computation wouldn't produce a badge,
 * a clan-ledger line, or a season-history row, it doesn't produce a journal entry either.
 */
function buildEntries(dataset: LeaderboardDataset, config: ScoringConfig, member: Member, seasons: readonly Season[], seasonHistory: readonly SeasonHistoryEntry[]): JournalEntry[] {
  const out: JournalEntry[] = [];

  for (const season of seasons) {
    const progress = computeCraftPathProgress(dataset, member, season);
    if (progress) {
      for (const m of progress.missions) {
        if (!m.complete || m.earnedWeekIndex == null) continue;
        out.push({
          kind: 'craft_star',
          dateISO: weekStartISO(dataset.firstWeekStart, m.earnedWeekIndex),
          seasonId: season.id,
          concept: m.def.concept,
          threshold: m.def.threshold,
        });
      }
    }

    const events = computeClanContributionEvents(dataset, config, season)[member.id] ?? [];
    // Weekly clan missions repeat every qualifying week — one journal line per week would drown the
    // few genuinely meaningful entries (stars, badges, distinctions) in routine noise, so every
    // clan_mission event for a season folds into a single "how much I contributed" summary line
    // instead, keeping the required "clan contributions" category concise rather than a weekly log.
    const clanMissionEvents = events.filter((e) => e.reason === 'clan_mission');
    if (clanMissionEvents.length > 0) {
      const points = clanMissionEvents.reduce((sum, e) => sum + e.points, 0);
      const lastDateISO = clanMissionEvents.reduce((latest, e) => (e.dateISO > latest ? e.dateISO : latest), clanMissionEvents[0].dateISO);
      out.push({ kind: 'clan_summary', dateISO: lastDateISO, seasonId: season.id, count: clanMissionEvents.length, points });
    }
    for (const e of events) {
      if (e.reason === 'quality_achievement' && e.achievementId) {
        out.push({ kind: 'achievement', dateISO: e.dateISO, seasonId: season.id, achievementId: e.achievementId });
      } else if (e.reason === 'coaching_contribution') {
        out.push({ kind: 'team_mentor', dateISO: e.dateISO, seasonId: season.id });
      }
    }
  }

  for (const entry of seasonHistory) {
    // A season with no rank at all (no scored weeks in range for this member — e.g. a brand-new
    // hire's very first seasons) has no real result to journal; the empty state already covers
    // "nothing yet" better than repeating an unranked line once per season.
    if (!entry.isComplete || entry.rank == null) continue;
    out.push({ kind: 'season_result', dateISO: entry.season.endISO, seasonId: entry.season.id, rank: entry.rank, rankedCount: entry.rankedCount });
  }

  return out.sort((a, b) => (a.dateISO < b.dateISO ? 1 : a.dateISO > b.dateISO ? -1 : 0));
}

function entryText(t: TFunction, entry: JournalEntry, seasonLabelById: Record<string, string>): string {
  const season = seasonLabelById[entry.seasonId] ?? entry.seasonId;
  switch (entry.kind) {
    case 'craft_star': {
      const category = categoryLabel(t, CRAFT_CONCEPT_CATEGORY[entry.concept]);
      return entry.threshold === 1 ? t('craft_journal_star_1', { category }) : t('craft_journal_star_n', { n: entry.threshold, category });
    }
    case 'clan_summary':
      return entry.count === 1
        ? t('craft_journal_clan_summary_1', { points: entry.points })
        : t('craft_journal_clan_summary_n', { n: entry.count, points: entry.points });
    case 'achievement':
      return t('craft_journal_achievement', { title: t(`achievement_${entry.achievementId}_title` as TranslationKey) });
    case 'team_mentor':
      return t('craft_journal_team_mentor');
    case 'season_result':
      return t('craft_journal_season_result', { season, rank: entry.rank, rankedCount: entry.rankedCount });
  }
}

function kindLabel(t: TFunction, kind: JournalEntry['kind']): string {
  return t(`craft_journal_kind_${kind}` as TranslationKey);
}

function kindGlyph(entry: JournalEntry): string {
  return entry.kind === 'achievement' ? ACHIEVEMENT_GLYPHS[entry.achievementId] : '';
}

interface CraftJournalProps {
  dataset: LeaderboardDataset;
  config: ScoringConfig;
  member: Member;
  seasons: readonly Season[];
  seasonHistory: readonly SeasonHistoryEntry[];
}

/** The employee profile's "story so far" — chronological, concise, and built entirely from data this
 * app already computes and shows elsewhere (Craft Path stars, clan contribution events, season
 * results), just narrated for the person it's about rather than for a ledger or a standings table. */
export function CraftJournal({ dataset, config, member, seasons, seasonHistory }: CraftJournalProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const seasonLabelById = useMemo(() => Object.fromEntries(seasons.map((s) => [s.id, seasonQuarterLabel(t, s)])), [seasons, t]);
  const entries = useMemo(() => buildEntries(dataset, config, member, seasons, seasonHistory), [dataset, config, member, seasons, seasonHistory]);

  const visible = expanded ? entries : entries.slice(0, VISIBLE_COUNT);
  const hiddenCount = entries.length - visible.length;

  return (
    <section className={styles.panel} aria-labelledby="craft-journal-heading">
      <h2 id="craft-journal-heading">{t('craft_journal_heading')}</h2>
      <p className={styles.sub}>{t('craft_journal_intro')}</p>

      {entries.length === 0 ? (
        <p className={styles.empty}>{t('craft_journal_empty')}</p>
      ) : (
        <>
          <ol className={styles.list}>
            {visible.map((entry, i) => (
              <li key={`${entry.kind}-${entry.seasonId}-${i}`} className={styles.entry} data-kind={entry.kind}>
                <span className={styles.entryDate}>{formatShortDate(entry.dateISO)}</span>
                <span className={styles.entryTag}>
                  {kindGlyph(entry) && <span aria-hidden="true">{kindGlyph(entry)} </span>}
                  {kindLabel(t, entry.kind)}
                </span>
                <span className={styles.entryText}>{entryText(t, entry, seasonLabelById)}</span>
              </li>
            ))}
          </ol>
          {hiddenCount > 0 && (
            <button type="button" className={styles.more} onClick={() => setExpanded(true)}>
              {t('craft_journal_show_more', { n: hiddenCount })}
            </button>
          )}
        </>
      )}
    </section>
  );
}
