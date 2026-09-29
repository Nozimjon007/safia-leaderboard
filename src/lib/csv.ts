import { CATEGORY_KEYS } from '../data/types';
import type { LeaderboardRow } from './scoring';
import { categoryLabel, type TFunction } from '../i18n';

function csvCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function numCell(v: number | null): string {
  return v == null ? '' : (Math.round(v * 10) / 10).toString();
}

export interface ExportMeta {
  metricLabel: string;
  fromISO: string;
  toISO: string;
  shiftLabel: string;
  areaLabel: string;
  sourceLabel: string;
}

/** Builds the CSV for exactly the rows currently shown (filtered + sorted), matching rule R6. */
export function buildLeaderboardCsv(rows: readonly LeaderboardRow[], t: TFunction, meta: ExportMeta): string {
  const header = [
    t('col_rank'),
    t('sort_move'),
    t('previous_rank'),
    t('col_member'),
    t('area_label'),
    t('shift_label'),
    t('col_overall'),
    ...CATEGORY_KEYS.map((c) => categoryLabel(t, c)),
    t('metric_label'),
    t('period_from'),
    t('period_to'),
    t('col_source'),
  ];
  const lines: string[][] = [header];
  for (const r of rows) {
    lines.push(
      [
        r.rank ?? '',
        r.move ?? '',
        r.previousRank ?? '',
        r.member.name,
        r.member.area,
        r.member.shift,
        numCell(r.current.overall),
        ...CATEGORY_KEYS.map((c) => numCell(r.current.categories[c])),
        meta.metricLabel,
        meta.fromISO,
        meta.toISO,
        meta.sourceLabel,
      ].map(String),
    );
  }
  // Leading BOM so Excel opens the UTF-8 file (Cyrillic names/labels) without mangling it.
  return '﻿' + lines.map((line) => line.map(csvCell).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
