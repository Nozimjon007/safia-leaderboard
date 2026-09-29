import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type ThemePreference = 'light' | 'dark' | null;
const STORAGE_KEY = 'lb_theme';

function detectStoredPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // ignore
  }
  return null;
}

interface ThemeContextValue {
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(detectStoredPreference);
  const [systemDark, setSystemDark] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (preference) document.documentElement.setAttribute('data-theme', preference);
    else document.documentElement.removeAttribute('data-theme');
    try {
      if (preference) localStorage.setItem(STORAGE_KEY, preference);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [preference]);

  const isDark = preference ? preference === 'dark' : systemDark;
  const toggle = useCallback(() => setPreference(isDark ? 'light' : 'dark'), [isDark]);
  const value = useMemo<ThemeContextValue>(() => ({ isDark, toggle }), [isDark, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
