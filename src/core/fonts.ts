/**
 * Tartil Shafa'i — Font Configuration
 *
 * Defines the four Quran font options as specified in the PRD.
 * Actual font files will be added in Phase 5 (Four Font System).
 */

import type { QuranFont, QuranFontOption } from './types';

const FONT_STORAGE_KEY = 'tartil-quran-font';
const FONT_SIZE_STORAGE_KEY = 'tartil-arabic-font-size';
const LINE_HEIGHT_STORAGE_KEY = 'tartil-arabic-line-height';

/**
 * Four Quran font options as defined in the PRD.
 */
export const QURAN_FONT_OPTIONS: QuranFontOption[] = [
  {
    id: 'qcf',
    name: 'QSV / QCF Glyph (Mushaf Madinah)',
    description: 'Font resmi Mushaf Madinah sesuai Quran.com',
    sampleText: 'ﭑ ﭒ ﭓ ﭔ ﭕ',
    fontFamily: '"QCF_BSML", "p1", serif',
  },
];

/**
 * Get the stored font preference, or default to 'qcf'.
 */
export function getStoredFont(): QuranFont {
  return 'qcf';
}

export function storeFont(font: QuranFont): void {
  try {
    localStorage.setItem(FONT_STORAGE_KEY, font);
  } catch {
    // localStorage not available
  }
}

/**
 * Arabic font size steps as defined in DESIGN.md: 22, 26, 30, 34, 38.
 */
export const ARABIC_FONT_SIZE_STEPS = [22, 26, 30, 34, 38] as const;
export const DEFAULT_ARABIC_FONT_SIZE = 30;
export const DEFAULT_ARABIC_LINE_HEIGHT = 2.2;

export function getStoredFontSize(): number {
  try {
    const stored = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (stored) {
      const num = parseInt(stored, 10);
      if (ARABIC_FONT_SIZE_STEPS.includes(num as (typeof ARABIC_FONT_SIZE_STEPS)[number])) {
        return num;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_ARABIC_FONT_SIZE;
}

export function storeFontSize(size: number): void {
  try {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(size));
  } catch {
    // ignore
  }
}

export function getStoredLineHeight(): number {
  try {
    const stored = localStorage.getItem(LINE_HEIGHT_STORAGE_KEY);
    if (stored) {
      const num = parseFloat(stored);
      if (num >= 1.8 && num <= 2.6) {
        return num;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_ARABIC_LINE_HEIGHT;
}

export function storeLineHeight(height: number): void {
  try {
    localStorage.setItem(LINE_HEIGHT_STORAGE_KEY, String(height));
  } catch {
    // ignore
  }
}

/**
 * Get the QuranFontOption for a given font ID.
 */
export function getFontOption(fontId: QuranFont): QuranFontOption {
  return QURAN_FONT_OPTIONS.find((f) => f.id === fontId) ?? QURAN_FONT_OPTIONS[0];
}
