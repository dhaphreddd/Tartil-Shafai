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
  'qcf-v2': {
    id: 'qcf-v2',
    name: 'Mushaf Madinah V2 (Standar Quran.com)',
    family: '"p1-v2", "p1", serif',
    url: 'https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/p1.woff2',
    format: 'woff2',
    status: 'available',
    type: 'glyph',
  },
  'qcf-v1': {
    id: 'qcf-v1',
    name: 'Mushaf Madinah V1 (Klasik)',
    family: '"p1-v1", "QCF_BSML", serif',
    url: 'https://verses.quran.foundation/fonts/quran/hafs/v1/woff2/p1.woff2',
    format: 'woff2',
    status: 'available',
    type: 'glyph',
  },
  qcf: {
    id: 'qcf',
    name: 'Mushaf Madinah V2 (Standar Quran.com)',
    family: '"p1-v2", "p1", serif',
    url: 'https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/p1.woff2',
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

const loadedPages = new Set<string>();

/**
 * Memuat font halaman mushaf secara live dan on-demand langsung dari server CDN resmi Quran.com
 * (Quran Foundation WOFF2). Mendukung versi V1 (klasik) dan V2 (standar Quran.com).
 */
export async function loadQCFPageFont(pageNumber: number, version: 'v1' | 'v2' = 'v2'): Promise<string> {
  if (!pageNumber || pageNumber < 1 || pageNumber > 604) {
    return 'QCF_BSML';
  }

  const cacheKey = `${pageNumber}_${version}`;
  const familyName = `p${pageNumber}-${version}`;
  const pageStr = String(pageNumber).padStart(3, '0');

  if (loadedPages.has(cacheKey)) {
    return familyName;
  }

  if (typeof document !== 'undefined') {
    const styleId = `qcf-font-p${pageNumber}-${version}`;
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;

      const fontUrl =
        version === 'v2'
          ? `https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/p${pageNumber}.woff2`
          : `https://verses.quran.foundation/fonts/quran/hafs/v1/woff2/p${pageNumber}.woff2`;

      const fallbackSrc =
        version === 'v1'
          ? `, url('https://raw.githubusercontent.com/quran/quran.com-images/master/res/fonts/QCF_P${pageStr}.TTF') format('truetype')`
          : '';

      styleEl.textContent = `
        @font-face {
          font-family: '${familyName}';
          src: url('${fontUrl}') format('woff2')${fallbackSrc};
          font-display: swap;
        }
        @font-face {
          font-family: 'p${pageNumber}';
          src: url('${fontUrl}') format('woff2')${fallbackSrc};
          font-display: swap;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }

  loadedPages.add(cacheKey);
  return familyName;
}

/**
 * Lazily loads a Quran font.
 */
export async function loadFont(fontId: QuranFont): Promise<boolean> {
  const fontMeta = fonts[fontId];
  if (!fontMeta) return false;

  if (
    fontMeta.id === 'system-fallback' ||
    fontMeta.id === 'qcf' ||
    fontMeta.id === 'qcf-v1' ||
    fontMeta.id === 'qcf-v2'
  ) {
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
  if (
    fontId === 'system-fallback' ||
    fontId === 'qcf' ||
    fontId === 'qcf-v1' ||
    fontId === 'qcf-v2'
  )
    return true;
  return true;
}

export function getFontFamily(fontId: QuranFont): string {
  const fontMeta = fonts[fontId];
  return fontMeta ? fontMeta.family : 'Arial, sans-serif';
}
