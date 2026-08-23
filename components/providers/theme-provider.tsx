'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface ThemeProviderProps {
  children: ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
}

type Theme = 'light' | 'dark' | 'system';
type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: string) => void;
};
const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => undefined,
});

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    const stored = window.localStorage.getItem(props.storageKey || 'theme');
    return stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : 'system';
  });
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (dark: boolean) => setSystemTheme(dark ? 'dark' : 'light');
    const stored = window.localStorage.getItem(
      props.storageKey || 'theme'
    ) as Theme | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system')
      setThemeState(stored);
    apply(media.matches);
    const onChange = (event: MediaQueryListEvent) => apply(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [props.storageKey]);

  useEffect(() => {
    const root = document.documentElement;
    const transitionLock = props.disableTransitionOnChange !== false;
    if (transitionLock) root.classList.add('theme-transition-lock');
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.dataset.pesabyTheme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    if (transitionLock) {
      const unlock = window.setTimeout(
        () => root.classList.remove('theme-transition-lock'),
        0
      );
      return () => window.clearTimeout(unlock);
    }
  }, [props.disableTransitionOnChange, resolvedTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (next: string) => {
        if (next !== 'light' && next !== 'dark' && next !== 'system') return;
        setThemeState(next);
        window.localStorage.setItem(props.storageKey || 'theme', next);
      },
    }),
    [props.storageKey, resolvedTheme, theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
