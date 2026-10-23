/* ============================================
   Tartil Shafa'i — Core Type Definitions
   ============================================ */

// ---------- Quran Dataset Types ----------

export interface SurahMetadata {
  id: number;
  name: string;
  nameArabic: string;
  ayahCount: number;
}

export interface Ayah {
  ayahNumber: number;
  text: string;
  pageNumber?: number;
  glyphCode?: string;
  pageNumberV1?: number;
  pageNumberV2?: number;
  glyphCodeV1?: string;
  glyphCodeV2?: string;
  surahId?: number;
  latin?: string;
  translation?: string;
}

export interface SurahData {
  surahId: number;
  name: string;
  nameArabic: string;
  ayahs: Ayah[];
}

// ---------- 3-Layer Hierarchical Card System ----------

/**
 * Section / Segmen Surat dalam Layer 3 (Mendukung multi-surah dalam 1 paket)
 */
export interface Layer3Section {
  id?: string;
  surahId: number;              // Quran Surah 1-114
  startAyah: number;            // Starting ayah number
  endAyah: number;              // Ending ayah number
  customAyahs?: Ayah[];         // Optional customized ayah texts
}

/**
 * Layer 3: Leaf Content Item / Card (Materi / Maqra' / Paket Ayat)
 * Sits inside a Layer 2 Card.
 */
export interface Layer3Item {
  id: string;
  layer1Id?: string;
  layer2Id?: string;
  title: string;                // Customizable title e.g. "Paket 01", "Maqra' 1", or custom name
  description?: string;          // Optional description / catatan
  surahId: number;              // Quran Surah 1-114 (surah utama / surah pertama)
  startAyah: number;            // Starting ayah number
  endAyah: number;              // Ending ayah number
  customAyahs?: Ayah[];         // Optional customized ayah texts
  sections?: Layer3Section[];   // Daftar surat dalam satu paket (multi-surah)
  order: number;                // Sorting order
  isPublished: boolean;         // Publish status
  isPinned?: boolean;           // Show in featured/pinned section
  createdAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Layer 2: Middle-level Card (Sub-koleksi / Bab / Bagian / Modul)
 * Sits inside a Layer 1 Card. Can contain multiple Layer 3 items.
 */
export interface Layer2Card {
  id: string;
  layer1Id?: string;
  title: string;                // Customizable title e.g. "Bab 1: Makhorijul Huruf", "Juz 'Amma", etc.
  description?: string;          // Optional description
  order: number;                // Sorting order
  isPublished: boolean;         // Publish status
  items: Layer3Item[];          // Layer 3 content cards inside this Layer 2 card
  createdAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Layer 1: Top-level Root Card (Jilid / Tingkat / Kategori / Album)
 * Displayed on Home. Can contain multiple Layer 2 cards.
 */
export interface Layer1Card {
  id: string;
  title: string;                // Customizable title e.g. "Jilid 1", "Tingkat Dasar", etc.
  description?: string;          // Optional description
  badge?: string;               // Optional badge label
  order: number;                // Sorting order
  isPublished: boolean;         // Publish status
  cards: Layer2Card[];          // Layer 2 cards inside this Layer 1 card
  createdAt?: unknown;
  updatedAt?: unknown;
}

// ---------- Legacy Volume & Package Types (Backwards Compatible) ----------

export interface TartilVolume {
  id: string;
  number: number;
  name: string;
  description?: string;
  isPublished: boolean;
  order: number;
  cardsCount?: number;
  itemsCount?: number;
}

export interface TartilPackage {
  id: string;
  volumeId: string;
  sectionId?: string;
  title?: string;
  packageNumber: number;
  surahId: number;
  startAyah: number;
  endAyah: number;
  isPublished: boolean;
  isPinned?: boolean;
  order: number;
  customAyahs?: Ayah[];
  sections?: Layer3Section[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

// ---------- Theme Types ----------

export type ThemeMode = 'system' | 'light' | 'dark';

// ---------- Font Types ----------

export type QuranFont = 'qcf-v2' | 'qcf-v1' | 'qcf' | 'kfgqpc' | 'system-fallback';

export interface QuranFontOption {
  id: QuranFont;
  name: string;
  description: string;
  sampleText: string;
  fontFamily: string;
}

// ---------- Reading Settings Types ----------

export type ReadingViewMode = 'mushaf' | 'ayah';

export interface ReadingSettings {
  theme: ThemeMode;
  quranFont: QuranFont;
  arabicFontSize: number;
  arabicLineHeight: number;
  showArabic: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;
  viewMode: ReadingViewMode;
}

// ---------- Navigation Types ----------

export interface NavItem {
  label: string;
  path: string;
  icon?: string;
}
