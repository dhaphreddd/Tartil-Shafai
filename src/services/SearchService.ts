/**
 * Tartil Shafa'i — Search Service
 *
 * Pencarian komprehensif ke seluruh isi paket:
 * 1. Teks Arab (mengabaikan harakat, normalisasi alif, ta marbutah, dagger alif, waqf)
 * 2. Transliterasi Latin (dengan Phonetic Normalizer untuk orang awam yang mengeja bunyi ayat)
 * 3. Terjemahan Bahasa Indonesia (Standar Kemenag RI)
 * 4. Nama Surat (Indonesia & Arab), nomor surat, nomor ayat, dan judul materi/paket.
 */

import type { Layer3Item, SurahMetadata, Ayah } from '@/core/types';

export interface SearchResultItem {
  item: Layer3Item;
  surahMetadata?: SurahMetadata;
  matchType: 'title' | 'surah' | 'arab' | 'transliterasi' | 'terjemah';
  matchedAyahNumber?: number;
  snippetText?: string;
  score: number;
}

/**
 * Normalisasi teks Arab:
 * - Mengabaikan seluruh harakat / tashkeel (Fathah, Dammah, Kasrah, Tanwin, Sukun, Shaddah, dsb.)
 * - Mengubah dagger alif (\u0670) menjadi alif standar (\u0627)
 * - Menghapus tatweel / kashida (\u0640)
 * - Menormalkan ragam Alif (أ, إ, آ, ٱ -> ا)
 * - Menormalkan Alif Maqsura (ى -> ي)
 * - Menormalkan Ta Marbutah (ة -> ه)
 * - Menghapus tanda waqf mushaf (\u06D6 - \u06ED)
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  let s = text;
  // Dagger alif to standard alif
  s = s.replace(/\u0670/g, '\u0627');
  // Remove Tashkeel / Harakat & Quranic waqf marks
  s = s.replace(/[\u064B-\u065F\u06D6-\u06ED]/g, '');
  // Remove Tatweel / Kashida
  s = s.replace(/\u0640/g, '');
  // Normalize Alif forms (أ, إ, آ, ٱ -> ا)
  s = s.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627');
  // Normalize Alif Maqsura (ى -> ي)
  s = s.replace(/\u0649/g, '\u064A');
  // Normalize Ta Marbutah (ة -> ه)
  s = s.replace(/\u0629/g, '\u0647');
  // Normalize whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Phonetic Normalizer untuk Transliterasi Latin:
 * Solusi untuk orang awam yang tidak paham ejaan transliterasi baku (ā, ī, ū, ḥ, ‘, dsb.)
 * dan hanya mengingat bunyi ayat dalam ejaan percakapan Indonesia.
 *
 * Contoh ejaan awam yang dapat dicocokkan otomatis:
 * - "bismillah" / "bismilah" / "bismillaahir" / "bismillahirrohmanirrohim" -> Bismillāhir-raḥmānir-raḥīm
 * - "kulhu" / "kul huwallahu" / "qulhuwallahu" / "qul huwallahu" -> Qul huwallāhu aḥad
 * - "allahu somad" / "allahu samad" / "somad" -> Allāhuṣ-ṣamad
 * - "iyaka nabudu" / "iyyaka na'budu" -> Iyyāka na‘budu
 * - "alhamdulillah" / "alhamdu lillah" -> Al-ḥamdu lillāh
 * - "rohman" / "rahman" -> ar-raḥmān
 */
export function normalizePhonetic(text: string): string {
  if (!text) return '';
  let s = text.toLowerCase();

  // 1. Hapus tanda waqf dalam tanda kurung seperti (i), (u), (a), (in), (un), (an)
  s = s.replace(/\([a-zāīūḥṣḍṭẓ]+\)/gi, '');

  // 2. Hapus tanda diakritik makron dan titik bawah
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s
    .replace(/[āáàâä]/g, 'a')
    .replace(/[īíìîï]/g, 'i')
    .replace(/[ūúùûü]/g, 'u')
    .replace(/[ēéèêë]/g, 'e')
    .replace(/[ōóòôö]/g, 'o')
    .replace(/[ḥ]/g, 'h')
    .replace(/[ṣšś]/g, 's')
    .replace(/[ḍḏ]/g, 'd')
    .replace(/[ṭṯ]/g, 't')
    .replace(/[ẓžźż]/g, 'z')
    .replace(/[‘'’ʻ`]/g, '');

  // 3. Pemetaan variasi fonetik umum orang Indonesia
  s = s
    .replace(/kh/g, 'h')
    .replace(/gh/g, 'g')
    .replace(/sy/g, 's')
    .replace(/sh/g, 's')
    .replace(/th/g, 't')
    .replace(/ts/g, 's')
    .replace(/dz/g, 'z')
    .replace(/dh/g, 'd')
    .replace(/q/g, 'k')
    .replace(/o/g, 'a'); // Pergeseran vokal fathah tebal: rohman -> rahman, somad -> samad

  // 4. Hapus tanda baca, strip, tanda hubung, dan spasi untuk pencocokan fonetik beruntun
  s = s.replace(/[^a-z0-9]/g, '');

  // 5. Rampingkan huruf ganda berurutan (bismillaah -> bismillah, robbi -> robi)
  s = s.replace(/(.)\1+/g, '$1');

  return s;
}

// In-memory cache data surat lengkap untuk pencarian instan
interface CachedSurahData {
  unicodeMap: Map<number, string>;
  kemenagMap: Map<number, { latin: string; translation: string }>;
}

const surahSearchCache = new Map<number, CachedSurahData>();
const loadingSurahs = new Set<number>();
const cacheListeners = new Set<() => void>();

function notifyCacheUpdated(): void {
  for (const listener of cacheListeners) {
    try {
      listener();
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * Berlangganan perubahan cache data surat (misal saat preloading selesai di latar belakang)
 */
export function subscribeSearchCache(callback: () => void): () => void {
  cacheListeners.add(callback);
  return () => {
    cacheListeners.delete(callback);
  };
}

/**
 * Memastikan dataset surat (Unicode & Kemenag) termuat dalam cache memori.
 */
export async function ensureSurahLoaded(surahId: number): Promise<CachedSurahData | null> {
  if (surahSearchCache.has(surahId)) {
    return surahSearchCache.get(surahId)!;
  }

  if (loadingSurahs.has(surahId)) {
    // Tunggu hingga selesai termuat
    let attempts = 0;
    while (attempts < 20 && !surahSearchCache.has(surahId)) {
      await new Promise((r) => setTimeout(r, 50));
      attempts++;
    }
    return surahSearchCache.get(surahId) || null;
  }

  loadingSurahs.add(surahId);

  try {
    const padded = String(surahId).padStart(3, '0');
    const uPromise = fetch(`${import.meta.env.BASE_URL}quran/unicode/${padded}.json`).then((r) =>
      r.ok ? r.json() : null
    );
    const kPromise = fetch(`${import.meta.env.BASE_URL}quran/id/${padded}.json`).then((r) =>
      r.ok ? r.json() : null
    );

    const [uData, kData] = await Promise.all([uPromise, kPromise]);

    const unicodeMap = new Map<number, string>();
    if (uData && Array.isArray(uData.ayahs)) {
      for (const a of uData.ayahs) {
        unicodeMap.set(a.ayahNumber, a.text);
      }
    }

    const kemenagMap = new Map<number, { latin: string; translation: string }>();
    if (kData && Array.isArray(kData.ayahs)) {
      for (const a of kData.ayahs) {
        kemenagMap.set(a.ayahNumber, {
          latin: (a.latin || '').trim(),
          translation: (a.translation || '').trim(),
        });
      }
    }

    const cached: CachedSurahData = { unicodeMap, kemenagMap };
    surahSearchCache.set(surahId, cached);
    notifyCacheUpdated();
    return cached;
  } catch (err) {
    console.warn(`[SearchService] Gagal memuat surat ${surahId}:`, err);
    return null;
  } finally {
    loadingSurahs.delete(surahId);
  }
}

/**
 * Preload seluruh surat unik yang digunakan oleh paket-paket yang ada di background.
 */
export async function preloadPackageSurahs(items: Layer3Item[]): Promise<void> {
  if (!Array.isArray(items) || items.length === 0) return;

  const surahIds = new Set<number>();
  for (const item of items) {
    if (item.surahId) surahIds.add(item.surahId);
    if (Array.isArray(item.sections)) {
      for (const s of item.sections) {
        if (s.surahId) surahIds.add(s.surahId);
      }
    }
  }

  // Muat dalam batch 8 surat secara paralel
  const idList = Array.from(surahIds).filter((id) => !surahSearchCache.has(id));
  const batchSize = 8;
  for (let i = 0; i < idList.length; i += batchSize) {
    const batch = idList.slice(i, i + batchSize);
    await Promise.all(batch.map((id) => ensureSurahLoaded(id)));
  }
  notifyCacheUpdated();
}

/**
 * Mengambil seluruh ayat yang dicakup oleh sebuah paket (Layer3Item).
 */
export function getPackageAyahList(item: Layer3Item): Ayah[] {
  // Jika paket memiliki customAyahs, gunakan data kustom tersebut
  if (Array.isArray(item.customAyahs) && item.customAyahs.length > 0) {
    const sCached = surahSearchCache.get(item.surahId);
    return item.customAyahs.map((a) => {
      const kInfo = sCached?.kemenagMap.get(a.ayahNumber);
      return {
        ...a,
        surahId: item.surahId,
        latin: a.latin || kInfo?.latin || '',
        translation: a.translation || kInfo?.translation || '',
      };
    });
  }

  // Jika paket memiliki multi-section
  const sections =
    Array.isArray(item.sections) && item.sections.length > 0
      ? item.sections
      : [
          {
            surahId: item.surahId,
            startAyah: item.startAyah,
            endAyah: item.endAyah,
            customAyahs: item.customAyahs,
          },
        ];

  const ayahs: Ayah[] = [];
  for (const sec of sections) {
    const sCached = surahSearchCache.get(sec.surahId);
    const start = Math.min(sec.startAyah, sec.endAyah);
    const end = Math.max(sec.startAyah, sec.endAyah);

    for (let num = start; num <= end; num++) {
      const textArab = sCached?.unicodeMap.get(num) || '';
      const kInfo = sCached?.kemenagMap.get(num);
      ayahs.push({
        surahId: sec.surahId,
        ayahNumber: num,
        text: textArab,
        latin: kInfo?.latin || '',
        translation: kInfo?.translation || '',
      });
    }
  }

  return ayahs;
}

/**
 * Memotong teks menjadi snippet pendek dan rapi
 */
export function formatSnippet(text: string, maxWords: number = 10): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * Memeriksa kecocokan sebuah paket materi terhadap query pencarian.
 */
export function matchItem(
  item: Layer3Item,
  query: string,
  surahs: SurahMetadata[]
): SearchResultItem | null {
  const qClean = (query || '').trim();
  const meta = surahs.find((s) => s.id === item.surahId);

  if (!qClean) {
    return {
      item,
      surahMetadata: meta,
      matchType: 'title',
      score: 0,
    };
  }

  const isArabicQuery = /[\u0600-\u06FF]/.test(qClean);
  const normQueryArabic = normalizeArabic(qClean);
  const normQueryArabicNoSpace = normQueryArabic.replace(/\s+/g, '');

  const normQueryPhonetic = normalizePhonetic(qClean);
  const qLower = qClean.toLowerCase();

  const surahNameLower = meta?.name.toLowerCase() || '';
  const surahNameArabicNorm = normalizeArabic(meta?.nameArabic || '');
  const itemTitleLower = (item.title || '').toLowerCase();
  const ayahRangeStr = `${item.startAyah}-${item.endAyah}`;

  let matchType: SearchResultItem['matchType'] | null = null;
  let matchedAyahNumber: number | undefined;
  let snippetText: string | undefined;
  let score = 0;

  // 1. Cek judul materi / nomor paket
  if (itemTitleLower.includes(qLower) || `paket ${item.order}`.includes(qLower)) {
    matchType = 'title';
    score += 100;
  }

  // 2. Cek nama surat (Latin & Arab) atau nomor surat
  if (!matchType) {
    if (surahNameLower.includes(qLower) || qLower.includes(surahNameLower)) {
      matchType = 'surah';
      score += 90;
    } else if (isArabicQuery && surahNameArabicNorm.includes(normQueryArabic)) {
      matchType = 'surah';
      score += 90;
    } else if (
      (qLower.startsWith('surat ') || qLower.startsWith('surah ') || qLower.startsWith('qs ')) &&
      qLower.includes(String(item.surahId))
    ) {
      matchType = 'surah';
      score += 85;
    }
  }

  // 3. Cek rentang ayat (misal: "ayat 39" atau "39-42")
  if (!matchType) {
    if (
      ayahRangeStr.includes(qLower) ||
      (qLower.includes('ayat') && qLower.includes(String(item.startAyah)))
    ) {
      matchType = 'title';
      score += 80;
    }
  }

  // 4. Cek Multi-section metadata surat
  if (!matchType && Array.isArray(item.sections)) {
    for (const sec of item.sections) {
      const sMeta = surahs.find((s) => s.id === sec.surahId);
      if (sMeta) {
        if (
          sMeta.name.toLowerCase().includes(qLower) ||
          (isArabicQuery && normalizeArabic(sMeta.nameArabic).includes(normQueryArabic)) ||
          `${sec.startAyah}-${sec.endAyah}`.includes(qLower)
        ) {
          matchType = 'surah';
          score += 75;
          break;
        }
      }
    }
  }

  // 5. Pencarian mendalam ke seluruh isi ayat di dalam paket (Arab, Transliterasi, Terjemahan)
  const ayahs = getPackageAyahList(item);

  for (const a of ayahs) {
    // A. Pencarian Teks Arab (Mengabaikan Harakat)
    if (isArabicQuery && a.text) {
      const normAyahArab = normalizeArabic(a.text);
      const normAyahArabNoSpace = normAyahArab.replace(/\s+/g, '');

      if (
        normAyahArab.includes(normQueryArabic) ||
        (normQueryArabicNoSpace.length >= 2 && normAyahArabNoSpace.includes(normQueryArabicNoSpace))
      ) {
        matchType = 'arab';
        matchedAyahNumber = a.ayahNumber;
        snippetText = a.text;
        score += 60;
        break;
      }
    }

    // B. Pencarian Terjemahan Bahasa Indonesia
    if (!isArabicQuery && a.translation) {
      const transLower = a.translation.toLowerCase();
      const words = qLower.split(/\s+/).filter((w) => w.length > 1);
      const matchAllWords = words.length > 1 && words.every((w) => transLower.includes(w));

      if (transLower.includes(qLower) || matchAllWords) {
        matchType = 'terjemah';
        matchedAyahNumber = a.ayahNumber;
        snippetText = a.translation;
        score += 50;
        break;
      }
    }

    // C. Pencarian Transliterasi Latin (Baku & Ejaan Fonetik Percakapan)
    if (!isArabicQuery && a.latin) {
      const latinLower = a.latin.toLowerCase();
      const normAyahPhonetic = normalizePhonetic(a.latin);

      // Pencocokan substring langsung pada transliterasi
      if (latinLower.includes(qLower)) {
        matchType = 'transliterasi';
        matchedAyahNumber = a.ayahNumber;
        snippetText = a.latin;
        score += 45;
        break;
      }

      // Pencocokan fonetik untuk orang awam (minimal 3 karakter fonetik)
      if (normQueryPhonetic.length >= 3 && normAyahPhonetic.includes(normQueryPhonetic)) {
        matchType = 'transliterasi';
        matchedAyahNumber = a.ayahNumber;
        snippetText = a.latin;
        score += 40;
        break;
      }
    }
  }

  if (matchType) {
    return {
      item,
      surahMetadata: meta,
      matchType,
      matchedAyahNumber,
      snippetText: snippetText ? formatSnippet(snippetText, 12) : undefined,
      score,
    };
  }

  return null;
}

/**
 * Menjalankan pencarian cerdas ke seluruh paket materi
 */
export function searchPackages(
  query: string,
  items: Layer3Item[],
  surahs: SurahMetadata[],
  options?: { layer1Id?: string }
): SearchResultItem[] {
  const qClean = (query || '').trim();
  const results: SearchResultItem[] = [];

  for (const item of items) {
    // Filter Layer 1 jika dipilih
    if (options?.layer1Id && options.layer1Id !== 'all' && item.layer1Id !== options.layer1Id) {
      continue;
    }

    const matched = matchItem(item, qClean, surahs);
    if (matched) {
      results.push(matched);
    }
  }

  // Urutkan hasil berdasarkan skor relevansi tertinggi
  if (qClean) {
    results.sort((a, b) => b.score - a.score || a.item.order - b.item.order);
  }

  return results;
}
