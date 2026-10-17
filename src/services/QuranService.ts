/**
 * Tartil Shafa'i — Quran Service
 *
 * Mengambil data ayat, metadata, teks Uthmani, dan kode glyph Mushaf Madinah
 * langsung secara live dari API resmi Quran.com (Quran Foundation V4 API).
 */

import type { Ayah, SurahData, SurahMetadata } from '@/core/types';
import { SurahNameService } from './SurahNameService';

const QURAN_API_BASE = 'https://api.quran.com/api/v4';

const surahCache = new Map<number, SurahData>();
const rangeCache = new Map<string, Ayah[]>();
let surahsMetadataCache: SurahMetadata[] | null = null;

// Reset cache metadata ketika admin mengubah nama surat
if (typeof window !== 'undefined') {
  window.addEventListener('tartil_surah_names_change', () => {
    surahsMetadataCache = null;
    surahCache.clear();
  });
}

/**
 * Mendapatkan metadata seluruh 114 surat langsung dari Quran.com API (dengan transliterasi standar Indonesia / kustom).
 */
export async function getSurahsMetadata(): Promise<SurahMetadata[]> {
  if (surahsMetadataCache && surahsMetadataCache.length > 0) {
    return surahsMetadataCache;
  }

  try {
    const res = await fetch(`${QURAN_API_BASE}/chapters?language=id`);
    if (!res.ok) throw new Error(`HTTP ${res.status} from Quran.com chapters API`);
    const data = await res.json();
    
    if (Array.isArray(data.chapters)) {
      const metadata: SurahMetadata[] = data.chapters.map((c: any) => ({
        id: c.id,
        name: SurahNameService.getSurahName(c.id, c.name_simple),
        nameArabic: SurahNameService.getSurahArabic(c.id, c.name_arabic),
        ayahCount: c.verses_count,
      }));
      surahsMetadataCache = metadata;
      return metadata;
    }
  } catch (err) {
    console.warn('[QuranService] Gagal fetch chapters dari Quran.com, mencoba fallback lokal:', err);
  }

  // Fallback lokal jika internet terputus
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}quran/metadata/surahs.json`);
    if (response.ok) {
      const rawMeta: SurahMetadata[] = await response.json();
      const metadata: SurahMetadata[] = rawMeta.map((s) => ({
        ...s,
        name: SurahNameService.getSurahName(s.id, s.name),
        nameArabic: SurahNameService.getSurahArabic(s.id, s.nameArabic),
      }));
      surahsMetadataCache = metadata;
      return metadata;
    }
  } catch (e) {
    console.error('Local fallback failed:', e);
  }

  return [];
}

/**
 * Mengambil rentang ayat tertentu langsung dari Quran.com API.
 * Menyertakan nomor ayat, nomor halaman mushaf, teks Uthmani resmi, dan kode glyph V1.
 */
export async function resolveAyahRange(
  surahId: number,
  startAyah: number,
  endAyah: number
): Promise<Ayah[]> {
  const cacheKey = `${surahId}_${startAyah}_${endAyah}`;
  if (rangeCache.has(cacheKey)) {
    return rangeCache.get(cacheKey)!;
  }

  const expectedCount = endAyah - startAyah + 1;
  const perPage = Math.min(300, Math.max(expectedCount, 50));

  try {
    let allVerses: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      // Panggil langsung endpoint verses Quran.com dengan filter from & to dan per_page yang memadai
      const url = `${QURAN_API_BASE}/verses/by_chapter/${surahId}?from=${startAyah}&to=${endAyah}&page=${page}&per_page=${perPage}&words=true&word_fields=code_v1,text_uthmani,v1_page&fields=text_uthmani,verse_number,page_number,code_v1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} from Quran.com verses API`);
      const data = await res.json();

      if (Array.isArray(data.verses)) {
        allVerses.push(...data.verses);
      }

      if (data.pagination && data.pagination.next_page && allVerses.length < expectedCount) {
        page = data.pagination.next_page;
      } else {
        hasMore = false;
      }
    }

    if (allVerses.length > 0) {
      const ayahs: Ayah[] = allVerses.map((v: any) => {
        // Ambil code_v1 langsung dari verse atau gabungkan dari words
        const glyphText =
          v.code_v1 ||
          (Array.isArray(v.words) ? v.words.map((w: any) => w.code_v1).filter(Boolean).join(' ') : undefined);

        const rawClean =
          v.verse_number === 1 && surahId !== 1
            ? stripLeadingBasmalah(v.text_uthmani)
            : v.text_uthmani;
        const cleanText = typeof rawClean === 'string' ? rawClean.trim() : rawClean;

        return {
          ayahNumber: v.verse_number,
          text: cleanText,
          pageNumber: v.page_number,
          glyphCode: glyphText,
        };
      });

      rangeCache.set(cacheKey, ayahs);
      return ayahs;
    }
  } catch (err) {
    console.warn(`[QuranService] Gagal fetch range ${surahId}:${startAyah}-${endAyah} dari Quran.com API, mencoba fallback:`, err);
  }

  // Fallback ke dataset lokal jika sedang offline
  try {
    const surahData = await getSurahData(surahId);
    if (surahData) {
      const filtered = surahData.ayahs
        .filter((a) => a.ayahNumber >= startAyah && a.ayahNumber <= endAyah)
        .map((a) => ({
          ...a,
          text: a.ayahNumber === 1 && surahId !== 1 ? stripLeadingBasmalah(a.text) : a.text,
        }));
      rangeCache.set(cacheKey, filtered);
      return filtered;
    }
  } catch (e) {
    console.error('Fallback error:', e);
  }

  return [];
}

/**
 * Mengambil seluruh data surat langsung dari Quran.com API.
 */
export async function getSurahData(surahId: number): Promise<SurahData | null> {
  if (surahId < 1 || surahId > 114) return null;
  if (surahCache.has(surahId)) return surahCache.get(surahId)!;

  try {
    // Quran.com API pagination (max per_page=300 mencakup seluruh surat)
    const url = `${QURAN_API_BASE}/verses/by_chapter/${surahId}?per_page=300&words=true&word_fields=code_v1,text_uthmani,v1_page&fields=text_uthmani,verse_number,page_number,code_v1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} from Quran.com API`);
    const data = await res.json();

    if (Array.isArray(data.verses)) {
      const meta = (await getSurahsMetadata()).find((s) => s.id === surahId);
      const ayahs: Ayah[] = data.verses.map((v: any) => {
        const glyphText =
          v.code_v1 ||
          (Array.isArray(v.words) ? v.words.map((w: any) => w.code_v1).filter(Boolean).join(' ') : undefined);

        return {
          ayahNumber: v.verse_number,
          text: v.text_uthmani,
          pageNumber: v.page_number,
          glyphCode: glyphText,
        };
      });

      const surahData: SurahData = {
        surahId,
        name: meta?.name || `Surat ${surahId}`,
        nameArabic: meta?.nameArabic || '',
        ayahs,
      };

      surahCache.set(surahId, surahData);
      return surahData;
    }
  } catch (err) {
    console.warn(`[QuranService] Gagal fetch surah ${surahId} dari Quran.com API, mencoba fallback lokal:`, err);
  }

  // Fallback lokal
  const paddedId = String(surahId).padStart(3, '0');
  try {
    const unicodePromise = fetch(`${import.meta.env.BASE_URL}quran/unicode/${paddedId}.json`).then((r) => (r.ok ? r.json() : null));
    const qcfPromise = fetch(`${import.meta.env.BASE_URL}quran/qcf/${paddedId}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);

    const [unicodeData, qcfData] = await Promise.all([unicodePromise, qcfPromise]);
    if (!unicodeData) return null;

    if (qcfData && Array.isArray(qcfData.ayahs)) {
      const qcfMap = new Map<number, { pageNumber?: number; glyphCode?: string }>();
      for (const qAyah of qcfData.ayahs) {
        qcfMap.set(qAyah.ayahNumber, {
          pageNumber: qAyah.pageNumber,
          glyphCode: qAyah.glyphCode,
        });
      }

      unicodeData.ayahs = unicodeData.ayahs.map((ayah: Ayah) => {
        const qcfInfo = qcfMap.get(ayah.ayahNumber);
        const cleanText =
          ayah.ayahNumber === 1 && surahId !== 1
            ? stripLeadingBasmalah(ayah.text)
            : ayah.text;
        if (qcfInfo) {
          return {
            ...ayah,
            text: cleanText,
            pageNumber: qcfInfo.pageNumber,
            glyphCode: qcfInfo.glyphCode,
          };
        }
        return {
          ...ayah,
          text: cleanText,
        };
      });
    }

    surahCache.set(surahId, unicodeData);
    return unicodeData;
  } catch (e) {
    console.error(`Error loading fallback for surah ${surahId}:`, e);
    return null;
  }
}

/**
 * Menghapus lafaz Bismillah di awal ayat jika bukan Surat Al-Fatihah.
 * Mendukung teks Uthmani resmi, Alif Wasla (ٱ), serta ragam harakat.
 */
export function stripLeadingBasmalah(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  // Regex mencakup: بِسْمِ + (ٱللَّهِ / اللَّهِ) + (ٱلرَّحْمَٰنِ / الرَّحْمَنِ) + (ٱلرَّحِيمِ / الرَّحِيمِ)
  const cleaned = trimmed.replace(
    /^بِسْمِ\s+[\u0671\u0627]للَّ?هِ\s+[\u0671\u0627]لرَّحْمَ?[ٰـ]?نِ\s+[\u0671\u0627]لرَّحِيمِ\s*/u,
    ''
  );
  if (cleaned !== trimmed && cleaned.length > 0) {
    return cleaned.trim();
  }
  // Fallback: jika diawali kata "بِسْمِ", potong 4 kata pertama jika itu bismillah
  const words = trimmed.split(/\s+/);
  if (
    words.length > 4 &&
    words[0].includes('بِسْمِ') &&
    (words[1].includes('للَّ') || words[1].includes('لله') || words[1].includes('ٱللَّ'))
  ) {
    return words.slice(4).join(' ').trim();
  }
  return trimmed;
}

/**
 * Cache lokal untuk teks ayat per surat (mempercepat loading card dan pencarian).
 */
const localSurahTextCache = new Map<number, Map<number, string>>();

/**
 * Mengambil teks satu ayat dari dataset lokal JSON secara instan.
 */
export async function getAyahText(surahId: number, ayahNumber: number): Promise<string> {
  if (localSurahTextCache.has(surahId)) {
    const raw = localSurahTextCache.get(surahId)?.get(ayahNumber) || '';
    return ayahNumber === 1 && surahId !== 1 ? stripLeadingBasmalah(raw) : raw;
  }

  try {
    const padded = String(surahId).padStart(3, '0');
    const res = await fetch(`${import.meta.env.BASE_URL}quran/unicode/${padded}.json`);
    if (res.ok) {
      const data = await res.json();
      const ayahMap = new Map<number, string>();
      if (Array.isArray(data.ayahs)) {
        for (const a of data.ayahs) {
          ayahMap.set(a.ayahNumber, a.text);
        }
      }
      localSurahTextCache.set(surahId, ayahMap);
      const raw = ayahMap.get(ayahNumber) || '';
      return ayahNumber === 1 && surahId !== 1 ? stripLeadingBasmalah(raw) : raw;
    }
  } catch (err) {
    console.warn(`[getAyahText] Gagal memuat surat ${surahId}:`, err);
  }
  return '';
}

/**
 * Memotong teks ayat menjadi 1 baris (beberapa kata pertama) untuk card paket.
 */
export function formatAyahSnippet(text: string, maxWords: number = 6): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * Mengambil potongan ayat pertama untuk seluruh paket secara paralel.
 * Menghasilkan map packageId -> snippet ayat pertama.
 * Jika paket dimulai dari ayat 1 (selain Surat Al-Fatihah), Bismillah di awal otomatis dibersihkan.
 */
export async function getPackageSnippets(
  packages: { id: string; surahId: number; startAyah: number }[]
): Promise<Record<string, string>> {
  if (!Array.isArray(packages) || packages.length === 0) return {};

  const uniqueSurahIds = Array.from(new Set(packages.map((p) => p.surahId)));

  // Load surat unik secara paralel
  await Promise.all(
    uniqueSurahIds.map(async (surahId) => {
      if (!localSurahTextCache.has(surahId)) {
        try {
          const padded = String(surahId).padStart(3, '0');
          const res = await fetch(`${import.meta.env.BASE_URL}quran/unicode/${padded}.json`);
          if (res.ok) {
            const data = await res.json();
            const ayahMap = new Map<number, string>();
            if (Array.isArray(data.ayahs)) {
              for (const a of data.ayahs) {
                ayahMap.set(a.ayahNumber, a.text);
              }
            }
            localSurahTextCache.set(surahId, ayahMap);
          }
        } catch {
          // ignore error
        }
      }
    })
  );

  const result: Record<string, string> = {};
  for (const pkg of packages) {
    const ayahMap = localSurahTextCache.get(pkg.surahId);
    let fullText = ayahMap?.get(pkg.startAyah) || '';
    // Jika surat dimulai dari ayat 1 dan bukan Al-Fatihah, jangan tampilkan Bismillah di depannya
    if (pkg.startAyah === 1 && pkg.surahId !== 1) {
      fullText = stripLeadingBasmalah(fullText);
    }
    result[pkg.id] = formatAyahSnippet(fullText, 6);
  }

  return result;
}
