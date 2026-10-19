/**
 * Tartil Shafa'i — Surah Name Service
 *
 * Mengelola penamaan surat standar Indonesia (Lajnah Kemenag RI)
 * serta fitur kustomisasi/penggantian nama surat oleh Admin secara realtime
 * dan persisten (disimpan ke LocalStorage dan disinkronkan ke Firestore).
 */

const LOCAL_STORAGE_KEY = 'tartil_custom_surah_names';
const FIRESTORE_SETTINGS_COLLECTION = 'app_settings';
const FIRESTORE_SURAH_DOC = 'surah_names';

/**
 * 114 Nama Surat Standar Indonesia (Lajnah Pentashihan Mushaf Al-Qur'an / Kemenag RI).
 */
export const DEFAULT_INDONESIAN_SURAHS: Record<number, string> = {
  1: 'Al-Fatihah',
  2: 'Al-Baqarah',
  3: "Ali 'Imran",
  4: "An-Nisa'",
  5: "Al-Ma'idah",
  6: "Al-An'am",
  7: "Al-A'raf",
  8: 'Al-Anfal',
  9: 'At-Taubah',
  10: 'Yunus',
  11: 'Hud',
  12: 'Yusuf',
  13: "Ar-Ra'd",
  14: 'Ibrahim',
  15: 'Al-Hijr',
  16: 'An-Nahl',
  17: "Al-Isra'",
  18: 'Al-Kahf',
  19: 'Maryam',
  20: 'Taha',
  21: "Al-Anbiya'",
  22: 'Al-Hajj',
  23: "Al-Mu'minun",
  24: 'An-Nur',
  25: 'Al-Furqan',
  26: "Asy-Syu'ara'",
  27: 'An-Naml',
  28: 'Al-Qasas',
  29: "Al-'Ankabut",
  30: 'Ar-Rum',
  31: 'Luqman',
  32: 'As-Sajdah',
  33: 'Al-Ahzab',
  34: "Saba'",
  35: 'Fatir',
  36: 'Yasin',
  37: 'As-Saffat',
  38: 'Sad',
  39: 'Az-Zumar',
  40: 'Ghafir',
  41: 'Fussilat',
  42: 'Asy-Syura',
  43: 'Az-Zukhruf',
  44: 'Ad-Dukhan',
  45: 'Al-Jasiyah',
  46: 'Al-Ahqaf',
  47: 'Muhammad',
  48: 'Al-Fath',
  49: 'Al-Hujurat',
  50: 'Qaf',
  51: 'Az-Zariyat',
  52: 'At-Tur',
  53: 'An-Najm',
  54: 'Al-Qamar',
  55: 'Ar-Rahman',
  56: "Al-Waqi'ah",
  57: 'Al-Hadid',
  58: 'Al-Mujadilah',
  59: 'Al-Hasyr',
  60: 'Al-Mumtahanah',
  61: 'As-Saff',
  62: "Al-Jumu'ah",
  63: 'Al-Munafiqun',
  64: 'At-Tagabun',
  65: 'At-Talaq',
  66: 'At-Tahrim',
  67: 'Al-Mulk',
  68: 'Al-Qalam',
  69: 'Al-Haqqah',
  70: "Al-Ma'arij",
  71: 'Nuh',
  72: 'Al-Jinn',
  73: 'Al-Muzzammil',
  74: 'Al-Muddassir',
  75: 'Al-Qiyamah',
  76: 'Al-Insan',
  77: 'Al-Mursalat',
  78: "An-Naba'",
  79: "An-Nazi'at",
  80: "'Abasa",
  81: 'At-Takwir',
  82: 'Al-Infitar',
  83: 'Al-Muthaffifin',
  84: 'Al-Insyiqaq',
  85: 'Al-Buruj',
  86: 'At-Tariq',
  87: "Al-A'la",
  88: 'Al-Ghasyiyah',
  89: 'Al-Fajr',
  90: 'Al-Balad',
  91: 'Asy-Syams',
  92: 'Al-Lail',
  93: 'Ad-Duha',
  94: 'Asy-Syarh',
  95: 'At-Tin',
  96: "Al-'Alaq",
  97: 'Al-Qadr',
  98: 'Al-Bayyinah',
  99: 'Az-Zalzalah',
  100: "Al-'Adiyat",
  101: "Al-Qari'ah",
  102: 'At-Takasur',
  103: "Al-'Asr",
  104: 'Al-Humazah',
  105: 'Al-Fil',
  106: 'Quraisy',
  107: "Al-Ma'un",
  108: 'Al-Kausar',
  109: 'Al-Kafirun',
  110: 'An-Nasr',
  111: 'Al-Lahab',
  112: 'Al-Ikhlas',
  113: 'Al-Falaq',
  114: 'An-Nas',
};

/**
 * Penyelarasan nama Arab standar Indonesia (misal: Surat 111 adalah اللهب / Al-Lahab, bukan المسد / Al-Masad).
 */
export const DEFAULT_ARABIC_OVERRIDES: Record<number, string> = {
  111: 'اللهب',
};

// In-memory cache
let customNamesCache: Record<number, string> | null = null;
const listeners = new Set<(names: Record<number, string>) => void>();
let firestoreUnsub: (() => void) | null = null;
let isRealtimeInitialized = false;

function getStoredCustomNames(): Record<number, string> {
  if (customNamesCache !== null) {
    return customNamesCache;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const map: Record<number, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          const num = Number(k);
          if (!isNaN(num) && typeof v === 'string' && v.trim()) {
            map[num] = v.trim();
          }
        }
        customNamesCache = map;
        return map;
      }
    }
  } catch (err) {
    console.warn('[SurahNameService] Gagal membaca custom surah names dari localStorage:', err);
  }
  customNamesCache = {};
  return {};
}

function persistLocally(names: Record<number, string>) {
  customNamesCache = { ...names };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(names));
    }
  } catch (err) {
    console.warn('[SurahNameService] Gagal menyimpan custom surah names ke localStorage:', err);
  }
}

function notifySubscribers() {
  const current = getStoredCustomNames();
  for (const fn of listeners) {
    try {
      fn(current);
    } catch (e) {
      console.error(e);
    }
  }
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('tartil_surah_names_change', { detail: current }));
    } catch {}
  }
}

export class SurahNameService {
  /**
   * Inisialisasi realtime listener dari Firestore & storage event
   */
  static async initRealtime(): Promise<void> {
    if (isRealtimeInitialized) return;
    isRealtimeInitialized = true;

    // Load initial
    getStoredCustomNames();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === LOCAL_STORAGE_KEY) {
          customNamesCache = null;
          getStoredCustomNames();
          notifySubscribers();
        }
      });
    }

    try {
      const [{ db }, { doc, onSnapshot }] = await Promise.all([
        import('../config/firebase'),
        import('firebase/firestore'),
      ]);
      const docRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, FIRESTORE_SURAH_DOC);
      firestoreUnsub = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const names = data.customNames || {};
            const map: Record<number, string> = {};
            for (const [k, v] of Object.entries(names)) {
              const num = Number(k);
              if (!isNaN(num) && typeof v === 'string' && (v as string).trim()) {
                map[num] = (v as string).trim();
              }
            }
            persistLocally(map);
            notifySubscribers();
          }
        },
        (err) => {
          console.warn('[SurahNameService] Firestore onSnapshot warning (fallback to local):', err);
        }
      );
    } catch (err) {
      console.warn('[SurahNameService] Gagal setup Firestore listener:', err);
    }
  }

  /**
   * Mendapatkan nama surat terformat (Custom -> Standar Kemenag -> Fallback).
   */
  static getSurahName(surahId: number, fallback?: string): string {
    const custom = getStoredCustomNames();
    if (custom[surahId]) {
      return custom[surahId];
    }
    if (DEFAULT_INDONESIAN_SURAHS[surahId]) {
      return DEFAULT_INDONESIAN_SURAHS[surahId];
    }
    return fallback || `Surat ${surahId}`;
  }

  /**
   * Mendapatkan nama Arab surat yang diselaraskan standar Indonesia (misal: Surat 111 adalah اللهب).
   */
  static getSurahArabic(surahId: number, fallback?: string): string {
    if (DEFAULT_ARABIC_OVERRIDES[surahId]) {
      return DEFAULT_ARABIC_OVERRIDES[surahId];
    }
    return fallback || '';
  }

  /**
   * Mendapatkan seluruh custom overrides yang aktif saja.
   */
  static getCustomOverrides(): Record<number, string> {
    return { ...getStoredCustomNames() };
  }

  /**
   * Mendapatkan dictionary lengkap 1-114 nama surat (sudah digabung dengan custom overrides).
   */
  static getAllSurahNames(): Record<number, string> {
    const custom = getStoredCustomNames();
    const result: Record<number, string> = { ...DEFAULT_INDONESIAN_SURAHS };
    for (const [k, v] of Object.entries(custom)) {
      const num = Number(k);
      if (!isNaN(num) && v) {
        result[num] = v;
      }
    }
    return result;
  }

  /**
   * Menyimpan / memperbarui nama satu surat.
   */
  static async saveSurahName(surahId: number, newName: string): Promise<void> {
    const current = getStoredCustomNames();
    const clean = newName.trim();
    if (clean && clean !== DEFAULT_INDONESIAN_SURAHS[surahId]) {
      current[surahId] = clean;
    } else {
      delete current[surahId];
    }
    await this.saveAllCustomNames(current);
  }

  /**
   * Menyimpan map custom overrides sekaligus ke local dan Firestore.
   */
  static async saveAllCustomNames(names: Record<number, string>): Promise<void> {
    persistLocally(names);
    notifySubscribers();

    try {
      const [{ db }, { doc, setDoc, serverTimestamp }] = await Promise.all([
        import('../config/firebase'),
        import('firebase/firestore'),
      ]);
      const docRef = doc(db, FIRESTORE_SETTINGS_COLLECTION, FIRESTORE_SURAH_DOC);
      await setDoc(
        docRef,
        {
          customNames: names,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[SurahNameService] Gagal simpan ke Firestore (disimpan di lokal):', err);
    }
  }

  /**
   * Reset satu surat ke standar Kemenag RI.
   */
  static async resetSurahName(surahId: number): Promise<void> {
    const current = getStoredCustomNames();
    delete current[surahId];
    await this.saveAllCustomNames(current);
  }

  /**
   * Reset seluruh nama surat ke standar Kemenag RI.
   */
  static async resetAllToDefault(): Promise<void> {
    await this.saveAllCustomNames({});
  }

  /**
   * Menghentikan realtime listener.
   */
  static stopRealtime() {
    if (firestoreUnsub) {
      firestoreUnsub();
      firestoreUnsub = null;
    }
    isRealtimeInitialized = false;
  }
}

// Inisialisasi otomatis jika di lingkungan browser: langsung untuk admin, atau tunda untuk pembaca umum
if (typeof window !== 'undefined') {
  const isAdminPath = window.location.pathname.startsWith('/admin');
  if (isAdminPath) {
    SurahNameService.initRealtime();
  } else {
    const idleFn = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 10000));
    setTimeout(() => {
      idleFn(() => {
        SurahNameService.initRealtime();
      });
    }, 6000);
  }
}
