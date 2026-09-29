/** Locale-aware number formatting. uz/ru use a comma decimal separator; en uses a dot. */
export function decimalSeparator(locale: string): string {
  return locale === 'en' ? '.' : ',';
}

export function formatScore(value: number | null, locale: string, digits = 1): string {
  if (value == null) return '—';
  return value.toFixed(digits).replace('.', decimalSeparator(locale));
}

/** Signed delta with +/−/± prefix, e.g. "+3,2" or "−1.0". */
export function formatSigned(value: number | null, locale: string, digits = 1): string {
  if (value == null) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  return sign + Math.abs(value).toFixed(digits).replace('.', decimalSeparator(locale));
}

export function formatPercent(value: number | null): string {
  return value == null ? '—' : `${Math.round(value)}%`;
}
