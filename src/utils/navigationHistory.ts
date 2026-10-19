/**
 * Tartil Shafa'i — Navigation History & Reading State Tracker
 *
 * Tracks the last opened Jilid / Reading package path so that
 * switching between Settings and Reading on mobile remains seamless
 * without resetting to Jilid 1.
 */

const LAST_READING_KEY = 'tartil_last_reading_path';
let inMemoryLastPath = '/jilid/1';

export function setLastReadingPath(path: string): void {
  if (!path || path === '/settings' || path === '/' || path === '/search' || path.startsWith('/admin')) {
    return;
  }
  inMemoryLastPath = path;
  try {
    sessionStorage.setItem(LAST_READING_KEY, path);
  } catch {}
}

export function getLastReadingPath(): string {
  try {
    const saved = sessionStorage.getItem(LAST_READING_KEY);
    if (saved && (saved.startsWith('/jilid/') || saved.startsWith('/paket/'))) {
      return saved;
    }
  } catch {}
  return inMemoryLastPath;
}
