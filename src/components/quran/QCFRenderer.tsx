import React, { useEffect, useState } from 'react';
import type { Ayah } from '@/core/types';
import { loadQCFPageFont } from '@/utils/FontManager';

interface QCFRendererProps {
  ayahs: Ayah[];
  fontSize?: number;
  lineHeight?: number;
}

export const QCFRenderer: React.FC<QCFRendererProps> = ({
  ayahs,
  fontSize = 34,
  lineHeight = 2.4,
}) => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadRequiredFonts() {
      const pageNumbers = Array.from(
        new Set(
          ayahs
            .map(a => a.pageNumber)
            .filter((p): p is number => typeof p === 'number' && p > 0)
        )
      );

      await Promise.all(pageNumbers.map(page => loadQCFPageFont(page)));
      if (isMounted) setFontsLoaded(true);
    }

    loadRequiredFonts();
    return () => {
      isMounted = false;
    };
  }, [ayahs]);

  if (!ayahs || ayahs.length === 0) {
    return <div className="text-center p-8 opacity-60">Tidak ada ayat untuk ditampilkan.</div>;
  }

  return (
    <div
      className={`w-full transition-opacity duration-300 ${fontsLoaded ? 'opacity-100' : 'opacity-95'}`}
      dir="rtl"
      style={{
        fontSize: `${fontSize}px`,
        lineHeight,
        textAlign: 'justify',
        textAlignLast: 'center',
        wordSpacing: '0.15em',
      }}
    >
      {ayahs.map((ayah, idx) => {
        const pageNumber = ayah.pageNumber;
        const pagePad = pageNumber ? String(pageNumber).padStart(3, '0') : '';
        const fontList = pageNumber
          ? `"p${pageNumber}", "QCF_P${pagePad}", "KFGQPC_Hafs", serif`
          : '"KFGQPC_Hafs", serif';
        const hasGlyph = Boolean(ayah.glyphCode);

        return (
          <React.Fragment key={`${ayah.surahId || 's'}-${ayah.ayahNumber}-${idx}`}>
            <span
              className="quran-ayah-text inline transition-colors dark:text-white"
              style={{
                fontFamily: hasGlyph ? fontList : '"KFGQPC_Hafs", "Noto Naskh Arabic", serif',
              }}
            >
              {hasGlyph ? ayah.glyphCode : ayah.text}
            </span>
            {idx < ayahs.length - 1 && ' '}
          </React.Fragment>
        );
      })}
    </div>
  );
};
