import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext(null);

const CURRENCIES = {
  COP: { code: 'COP', label: 'COP - Peso colombiano', symbol: '$', locale: 'es-CO' },
  USD: { code: 'USD', label: 'USD - Dólar estadounidense', symbol: '$', locale: 'en-US' },
  MXN: { code: 'MXN', label: 'MXN - Peso mexicano', symbol: '$', locale: 'es-MX' },
  EUR: { code: 'EUR', label: 'EUR - Euro', symbol: '€', locale: 'de-DE' },
};

const THEMES = ['dark', 'sand-beige'];

export function SettingsProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('app-theme') || 'dark';
    const savedSidebarStyle = localStorage.getItem('app-sidebar-style');
    // Migration: old beige sidebar → sand-beige theme
    if (savedSidebarStyle === 'beige') {
      localStorage.removeItem('app-sidebar-style');
      return 'sand-beige';
    }
    // Migration: light theme removed → fall back to dark
    if (savedTheme === 'light') return 'dark';
    return savedTheme;
  });

  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('app-currency') || 'COP';
  });

  // Apply theme to document — handles all 3 theme values
  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    localStorage.removeItem('app-sidebar-style'); // clean up legacy key
    const root = document.documentElement;

    // Reset all theme classes first
    root.classList.remove('dark', 'light', 'beige-theme');

    if (theme === 'sand-beige') {
      root.classList.add('beige-theme');
    } else {
      root.classList.add('dark');
    }
  }, [theme]);

  // Persist currency
  useEffect(() => {
    localStorage.setItem('app-currency', currency);
  }, [currency]);

  const currencyInfo = CURRENCIES[currency] || CURRENCIES.COP;

  const value = {
    theme,
    setTheme,
    currency,
    setCurrency,
    currencyInfo,
    CURRENCIES,
    THEMES,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
