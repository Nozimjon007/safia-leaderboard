import { NavLink, useLocation } from 'react-router-dom';
import { LOCALES, LOCALE_NAMES, useI18n, type Locale } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { useViewAsMemberId } from '../../hooks/useViewAsMember';
import styles from './Header.module.css';

export function Header() {
  const { t, locale, setLocale } = useI18n();
  const { isDark, toggle } = useTheme();
  const [viewAsMemberId] = useViewAsMemberId(null);
  // Carry whatever leaderboard filters (period/shift/area/etc.) are in the current URL across nav
  // clicks, so switching tabs and coming back never silently resets what the viewer had selected.
  // The compare page's own a/b picks are page-specific, so they're stripped before reuse elsewhere.
  const { search: rawSearch } = useLocation();
  const search = (() => {
    const params = new URLSearchParams(rawSearch);
    params.delete('a');
    params.delete('b');
    const s = params.toString();
    return s ? `?${s}` : '';
  })();

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <NavLink to={{ pathname: '/', search }} className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            S
          </span>
          <span className={styles.brandName}>{t('app_title')}</span>
        </NavLink>

        <nav className={styles.nav} aria-label={t('nav_leaderboard')}>
          <NavLink to={{ pathname: '/', search }} end className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}>
            {t('nav_leaderboard')}
          </NavLink>
          {/* Right after Leaderboard, deliberately before Compare/Seasons — the nav's overflow
              fallback is a horizontal scroll starting from the left (see .nav below), so whatever
              sits this early always stays fully visible even at the narrowest phone widths, which
              is exactly what "impossible to miss" requires for the shop specifically. */}
          <NavLink to="/shop" data-nav-shop className={({ isActive }) => `${isActive ? styles.navLinkActive : styles.navLink} ${styles.navLinkShop}`}>
            <span aria-hidden="true">◈</span> {t('nav_shop')}
          </NavLink>
          <NavLink to={{ pathname: '/compare', search }} className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}>
            {t('nav_compare')}
          </NavLink>
          <NavLink
            to={{ pathname: '/seasons', search }}
            data-nav-seasons
            className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
          >
            {t('nav_seasons')}
          </NavLink>
          {viewAsMemberId && (
            <NavLink
              to={{ pathname: `/member/${viewAsMemberId}`, search }}
              data-nav-progress
              className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
            >
              {t('nav_progress')}
            </NavLink>
          )}
          <NavLink to={{ pathname: '/scoring', search }} className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}>
            {t('nav_scoring')}
          </NavLink>
        </nav>

        <div className={styles.tools}>
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
