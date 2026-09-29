/**
 * Lifetime XP tier — an optional, explicitly separate demo system (see
 * README and the profile page copy). Not official Safia XP rules, and not
 * the same thing as season score or rank.
 *
 * "Points" here are simply the sum of a member's overall score across every
 * *completed* season (each season contributes 0–100 pts, so a member with
 * six completed seasons behind them can have up to ~600 lifetime points).
 * Tier thresholds are configurable placeholders — change them in one place,
 * here, once real Safia rules (if any) are confirmed.
 */
import type { XpTier } from '../data/types';

export const XP_TIER_THRESHOLDS: Record<XpTier, number> = {
  bronze: 0,
  silver: 250,
  gold: 400,
  platinum: 520,
};

const TIER_ORDER: readonly XpTier[] = ['platinum', 'gold', 'silver', 'bronze'];

export function computeXpTier(points: number): XpTier {
  for (const tier of TIER_ORDER) {
    if (points >= XP_TIER_THRESHOLDS[tier]) return tier;
  }
  return 'bronze';
}

export function lifetimePoints(seasonOveralls: ReadonlyArray<number | null>): number {
  return Math.round(seasonOveralls.reduce((sum: number, v) => sum + (v ?? 0), 0));
}

/** Points still needed to reach the next tier up, or null if already at the top. */
export function pointsToNextTier(points: number): { tier: XpTier; remaining: number } | null {
  const currentIndex = TIER_ORDER.indexOf(computeXpTier(points));
  if (currentIndex <= 0) return null; // already platinum
  const nextTier = TIER_ORDER[currentIndex - 1];
  return { tier: nextTier, remaining: Math.max(0, XP_TIER_THRESHOLDS[nextTier] - points) };
}
