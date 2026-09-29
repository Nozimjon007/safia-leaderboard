import type { Zone } from '../data/types';

/** Zone -> visual mapping, centralized so color is never the only signal (always paired with the glyph + a text label). */
export function zoneColorVar(zone: Zone): string {
  switch (zone) {
    case 'good':
      return 'var(--status-good)';
    case 'low':
      return 'var(--status-critical)';
    case 'mid':
      return 'var(--ink-secondary)';
    default:
      return 'var(--ink-muted)';
  }
}

export function zoneBgVar(zone: Zone): string {
  switch (zone) {
    case 'good':
      return 'var(--status-good-bg)';
    case 'low':
      return 'var(--status-critical-bg)';
    default:
      return 'var(--status-mid-bg)';
  }
}

export function zoneGlyph(zone: Zone): string {
  switch (zone) {
    case 'good':
      return '✓'; // check
    case 'low':
      return '!';
    case 'mid':
      return '–'; // en dash
    default:
      return '?';
  }
}
