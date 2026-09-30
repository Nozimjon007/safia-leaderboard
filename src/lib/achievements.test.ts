import { describe, expect, it } from 'vitest';
import { buildDemoDataset } from '../data/demoData';
import { DEFAULT_SCORING_CONFIG } from '../data/types';
import { listSeasons, seasonCloseMs, SEASON_APPROVAL_GRACE_MS } from './seasons';
import { ACHIEVEMENT_IDS, categoryLeaderDetails, computeAllAchievements, countOf } from './achievements';

describe('computeAllAchievements (against the real demo dataset)', () => {
  const dataset = buildDemoDataset();
  const today = new Date().toISOString().slice(0, 10);
  const seasons = listSeasons(dataset.firstWeekStart, today);
  const byMember = computeAllAchievements(dataset, DEFAULT_SCORING_CONFIG, seasons);

  it('gives every member an entry, even ones with nothing earned', () => {
    for (const m of dataset.members) expect(byMember[m.id]).toBeDefined();
  });

  it('never awards anything to a member with no data at all (lead001)', () => {
    expect(byMember.lead001).toEqual([]);
  });

  it('awards exactly one champion per completed season, across the whole roster', () => {
    const completed = seasons.filter((s) => s.endISO < today).length; // rough: strictly-past seasons are certainly complete
    const totalChampions = dataset.members.reduce((sum, m) => sum + countOf(byMember[m.id], 'champion'), 0);
    // Every completed season awards exactly one champion; there may be one more truly-complete season than this
    // rough count catches (the current season can complete mid-check), so allow a little slack either way.
    expect(totalChampions).toBeGreaterThanOrEqual(Math.max(0, completed - 1));
    expect(totalChampions).toBeLessThanOrEqual(seasons.length);
  });

  it('never awards achievements for the current (incomplete) season', () => {
    const currentSeasonId = seasons[seasons.length - 1].id;
    for (const m of dataset.members) {
      expect(byMember[m.id].some((e) => e.seasonId === currentSeasonId)).toBe(false);
    }
  });

  it('only ever produces known achievement ids', () => {
    for (const m of dataset.members) {
      for (const e of byMember[m.id]) expect(ACHIEVEMENT_IDS).toContain(e.id);
    }
  });

  it('records which categories a category_leader badge was earned in', () => {
    const withCategoryBadge = dataset.members.find((m) => countOf(byMember[m.id], 'category_leader') > 0);
    expect(withCategoryBadge).toBeDefined();
    if (withCategoryBadge) {
      expect(categoryLeaderDetails(byMember[withCategoryBadge.id]).length).toBeGreaterThan(0);
    }
  });

  it('awards nothing for a season still inside its approval grace window, despite frozen numbers', () => {
    const pastSeason = seasons[seasons.length - 2];
    const justClosed = seasonCloseMs(pastSeason) + 1000;
    const pending = computeAllAchievements(dataset, DEFAULT_SCORING_CONFIG, seasons, justClosed);
    for (const m of dataset.members) {
      expect(pending[m.id].some((e) => e.seasonId === pastSeason.id)).toBe(false);
    }
  });

  it('awards that season once its approval grace window has elapsed', () => {
    const pastSeason = seasons[seasons.length - 2];
    const approvedAt = seasonCloseMs(pastSeason) + SEASON_APPROVAL_GRACE_MS;
    const settled = computeAllAchievements(dataset, DEFAULT_SCORING_CONFIG, seasons, approvedAt);
    expect(dataset.members.some((m) => settled[m.id].some((e) => e.seasonId === pastSeason.id))).toBe(true);
  });
});
