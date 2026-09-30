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

// See lib/craftPaths.ts's CRAFT_PATHS — one path per role, named separately from the plain role
// label (e.g. "Baker's Path" vs. "Baker") since it's shown right alongside the role itself.
const CRAFT_PATH_NAME_KEYS: Record<string, TranslationKey> = {
  Baker: 'craft_path_name_baker',
  'Shift Lead': 'craft_path_name_shift_lead',
  Decorator: 'craft_path_name_decorator',
  Packer: 'craft_path_name_packer',
  Cashier: 'craft_path_name_cashier',
  Delivery: 'craft_path_name_delivery',
};

export function craftPathLabel(t: TFunction, role: string): string {
  const key = CRAFT_PATH_NAME_KEYS[role];
  return key ? t(key) : t('craft_path_heading');
}

const ROLE_DESC_KEYS: Record<string, TranslationKey> = {
  Baker: 'role_baker_desc',
  'Shift Lead': 'role_shift_lead_desc',
  Decorator: 'role_decorator_desc',
  Packer: 'role_packer_desc',
  Cashier: 'role_cashier_desc',
  Delivery: 'role_delivery_desc',
};

/** A one-sentence "what this job actually does" — see JobPanel. Configurable in one place (this
 * map + the role_*_desc dictionary entries), never a generic "Works at Safia" filler. */
export function roleDescription(t: TFunction, role: string): string {
  const key = ROLE_DESC_KEYS[role];
  return key ? t(key) : '';
}

/** A plain, deliberately non-colorful icon per job — the bakery-specific ones (bread, cake) are
 * on-brand; kept simple and consistent with the rest of the app's icon language elsewhere. */
const ROLE_ICON: Record<string, string> = {
  Baker: '🍞',
  'Shift Lead': '🧭',
  Decorator: '🎂',
  Packer: '📦',
  Cashier: '💳',
  Delivery: '🚚',
};

export function roleIcon(role: string): string {
  return ROLE_ICON[role] ?? '💼';
}

const SITE_RE = /^Site (\d+)$/;
const SHIFT_RE = /^S(\d+)$/;

/** Member.area is demo data shaped like "Site 7" (see demoData.ts) — localized here rather than
 * baking a translated string into the data itself, so the same member record renders correctly in
 * every locale. Degrades to the raw value for anything that doesn't match the expected shape. */
export function areaLabel(t: TFunction, area: string): string {
  const m = SITE_RE.exec(area);
  return m ? t('site_n', { n: m[1] }) : area;
}

/** Member.shift is "S1"/"S2" — same localization approach as areaLabel, and the same pattern
 * FiltersBar's shift filter already uses for its own option labels. */
export function shiftLabel(t: TFunction, shift: string): string {
  const m = SHIFT_RE.exec(shift);
  return m ? t('shift_n', { n: m[1] }) : shift;
}

const CLAN_NAME_KEYS: Record<string, TranslationKey> = {
  golden_crust: 'clan_name_golden_crust',
  saffron_rise: 'clan_name_saffron_rise',
  cinnamon_hearth: 'clan_name_cinnamon_hearth',
  honey_bloom: 'clan_name_honey_bloom',
};

const CLAN_IDENTITY_KEYS: Record<string, TranslationKey> = {
  golden_crust: 'clan_identity_golden_crust',
  saffron_rise: 'clan_identity_saffron_rise',
  cinnamon_hearth: 'clan_identity_cinnamon_hearth',
  honey_bloom: 'clan_identity_honey_bloom',
};

export function clanName(t: TFunction, clanId: string): string {
  const key = CLAN_NAME_KEYS[clanId];
  return key ? t(key) : clanId;
}

/** A short one-line tagline — "steady hands, golden loaves" — not a full description. */
export function clanIdentity(t: TFunction, clanId: string): string {
  const key = CLAN_IDENTITY_KEYS[clanId];
  return key ? t(key) : '';
}

// The Safia Rewards Shop's catalog ids and enum values already match their translation keys'
// naming convention exactly (see lib/shop.ts and the shop_* dictionary entries), so these build the
// key directly rather than keeping a second, redundant id->key map in sync with the catalog.
export function shopItemName(t: TFunction, itemId: string): string {
  return t(`shop_item_${itemId}_name` as TranslationKey);
}

export function shopItemDescription(t: TFunction, itemId: string): string {
  return t(`shop_item_${itemId}_desc` as TranslationKey);
}

export function shopCategoryLabel(t: TFunction, category: string): string {
  return t(`shop_category_${category}` as TranslationKey);
}

export function shopPendingReasonLabel(t: TFunction, reason: string): string {
  return t(`shop_pending_${reason}` as TranslationKey);
}

export function shopStatusLabel(t: TFunction, status: string): string {
  return t(`shop_status_${status}` as TranslationKey);
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

/** Same "Xd Yh remaining" shape as seasonCountdownText, but for an upcoming season's time-to-start. */
export function seasonStartCountdownText(t: TFunction, countdown: { hasStarted: boolean; days: number; hours: number; minutes: number }): string {
  if (countdown.hasStarted) return t('season_countdown_starting_today');
  if (countdown.days > 0) return t('season_countdown_days_hours', { d: countdown.days, h: countdown.hours });
  if (countdown.hours > 0 || countdown.minutes > 0) return t('season_countdown_hours_only', { h: countdown.hours, m: countdown.minutes });
  return t('season_countdown_starting_today');
}
