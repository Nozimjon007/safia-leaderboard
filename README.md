# Team Leaderboard

A team-performance leaderboard, member profiles, and a head-to-head comparison
view, built as a fresh design on top of the "SAFIA IMS · Бригадирлар
рейтинги" reference dashboard's data model and scoring rules. Localized in
Uzbek (default), Russian and English, with a dark theme, keyboard-accessible
charts, and a responsive layout down to phone width.

**⚠️ Demo data.** Nothing in this build is connected to a real company
system. The dataset is synthetic and deterministic — see [Demo
data](#demo-data-what-you-are-looking-at) below. A "Demo data" banner is
shown on every page for this reason.

## Install & run

Requires Node 18+.

```bash
npm install
npm run dev        # dev server at http://localhost:5173
```

Other scripts:

```bash
npm run build       # production build to dist/
npm run preview     # serve the production build locally
npm run test        # vitest — the scoring engine's unit tests
npm run lint        # oxlint
```

To preview the loading/error state, add `?sim=error` to the URL once (works
reliably in `npm run build && npm run preview`; in `npm run dev`, React
StrictMode's double-effect-invocation can occasionally swallow the one-shot
failure — that's a dev-only quirk of the debug trick, not the app).

## What's here

- **Leaderboard** (`/`) — a featured top-three, four team KPI tiles, a
  filterable/sortable table (desktop) or card grid (mobile and by choice),
  per-row expandable radar analysis, an 8-week rank-history chart, and CSV
  export of exactly what's currently shown.
- **Member profile** (`/member/:id`) — full category breakdown vs. the team
  average, strengths/areas to improve, score and rank history charts, and
  prev/next navigation. The "back to leaderboard" link always preserves the
  filters you had set.
- **Compare** (`/compare?a=…&b=…`) — pick any two members (from the
  leaderboard's row/card toggle + floating tray, from a profile's "Compare
  with" link, or straight from the nav) to see their overall score, all five
  categories (as a dumbbell chart with real numbers, not color alone), a
  two-series radar, and score history side by side, plus a data-derived
  head-to-head sentence ("X leads in 3 of 5 categories, tied in 1").
- **How scoring works** (`/scoring`) — the rules below, plus live-editable
  category weights and zone thresholds (persisted to `localStorage`) so you
  can see the effect immediately once the real values are confirmed.

Filters (period/shift/area/category/search/sort/view) and the compare
selection all live in the URL, so every view is a shareable link and the
back button always does the right thing.

## Demo data: what you're looking at

`src/data/demoData.ts` generates 12 fictional members deterministically (same
data every load) across 2 shifts and several areas, with 16 weeks of history
per category. It deliberately includes:

- one member with **no data at all** (a "new hire") — exercises the
  unranked-but-visible state;
- one member with **a category that stopped being logged** partway through —
  exercises the partial-data warning;
- one member with **a two-week gap** (approved leave) — exercises missing
  weeks inside an otherwise-normal history.

All data flows through a single seam: **`src/data/dataSource.ts`**. Its
`DemoDataSource` is the only thing that needs replacing — swap `load()` for a
real API call (reusing whatever auth/session the app runs under) that
resolves the same `LeaderboardDataset` shape, and nothing else in the app
changes.

## Scoring rules — verified vs. placeholder

The five categories (Загрузка / Назорат / Кайзен / Хавотир / Давомат) and
their original labels are carried over as-is. Everything about *how they
combine into a score* is a labeled, configurable placeholder, not a
confirmed formula — this was true of the reference dashboard too. Evidence:
a rank-1 member there showed category scores of 88/84/89/85/96 — a plain
average of 88.4 — against a stated overall of 89.1. That gap proves real,
unequal weights (or an extra rule) exist; this build doesn't know what they
are, so it defaults to equal weights and says so on the scoring page.

What **is** implemented and tested (`src/lib/scoring.ts`,
`src/lib/scoring.test.ts`, 41 passing tests):

1. A category's period score is the mean of the weeks that have data; a
   missing week is skipped, never treated as 0.
2. A category with no data anywhere in the period is excluded, and the
   overall score is computed from the rest (flagged "partial").
3. A member with no score at all in the period isn't ranked, but stays
   visible in an "unranked" list.
4. Ranking compares scores rounded to one decimal; ties share a rank
   (1, 2, 2, 4) and sort by name.
5. Rank movement compares against the immediately-preceding period of equal
   length, same shift/area; if that period isn't fully in the data, no
   comparison is shown rather than a misleading partial one.
6. Periods snap to whole Monday–Sunday weeks. Search only hides rows — it
   never changes rank numbers or the team average, which are computed over
   the full filtered pool first. Export contains exactly the rows currently
   shown, in the current order.
7. The two-member comparison uses the same tie/missing-value rules: a
   category with either side missing is marked "no data" rather than handed
   to one side; equal (rounded) values are a tie, not a win.

## What's still needed to connect real data

- **The real category weights** behind the overall score (see above — they
  are demonstrably not equal).
- **Confirmation of the 80 / 65 zone thresholds**, and whether they're meant
  to apply per-category too, or only to the overall score.
- **Category definitions and data sources** for the five metrics — what a
  "Загрузка" or "Кайзен" score is actually computed from upstream.
- **Shift and area/team assignment source** (currently just fields on the
  demo member records).
- **Real member photos, with confirmation there's permission to display
  them.** Two separate demo image sets exist, and neither is a real Safia
  employee: the small circular avatar (`Member.avatarPhoto`) uses 12
  AI-generated synthetic faces (nobody real — see
  `public/portraits/README.md`), and the full-length photo used by the
  podium cards and the Career Card hero (`Member.fullBodyPhoto`) uses 12
  unrelated stock-photo models under the Pexels License (see
  `public/fullbody/README.md`) — deliberately a *different* person than the
  avatar face, since no tool here can extend one into the other without
  either fabricating an identity match or misattributing a real person's
  body. The UI falls back to an illustrated placeholder whenever either
  field is `null`, so swapping in real, approved staff photos (ideally the
  same photo shoot for both fields) is a data change, not a code change.
- **Authentication** — this build has none; it assumes the real deployment
  sits behind whatever the host IMS already uses, and that access control to
  employee performance data is enforced there.
- **Excel vs. CSV** — export currently produces CSV (UTF-8 BOM, opens
  correctly in Excel including Cyrillic names). Say the word if a native
  `.xlsx` is required instead.

The exact `LeaderboardDataset` shape the app expects is documented at the top
of `src/data/dataSource.ts` and again on the "How scoring works" page.

## Stack

React 19 + TypeScript + Vite + React Router, hand-rolled CSS Modules (no
Tailwind) against a validated CVD-safe color system, hand-rolled SVG charts
(no charting library — full control over mark specs, keyboard interaction,
and the always-present numeric/table fallback), Vitest for the scoring
engine.

## Known limitations

- No backend, no auth, no persistence beyond the browser's own
  `localStorage` for theme/language/scoring-config preferences.
- The 12-member roster is fixed at build time inside `demoData.ts`; there's
  no admin UI to add or edit members (out of scope for a demo data layer).
- Photos are never real — only initials avatars, by design, until real
  assets with usage permission are available.
