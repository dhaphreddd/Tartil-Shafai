/**
 * Tartil Shafa'i — Theme Context
 *
 * Provides theme state and toggle throughout the app.
 * Supports System / Light / Dark with localStorage persistence.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import type { ThemeMode } from '@/core/types';
import {
  applyTheme,
  getStoredTheme,
  resolveTheme,
  storeTheme,
} from '@/core/theme';

interface ThemeContextValue {
  /** Current mode preference: 'system' | 'light' | 'dark' */
  mode: ThemeMode;
  /** Resolved effective theme: 'light' | 'dark' */
  effective: 'light' | 'dark';
  /** Set the theme mode */
  setMode: (mode: ThemeMode) => void;
  /** Cycle through modes: system → light → dark → system */
  cycleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const MODE_CYCLE: ThemeMode[] = ['system', 'light', 'dark'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getStoredTheme);
  const [effective, setEffective] = useState<'light' | 'dark'>(() =>
    resolveTheme(getStoredTheme())
  );

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    storeTheme(newMode);
    applyTheme(newMode);
    setEffective(resolveTheme(newMode));
  }, []);

  const cycleMode = useCallback(() => {
    setModeState((prev) => {
      const idx = MODE_CYCLE.indexOf(prev);
      const next = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length];
      storeTheme(next);
      applyTheme(next);
      setEffective(resolveTheme(next));
      return next;
    });
  }, []);

  // Apply on mount and listen for OS changes
  useEffect(() => {
    applyTheme(mode);

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (mode === 'system') {
        applyTheme('system');
        setEffective(resolveTheme('system'));
      }
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, effective, setMode, cycleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
