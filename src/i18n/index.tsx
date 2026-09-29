import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type TranslationDict, type TranslationKey } from './locales/en';
import { ru } from './locales/ru';
import { uz } from './locales/uz';
import type { CategoryKey } from '../data/types';

export type Locale = 'uz' | 'ru' | 'en';
export const LOCALES: readonly Locale[] = ['uz', 'ru', 'en'];
export const LOCALE_NAMES: Record<Locale, string> = { uz: "O'zbekcha", ru: 'Русский', en: 'English' };

const DICTS: Record<Locale, TranslationDict> = { uz, ru, en };
const STORAGE_KEY = 'lb_lang';

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (LOCALES as readonly string[]).includes(saved)) return saved as Locale;
  } catch {
    // localStorage unavailable (private mode, etc.) — fall through to language detection
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  if (/^ru/i.test(nav)) return 'ru';
  if (/^en/i.test(nav)) return 'en';
  return 'uz';
}

export type TFunction = (key: TranslationKey, params?: Record<string, string | number>) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(detectLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore
    }
  }, [locale]);

  const t = useMemo<TFunction>(() => {
    return (key, params) => {
      let str = DICTS[locale][key] ?? DICTS.en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) str = str.split(`{${k}}`).join(String(v));
      }
      return str;
    };
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function categoryLabel(t: TFunction, category: CategoryKey): string {
  return t(`cat_${category}` as TranslationKey);
}

export function categoryOriginalLabel(t: TFunction, category: CategoryKey): string {
  return t(`cat_${category}_original` as TranslationKey);
}

// Member.role is free-text demo data (see demoData.ts SEED_MEMBERS), not a typed union like
// CategoryKey, so it needs an explicit lookup rather than a `role_${role}` template — that also
// means an unrecognized role degrades to showing the raw string instead of a missing-key crash.
const ROLE_LABEL_KEYS: Record<string, TranslationKey> = {
  Baker: 'role_baker',
  'Shift Lead': 'role_shift_lead',
  Decorator: 'role_decorator',
  Packer: 'role_packer',
  Cashier: 'role_cashier',
  Delivery: 'role_delivery',
};

export function roleLabel(t: TFunction, role: string): string {
  const key = ROLE_LABEL_KEYS[role];
  return key ? t(key) : role;
}

/** "Q3 2026" / "3 кв. 2026" / "2026 йил, 3-чорак" — compact quarter label, locale-aware. */
export function seasonQuarterLabel(t: TFunction, season: { year: number; quarter: number }): string {
  return t('season_quarter_label', { quarter: season.quarter, year: season.year });
}

/** "2 дн. 5 ч." style countdown text — shared by SeasonPanel and the podium season strip. */
export function seasonCountdownText(t: TFunction, countdown: { isComplete: boolean; days: number; hours: number; minutes: number }): string {
  if (countdown.isComplete) return t('season_countdown_complete');
  if (countdown.days > 0) return t('season_countdown_days_hours', { d: countdown.days, h: countdown.hours });
  if (countdown.hours > 0 || countdown.minutes > 0) return t('season_countdown_hours_only', { h: countdown.hours, m: countdown.minutes });
  return t('season_countdown_ending_today');
}
