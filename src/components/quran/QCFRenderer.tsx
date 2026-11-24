import React, { useEffect, useState } from 'react';
import type { Ayah } from '@/core/types';
import { loadQCFPageFont } from '@/utils/FontManager';

interface QCFRendererProps {
  ayahs: Ayah[];
  fontSize?: number;
  lineHeight?: number;
  version?: 'v1' | 'v2';
  isAdmin?: boolean;
  onToggleWaqof?: (ayah: Ayah) => void;
}

export const QCFRenderer: React.FC<QCFRendererProps> = ({
  ayahs,
  fontSize = 34,
  lineHeight = 2.4,
  version = 'v2',
  isAdmin = false,
  onToggleWaqof,
}) => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadRequiredFonts() {
      const pageNumbers = Array.from(
        new Set(
          ayahs
            .map((a) => {
              if (version === 'v1') {
                return a.pageNumberV1 || a.pageNumber;
              }
              return a.pageNumberV2 || a.pageNumber;
            })
            .filter((p): p is number => typeof p === 'number' && p > 0)
        )
      );

      await Promise.all(pageNumbers.map((page) => loadQCFPageFont(page, version)));
      if (isMounted) setFontsLoaded(true);
    }

    loadRequiredFonts();
    return () => {
      isMounted = false;
    };
  }, [ayahs, version]);

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
        const pageNumber =
          version === 'v1'
            ? (ayah.pageNumberV1 || ayah.pageNumber)
            : (ayah.pageNumberV2 || ayah.pageNumber);

        const glyph =
          version === 'v1'
            ? (ayah.glyphCodeV1 || ayah.glyphCode)
            : (ayah.glyphCodeV2 || ayah.glyphCode);

        const pagePad = pageNumber ? String(pageNumber).padStart(3, '0') : '';
        const fontList = pageNumber
          ? `"p${pageNumber}-${version}", "p${pageNumber}", "QCF_P${pagePad}", "KFGQPC_Hafs", serif`
          : '"KFGQPC_Hafs", serif';
        const hasGlyph = Boolean(glyph);

        let wordsGlyph = glyph || '';
        let markerGlyph: string | null = null;
        if (hasGlyph && glyph) {
          const tokens = glyph.trim().split(/\s+/);
          if (tokens.length > 1) {
            wordsGlyph = tokens.slice(0, -1).join(' ');
            markerGlyph = tokens[tokens.length - 1];
          }
        }

        const isClickable = Boolean(isAdmin && onToggleWaqof);

        return (
          <React.Fragment key={`${ayah.surahId || 's'}-${ayah.ayahNumber}-${idx}-${version}`}>
            <span
              className="quran-ayah-text inline transition-colors dark:text-white"
              style={{
                fontFamily: hasGlyph ? fontList : '"KFGQPC_Hafs", "Noto Naskh Arabic", serif',
              }}
            >
              {hasGlyph ? wordsGlyph : ayah.text}
            </span>
            {hasGlyph && markerGlyph ? (
              <>
                {' '}
                <span
                  className={`ayah-end-marker inline select-none transition-all ${
                    ayah.isWaqof ? 'ayah-waqof' : ''
                  } ${isClickable ? 'cursor-pointer hover:opacity-80 active:scale-95' : ''}`}
                  style={{
                    fontFamily: fontList,
                  }}
                  onClick={isClickable ? () => onToggleWaqof!(ayah) : undefined}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={
                    isClickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onToggleWaqof!(ayah);
                          }
                        }
                      : undefined
                  }
                  title={
                    isAdmin
                      ? ayah.isWaqof
                        ? `Ayat ${ayah.ayahNumber} (Waqaf aktif — Klik untuk hapus)`
                        : `Ayat ${ayah.ayahNumber} (Klik untuk tandai Waqaf)`
                      : ayah.isWaqof
                        ? `Ayat ${ayah.ayahNumber} (Tanda Waqaf)`
                        : `Ayat ${ayah.ayahNumber}`
                  }
                >
                  {markerGlyph}
                </span>
              </>
            ) : !hasGlyph ? (
              <span
                className={`ayah-end-marker inline-block mx-1.5 text-[0.75em] select-none align-middle font-medium transition-all ${
                  ayah.isWaqof ? 'ayah-waqof' : ''
                } ${isClickable ? 'cursor-pointer hover:opacity-80 active:scale-95' : ''}`}
                style={{ fontFamily: '"KFGQPC_Hafs", "Noto Naskh Arabic", serif' }}
                onClick={isClickable ? () => onToggleWaqof!(ayah) : undefined}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={
                  isClickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onToggleWaqof!(ayah);
                        }
                      }
                    : undefined
                }
                title={
                  isAdmin
                    ? ayah.isWaqof
                      ? `Ayat ${ayah.ayahNumber} (Waqaf aktif — Klik untuk hapus)`
                      : `Ayat ${ayah.ayahNumber} (Klik untuk tandai Waqaf)`
                    : ayah.isWaqof
                      ? `Ayat ${ayah.ayahNumber} (Tanda Waqaf)`
                      : `Ayat ${ayah.ayahNumber}`
                }
              >
                ۝{ayah.ayahNumber}
              </span>
            ) : null}
            {idx < ayahs.length - 1 && ' '}
          </React.Fragment>
        );
      })}
    </div>
  );
};
