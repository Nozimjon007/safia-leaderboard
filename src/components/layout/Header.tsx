import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LOCALES, LOCALE_NAMES, useI18n, type Locale } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';
import styles from './Header.module.css';

export function Header() {
  const { t, locale, setLocale } = useI18n();
  const { isDark, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  // Carry whatever leaderboard filters (period/shift/area/etc.) are in the current URL across nav
  // clicks, so switching tabs and coming back never silently resets what the viewer had selected.
  // The compare page's own a/b picks are page-specific, so they're stripped before reuse elsewhere.
  const { pathname, search: rawSearch } = useLocation();
  const search = (() => {
    const params = new URLSearchParams(rawSearch);
    params.delete('a');
    params.delete('b');
    const s = params.toString();
    return s ? `?${s}` : '';
  })();

  // Six required destinations plus language/theme controls genuinely don't fit a phone-width bar
  // alongside each other — below the breakpoint this becomes a toggled dropdown instead of letting
  // items get silently squeezed off-screen (see Header.module.css's .nav rules for the split).
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <NavLink to={{ pathname: '/', search }} className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            S
          </span>
          <span className={styles.brandName}>{t('app_title')}</span>
        </NavLink>

        {/* The six primary destinations a returning employee actually needs, in this exact order.
            Compare and the scoring explanation are deliberately not here: Compare is reached from
            cards, profiles, and the ranking table instead (adding it a second time here would just
            be a shortcut for a shortcut), and scoring lives in .tools — still one click from every
            page, but visually secondary to where the day-to-day nav is a returning employee needs. */}
        <nav id="primary-nav" className={styles.nav} aria-label={t('nav_leaderboard')} data-mobile-open={menuOpen || undefined}>
          <NavLink to={{ pathname: '/', search }} end className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}>
            {t('nav_leaderboard')}
          </NavLink>
          <NavLink to={{ pathname: '/clans', search }} data-nav-clans className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}>
            {t('nav_clans')}
          </NavLink>
          <NavLink
            to={{ pathname: '/seasons', search }}
            data-nav-seasons
            className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
          >
            {t('nav_seasons')}
          </NavLink>
          <NavLink
            to={{ pathname: '/my-progress', search }}
            data-nav-progress
            className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
          >
            {t('nav_progress')}
          </NavLink>
          <NavLink to={{ pathname: '/rewards', search }} data-nav-rewards className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}>
            {t('nav_rewards')}
          </NavLink>
          <NavLink to="/shop" data-nav-shop className={({ isActive }) => `${isActive ? styles.navLinkActive : styles.navLink} ${styles.navLinkShop}`}>
            <span aria-hidden="true">◈</span> {t('nav_shop')}
          </NavLink>
          <NavLink to={{ pathname: '/scoring', search }} className={styles.scoringLinkMobile}>
            {t('nav_scoring')}
          </NavLink>
        </nav>

        <div className={styles.tools}>
          <NavLink to={{ pathname: '/scoring', search }} className={styles.scoringLink}>
            {t('nav_scoring')}
          </NavLink>
          <button
            type="button"
            className={styles.menuToggle}
            aria-expanded={menuOpen}
            aria-controls="primary-nav"
            aria-label={menuOpen ? t('nav_menu_close') : t('nav_menu_open')}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
          </button>
          <label className="visually-hidden" htmlFor="lang-select">
            {t('language_label')}
          </label>
          <select
            id="lang-select"
            className={styles.select}
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_NAMES[l]}
              </option>
            ))}
          </select>
          <button type="button" className={styles.themeBtn} onClick={toggle} aria-pressed={isDark}>
            <span aria-hidden="true">{isDark ? '☀' : '☾'}</span>
            <span>{isDark ? t('theme_to_light') : t('theme_to_dark')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
