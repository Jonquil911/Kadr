import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getStoredTheme, storeTheme } from '../services/preferences';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // цвет системной панели в установленном PWA и мобильном браузере
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#eef0f6' : '#151a2e');
    storeTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next) => setThemeState(next), []);
  const toggleTheme = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme должен вызываться внутри <ThemeProvider>');
  return context;
}
