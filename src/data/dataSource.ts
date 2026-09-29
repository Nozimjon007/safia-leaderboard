/**
 * Swap point for a real backend.
 *
 * Every screen in this app reads data through `dataSource.load()` and never
 * imports `demoData.ts` directly. To connect the real system, replace
 * `DemoDataSource` below with an implementation that calls the real API
 * (reusing whatever authentication/session the app already runs under) and
 * resolves the same `LeaderboardDataset` shape:
 *
 *   - members: id, display name, area/team, shift, optional photo URL
 *   - scores: per member, per category, one value per calendar week
 *     (Monday-anchored, `null` for a week with no logged value — never 0)
 *
 * Nothing in `lib/scoring.ts` or the components needs to change; they only
 * depend on this shape. See the in-app "How scoring works" page for the
 * exact list of fields and rules still needing sign-off before go-live.
 */
import type { LeaderboardDataset } from './types';
import { buildDemoDataset } from './demoData';

export interface DataSource {
  load(): Promise<LeaderboardDataset>;
}

let simulatedFailureUsed = false;

class DemoDataSource implements DataSource {
  async load(): Promise<LeaderboardDataset> {
    await new Promise((resolve) => setTimeout(resolve, 550));
    // Add ?sim=error to the URL once to preview the error/retry state — fires only the first load.
    if (typeof window !== 'undefined' && /[?&]sim=error(&|$)/.test(window.location.search) && !simulatedFailureUsed) {
      simulatedFailureUsed = true;
      throw new Error('Simulated load failure (remove ?sim=error from the URL, or press retry)');
    }
    return buildDemoDataset();
  }
}

export const dataSource: DataSource = new DemoDataSource();
