/**
 * Tartil Shafa'i — Theme Manager
 *
 * Handles System / Light / Dark theme with localStorage persistence.
 * Default: System (follows OS preference).
 */

import type { ThemeMode } from './types';

const THEME_STORAGE_KEY = 'tartil-theme';

/**
 * Read the stored theme preference or return 'system' as default.
 */
export function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  return 'system';
}

/**
 * Persist theme preference to localStorage.
 */
export function storeTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // localStorage not available
  }
}

/**
 * Resolve the effective theme (light or dark) based on current mode.
 */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return mode;
}

/**
 * Apply the theme class to <html> element.
 */
export function applyTheme(mode: ThemeMode): void {
  const effective = resolveTheme(mode);
  const root = document.documentElement;

  root.classList.remove('light', 'dark');
  root.classList.add(effective);

  // Update meta theme-color for PWA
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute(
      'content',
      effective === 'dark' ? '#111111' : '#9A7738'
    );
  }
}

/**
 * Initialize theme on app boot — reads storage, applies, and listens for OS changes.
 */
export function initializeTheme(): ThemeMode {
  const mode = getStoredTheme();
  applyTheme(mode);

  // Listen for OS preference changes when in system mode
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', () => {
    const currentMode = getStoredTheme();
    if (currentMode === 'system') {
      applyTheme('system');
    }
  });

  return mode;
}
