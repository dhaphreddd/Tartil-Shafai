/**
 * Tartil Shafa'i — Quran Service
 *
 * Mengambil data ayat, metadata, teks Uthmani, dan kode glyph Mushaf Madinah
 * langsung secara live dari API resmi Quran.com (Quran Foundation V4 API).
 */

import type { Ayah, SurahData, SurahMetadata } from '@/core/types';
import { SurahNameService } from './SurahNameService';
import defaultSurahsData from '../data/surahs.json';

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
 * Mendapatkan metadata seluruh 114 surat secara sinkron dari basis data lokal,
 * digabungkan dengan transliterasi standar Indonesia dan penyesuaian kustom admin.
 */
export function getSurahsMetadataSync(): SurahMetadata[] {
  if (surahsMetadataCache && surahsMetadataCache.length > 0) {
    return surahsMetadataCache;
  }

  const metadata: SurahMetadata[] = (defaultSurahsData as any[]).map((s) => ({
    id: s.id,
    name: SurahNameService.getSurahName(s.id, s.name),
    nameArabic: SurahNameService.getSurahArabic(s.id, s.nameArabic),
    ayahCount: s.ayahCount,
    revelationType: s.revelationType,
  }));

  surahsMetadataCache = metadata;
  return metadata;
}

/**
 * Async wrapper untuk kompatibilitas ke belakang.
 */
export async function getSurahsMetadata(): Promise<SurahMetadata[]> {
  return getSurahsMetadataSync();
}

const kemenagSurahCache = new Map<number, Map<number, { latin: string; translation: string }>>();

/**
 * Mengambil transliterasi latin dan terjemahan resmi standar Kemenag RI
 * dari dataset statis lokal publik (atau fallback online jika offline/hilang).
 */
export async function getKemenagSurahData(
  surahId: number
): Promise<Map<number, { latin: string; translation: string }>> {
  if (kemenagSurahCache.has(surahId)) {
    return kemenagSurahCache.get(surahId)!;
  }

  const map = new Map<number, { latin: string; translation: string }>();
  try {
    const padded = String(surahId).padStart(3, '0');
    const res = await fetch(`${import.meta.env.BASE_URL}quran/id/${padded}.json`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.ayahs)) {
        for (const a of data.ayahs) {
          map.set(a.ayahNumber, {
            latin: a.latin || '',
            translation: a.translation || '',
          });
        }
      }
    }
  } catch (err) {
    console.warn(`[getKemenagSurahData] Gagal memuat data lokal kemenag surah ${surahId}:`, err);
  }

  // Fallback ke equran.id jika dataset lokal belum tersedia
  if (map.size === 0) {
    try {
      const res = await fetch(`https://equran.id/api/v2/surat/${surahId}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.ayat) {
          for (const a of json.data.ayat) {
            map.set(a.nomorAyat, {
              latin: (a.teksLatin || '').trim(),
              translation: (a.teksIndonesia || '').trim(),
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }

  kemenagSurahCache.set(surahId, map);
  return map;
}

/**
 * Mengambil rentang ayat tertentu langsung dari Quran.com API
 * serta menggabungkan transliterasi latin dan terjemahan standar Kemenag RI.
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

  // Fetch data Kemenag (transliterasi & terjemah) secara paralel
  const kemenagPromise = getKemenagSurahData(surahId);

  const expectedCount = endAyah - startAyah + 1;
  const perPage = Math.min(300, Math.max(expectedCount, 50));

  try {
    let allVerses: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      // Panggil langsung endpoint verses Quran.com dengan filter from & to dan per_page yang memadai
      const url = `${QURAN_API_BASE}/verses/by_chapter/${surahId}?from=${startAyah}&to=${endAyah}&page=${page}&per_page=${perPage}&words=true&word_fields=code_v1,code_v2,text_uthmani,v1_page,v2_page&fields=text_uthmani,verse_number,page_number,code_v1,code_v2,v1_page,v2_page`;
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

    const kemenagMap = await kemenagPromise;

    if (allVerses.length > 0) {
      const ayahs: Ayah[] = allVerses.map((v: any) => {
        const glyphV1 =
          v.code_v1 ||
          (Array.isArray(v.words) ? v.words.map((w: any) => w.code_v1).filter(Boolean).join(' ') : undefined);
        const glyphV2 =
          v.code_v2 ||
          (Array.isArray(v.words) ? v.words.map((w: any) => w.code_v2).filter(Boolean).join(' ') : undefined);

        const rawClean =
          v.verse_number === 1 && surahId !== 1
            ? stripLeadingBasmalah(v.text_uthmani)
            : v.text_uthmani;
        const cleanText = typeof rawClean === 'string' ? rawClean.trim() : rawClean;

        const pageV1 =
          v.v1_page ||
          (Array.isArray(v.words) && v.words[0]?.v1_page) ||
          v.page_number;
        const pageV2 =
          v.v2_page ||
          (Array.isArray(v.words) && v.words[0]?.v2_page) ||
          v.page_number;

        const kemenagInfo = kemenagMap.get(v.verse_number);

        return {
          ayahNumber: v.verse_number,
          text: cleanText,
          // Default to V2 (matching modern Quran.com)
          pageNumber: pageV2,
          glyphCode: glyphV2 || glyphV1,
          pageNumberV1: pageV1,
          pageNumberV2: pageV2,
          glyphCodeV1: glyphV1,
          glyphCodeV2: glyphV2,
          latin: kemenagInfo?.latin || '',
          translation: kemenagInfo?.translation || '',
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
    const [surahData, kemenagMap] = await Promise.all([
      getSurahData(surahId),
      kemenagPromise,
    ]);

    if (surahData) {
      const filtered = surahData.ayahs
        .filter((a) => a.ayahNumber >= startAyah && a.ayahNumber <= endAyah)
        .map((a) => {
          const kemenagInfo = kemenagMap.get(a.ayahNumber);
          return {
            ...a,
            text: a.ayahNumber === 1 && surahId !== 1 ? stripLeadingBasmalah(a.text) : a.text,
            latin: a.latin || kemenagInfo?.latin || '',
            translation: a.translation || kemenagInfo?.translation || '',
          };
        });
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
    const url = `${QURAN_API_BASE}/verses/by_chapter/${surahId}?per_page=300&words=true&word_fields=code_v1,code_v2,text_uthmani,v1_page,v2_page&fields=text_uthmani,verse_number,page_number,code_v1,code_v2,v1_page,v2_page`;
    const [res, kemenagMap] = await Promise.all([
      fetch(url),
      getKemenagSurahData(surahId),
    ]);
    if (!res.ok) throw new Error(`HTTP ${res.status} from Quran.com API`);
    const data = await res.json();

    if (Array.isArray(data.verses)) {
      const meta = (await getSurahsMetadata()).find((s) => s.id === surahId);
      const ayahs: Ayah[] = data.verses.map((v: any) => {
        const glyphV1 =
          v.code_v1 ||
          (Array.isArray(v.words) ? v.words.map((w: any) => w.code_v1).filter(Boolean).join(' ') : undefined);
        const glyphV2 =
          v.code_v2 ||
          (Array.isArray(v.words) ? v.words.map((w: any) => w.code_v2).filter(Boolean).join(' ') : undefined);

        const pageV1 =
          v.v1_page ||
          (Array.isArray(v.words) && v.words[0]?.v1_page) ||
          v.page_number;
        const pageV2 =
          v.v2_page ||
          (Array.isArray(v.words) && v.words[0]?.v2_page) ||
          v.page_number;

        const kemenagInfo = kemenagMap.get(v.verse_number);

        return {
          ayahNumber: v.verse_number,
          text: v.text_uthmani,
          pageNumber: pageV2,
          glyphCode: glyphV2 || glyphV1,
          pageNumberV1: pageV1,
          pageNumberV2: pageV2,
          glyphCodeV1: glyphV1,
          glyphCodeV2: glyphV2,
          latin: kemenagInfo?.latin || '',
          translation: kemenagInfo?.translation || '',
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
    const kemenagPromise = getKemenagSurahData(surahId);

    const [unicodeData, qcfData, kemenagMap] = await Promise.all([unicodePromise, qcfPromise, kemenagPromise]);
    if (!unicodeData) return null;

    const qcfMap = new Map<number, { pageNumber?: number; glyphCode?: string }>();
    if (qcfData && Array.isArray(qcfData.ayahs)) {
      for (const qAyah of qcfData.ayahs) {
        qcfMap.set(qAyah.ayahNumber, {
          pageNumber: qAyah.pageNumber,
          glyphCode: qAyah.glyphCode,
        });
      }
    }

    unicodeData.ayahs = unicodeData.ayahs.map((ayah: Ayah) => {
      const qcfInfo = qcfMap.get(ayah.ayahNumber);
      const kemenagInfo = kemenagMap.get(ayah.ayahNumber);
      const cleanText =
        ayah.ayahNumber === 1 && surahId !== 1
          ? stripLeadingBasmalah(ayah.text)
          : ayah.text;

      return {
        ...ayah,
        text: cleanText,
        pageNumber: qcfInfo?.pageNumber || ayah.pageNumber,
        glyphCode: qcfInfo?.glyphCode || ayah.glyphCode,
        latin: ayah.latin || kemenagInfo?.latin || '',
        translation: ayah.translation || kemenagInfo?.translation || '',
      };
    });

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
