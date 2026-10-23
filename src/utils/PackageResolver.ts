import { resolveAyahRange, getSurahsMetadata } from '../services/QuranService';
import type { TartilPackage, Ayah, SurahMetadata, Layer3Section } from '@/core/types';

export interface ResolvedSection {
  surahId: number;
  surahMetadata: SurahMetadata;
  startAyah: number;
  endAyah: number;
  ayahs: Ayah[];
}

export interface ResolvedPackage {
  pkg: TartilPackage;
  surahMetadata: SurahMetadata;
  ayahs: Ayah[];
  sections: ResolvedSection[];
}

function sanitizeMushafV1Page(surahId: number, ayahNumber: number, currentPage?: number): number {
  if (surahId === 87) {
    return ayahNumber <= 15 ? 591 : 592;
  }
  if (surahId === 88) {
    return 592;
  }
  if (surahId === 93) {
    return 596;
  }
  if (surahId === 5 && ayahNumber === 77) {
    return 121;
  }
  if (surahId === 55 && (ayahNumber === 17 || ayahNumber === 18)) {
    return 532;
  }
  return currentPage || 1;
}

export class PackageResolver {
  /**
   * Resolves a Tartil package into a full context object including ayahs and metadata
   * Supports both single surah and multi-surah packages.
   */
  static async resolve(pkg: TartilPackage): Promise<ResolvedPackage> {
    const allMeta = await getSurahsMetadata();

    // Determine sections to resolve
    const rawSections: Layer3Section[] =
      pkg.sections && pkg.sections.length > 0
        ? pkg.sections
        : [
            {
              id: 'sec-0',
              surahId: pkg.surahId,
              startAyah: pkg.startAyah,
              endAyah: pkg.endAyah,
              customAyahs: pkg.customAyahs,
            },
          ];

    const resolvedSections: ResolvedSection[] = [];
    const allAyahs: Ayah[] = [];

    for (const sec of rawSections) {
      if (sec.startAyah > sec.endAyah) {
        throw new Error(
          `Validation Error: startAyah (${sec.startAyah}) lebih besar dari endAyah (${sec.endAyah}) pada surat ${sec.surahId}`
        );
      }

      const surahMetadata = allMeta.find((m) => m.id === sec.surahId);
      if (!surahMetadata) {
        throw new Error(`Validation Error: Surah ID ${sec.surahId} tidak ditemukan`);
      }

      if (sec.startAyah < 1 || sec.endAyah > surahMetadata.ayahCount) {
        throw new Error(
          `Validation Error: Rentang ayat ${sec.startAyah}-${sec.endAyah} di luar batas untuk QS. ${surahMetadata.name} (1-${surahMetadata.ayahCount})`
        );
      }

      let sectionAyahs: Ayah[] = [];
      if (sec.customAyahs && sec.customAyahs.length > 0) {
        // Enrich custom ayahs with pageNumber & glyphCode from dataset if missing
        const datasetAyahs = await resolveAyahRange(sec.surahId, sec.startAyah, sec.endAyah);
        const datasetMap = new Map<number, Ayah>();
        for (const d of datasetAyahs) datasetMap.set(d.ayahNumber, d);

        sectionAyahs = sec.customAyahs.map((a) => {
          const enriched = datasetMap.get(a.ayahNumber);
          const rawV1Page = a.pageNumberV1 || enriched?.pageNumberV1 || a.pageNumber;
          const finalV1Page = sanitizeMushafV1Page(sec.surahId, a.ayahNumber, rawV1Page);
          const rawV2Page = a.pageNumberV2 || enriched?.pageNumberV2 || enriched?.pageNumber || a.pageNumber;

          return {
            ...a,
            surahId: sec.surahId,
            // V1 fields
            glyphCodeV1: a.glyphCodeV1 || enriched?.glyphCodeV1 || a.glyphCode,
            pageNumberV1: finalV1Page,
            // V2 fields
            glyphCodeV2: a.glyphCodeV2 || enriched?.glyphCodeV2 || enriched?.glyphCode,
            pageNumberV2: rawV2Page,
            // Default active fields (V2 is default)
            glyphCode: enriched?.glyphCodeV2 || a.glyphCodeV2 || enriched?.glyphCode || a.glyphCode,
            pageNumber: rawV2Page,
            latin: a.latin || enriched?.latin || '',
            translation: a.translation || enriched?.translation || '',
          };
        });
      } else {
        const fetched = await resolveAyahRange(sec.surahId, sec.startAyah, sec.endAyah);
        if (fetched.length === 0 || fetched.length !== sec.endAyah - sec.startAyah + 1) {
          throw new Error(
            `Validation Error: Gagal memuat rentang ayat dari QS. ${surahMetadata.name} (diterima ${fetched.length} dari target ${sec.endAyah - sec.startAyah + 1} ayat)`
          );
        }
        sectionAyahs = fetched.map((a) => ({
          ...a,
          surahId: sec.surahId,
          pageNumberV1: sanitizeMushafV1Page(sec.surahId, a.ayahNumber, a.pageNumberV1 || a.pageNumber),
          pageNumberV2: a.pageNumberV2 || a.pageNumber,
        }));
      }

      resolvedSections.push({
        surahId: sec.surahId,
        surahMetadata,
        startAyah: sec.startAyah,
        endAyah: sec.endAyah,
        ayahs: sectionAyahs,
      });

      allAyahs.push(...sectionAyahs);
    }

    return {
      pkg,
      surahMetadata: resolvedSections[0].surahMetadata,
      ayahs: allAyahs,
      sections: resolvedSections,
    };
  }
}
