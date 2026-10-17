import type { QuranFont } from '@/core/types';

export interface FontMetadata {
  id: QuranFont;
  name: string;
  family: string;
  url: string;
  format: string;
  status: string;
  type: 'glyph' | 'unicode';
}

export const fonts: Record<QuranFont, FontMetadata> = {
  qcf: {
    id: 'qcf',
    name: 'QSV / QCF Glyph (Mushaf Madinah)',
    family: '"QCF_BSML", "p1", serif',
    url: 'https://verses.quran.foundation/fonts/quran/hafs/v1/woff2/p1.woff2',
    format: 'woff2',
    status: 'available',
    type: 'glyph',
  },
  kfgqpc: {
    id: 'kfgqpc',
    name: 'KFGQPC Uthmanic Hafs',
    family: '"KFGQPC_Hafs", "Noto Naskh Arabic", serif',
    url: `${import.meta.env.BASE_URL}fonts/kfgqpc/kfgqpc-hafs.otf`,
    format: 'opentype',
    status: 'available',
    type: 'unicode',
  },
  'system-fallback': {
    id: 'system-fallback',
    name: 'System Arabic',
    family: 'Arial, "Traditional Arabic", "Scheherazade New", sans-serif',
    url: '',
    format: '',
    status: 'available',
    type: 'unicode',
  },
};

const loadedPages = new Set<number>();

/**
 * Memuat font halaman mushaf secara live dan on-demand langsung dari server CDN resmi Quran.com
 * (Quran Foundation WOFF2) tanpa perlu mengunduh atau menyimpan font di lokal.
 */
export async function loadQCFPageFont(pageNumber: number): Promise<string> {
  if (!pageNumber || pageNumber < 1 || pageNumber > 604) {
    return 'QCF_BSML';
  }

  const pageStr = String(pageNumber).padStart(3, '0');
  const familyName = `p${pageNumber}`;
  const legacyFamily = `QCF_P${pageStr}`;

  if (loadedPages.has(pageNumber)) {
    return familyName;
  }

  if (typeof document !== 'undefined') {
    const styleId = `qcf-font-p${pageNumber}`;
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        @font-face {
          font-family: '${familyName}';
          src: url('https://verses.quran.foundation/fonts/quran/hafs/v1/woff2/p${pageNumber}.woff2') format('woff2'),
               url('https://raw.githubusercontent.com/quran/quran.com-images/master/res/fonts/QCF_P${pageStr}.TTF') format('truetype');
          font-display: swap;
        }
        @font-face {
          font-family: '${legacyFamily}';
          src: url('https://verses.quran.foundation/fonts/quran/hafs/v1/woff2/p${pageNumber}.woff2') format('woff2'),
               url('https://raw.githubusercontent.com/quran/quran.com-images/master/res/fonts/QCF_P${pageStr}.TTF') format('truetype');
          font-display: swap;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }

  loadedPages.add(pageNumber);
  return familyName;
}

/**
 * Lazily loads a Quran font.
 */
export async function loadFont(fontId: QuranFont): Promise<boolean> {
  const fontMeta = fonts[fontId];
  if (!fontMeta) return false;

  if (fontMeta.id === 'system-fallback' || fontMeta.id === 'qcf') {
    return true;
  }

  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      const fontFace = new FontFace(fontMeta.family, `url(${fontMeta.url})`);
      await fontFace.load();
      document.fonts.add(fontFace);
      return true;
    } catch (e) {
      console.warn(`[FontManager] Failed to load font ${fontId}:`, e);
      return false;
    }
  }

  return true;
}

export function isFontLoaded(fontId: QuranFont): boolean {
  if (fontId === 'system-fallback' || fontId === 'qcf') return true;
  return true;
}

export function getFontFamily(fontId: QuranFont): string {
  const fontMeta = fonts[fontId];
  return fontMeta ? fontMeta.family : 'Arial, sans-serif';
}
