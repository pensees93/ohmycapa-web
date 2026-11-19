import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

interface ThemeContextValue {
  mode: 'light' | 'dark';
  toggleMode: () => void;
}

const ThemeCtx = createContext<ThemeContextValue>({ mode: 'dark', toggleMode: () => {} });

export const useThemeMode = () => useContext(ThemeCtx);

export const ThemeContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('ohmycapa-web-theme');
      return saved === 'light' || saved === 'dark' ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleMode = useCallback(() => {
    setMode(m => {
      const next = m === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('ohmycapa-web-theme', next);
      } catch {
        // Ignore storage errors in restricted contexts
      }
      return next;
    });
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          background: {
            default: mode === 'dark' ? '#121212' : '#f5f7fa',
            paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
        },
      }),
    [mode]
  );

  return (
    <ThemeCtx.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeCtx.Provider>
  );
};
