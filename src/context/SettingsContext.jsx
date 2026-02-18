import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext(null);

const CURRENCIES = {
  COP: { code: 'COP', label: 'COP - Peso colombiano', symbol: '$', locale: 'es-CO' },
  USD: { code: 'USD', label: 'USD - Dólar estadounidense', symbol: '$', locale: 'en-US' },
  MXN: { code: 'MXN', label: 'MXN - Peso mexicano', symbol: '$', locale: 'es-MX' },
  EUR: { code: 'EUR', label: 'EUR - Euro', symbol: '€', locale: 'de-DE' },
};

const THEMES = ['dark', 'light'];

export function SettingsProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'dark';
  });

  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('app-currency') || 'COP';
  });

  // Apply theme to document
  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
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
