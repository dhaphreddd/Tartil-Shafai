/**
 * Tartil Shafa'i — Package Title Formatter
 *
 * Mengatur format judul surat dan nama Arab untuk materi paket:
 * - 1 surat: "QS. [Nama Surat]"
 * - 2 surat: "QS. [Surat 1] & [Surat 2]" (penghubung "&" antara 2 surat)
 * - > 2 surat (3+ surat): "QS. [Surat Awal] - [Surat Akhir]" (penghubung "-" antara surat pertama dan terakhir untuk menghemat ruang)
 */

import { SurahNameService } from '@/services/SurahNameService';

export interface SurahIdItem {
  surahId: number;
}

/**
 * Format judul surat latin berdasarkan jumlah surat dalam paket.
 */
export function formatSurahsTitle(
  sectionsOrIds: Array<SurahIdItem | number> | undefined | null,
  getNameFn?: (surahId: number) => string
): string {
  if (!sectionsOrIds || sectionsOrIds.length === 0) return '';

  const ids = sectionsOrIds.map((item) => (typeof item === 'number' ? item : item.surahId));
  const getName = getNameFn || ((id: number) => SurahNameService.getSurahName(id));

  if (ids.length === 1) {
    return `QS. ${getName(ids[0])}`;
  }

  if (ids.length === 2) {
    return `QS. ${getName(ids[0])} & ${getName(ids[1])}`;
  }

  // Lebih dari 2 surat (> 2) -> "QS. [Surat Awal] - [Surat Akhir]"
  const first = getName(ids[0]);
  const last = getName(ids[ids.length - 1]);
  return `QS. ${first} - ${last}`;
}

/**
 * Format nama Arab surat berdasarkan jumlah surat dalam paket.
 */
export function formatSurahsArabic(
  sectionsOrIds: Array<SurahIdItem | number> | undefined | null,
  getArabicFn: (surahId: number) => string
): string {
  if (!sectionsOrIds || sectionsOrIds.length === 0) return '';

  const ids = sectionsOrIds.map((item) => (typeof item === 'number' ? item : item.surahId));

  if (ids.length === 1) {
    return getArabicFn(ids[0]);
  }

  if (ids.length === 2) {
    return `${getArabicFn(ids[0])} & ${getArabicFn(ids[1])}`;
  }

  // Lebih dari 2 surat (> 2) -> "[Arab Awal] - [Arab Akhir]"
  const first = getArabicFn(ids[0]);
  const last = getArabicFn(ids[ids.length - 1]);
  return `${first} - ${last}`;
}
