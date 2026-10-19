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
          return {
            ...a,
            surahId: sec.surahId,
            pageNumber: enriched?.pageNumber || a.pageNumber,
            glyphCode: a.glyphCode || enriched?.glyphCode,
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
