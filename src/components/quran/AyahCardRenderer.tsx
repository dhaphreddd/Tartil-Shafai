import React, { useEffect, useState } from 'react';
import type { Ayah, QuranFont } from '@/core/types';
import { loadQCFPageFont } from '@/utils/FontManager';
import { useQuranFont } from '@/hooks/useQuranFont';
import { useTheme } from '@/contexts/ThemeContext';

interface AyahCardRendererProps {
  ayahs: Ayah[];
  font: QuranFont;
  fontSize?: number;
  lineHeight?: number;
  showArabic?: boolean;
  showTransliteration?: boolean;
  showTranslation?: boolean;
  surahName?: string;
  surahId?: number;
}

export const AyahCardRenderer: React.FC<AyahCardRendererProps> = ({
  ayahs,
  font,
  fontSize = 32,
  lineHeight = 2.2,
  showArabic = true,
  showTransliteration = true,
  showTranslation = true,
  surahName,
  surahId,
}) => {
  const { effective } = useTheme();
  const isDark = effective === 'dark';
  const { activeFontFamily } = useQuranFont(font);
  const isQcf = font === 'qcf-v1' || font === 'qcf-v2' || font === 'qcf';
  const version: 'v1' | 'v2' = font === 'qcf-v1' ? 'v1' : 'v2';

  const [copiedAyah, setCopiedAyah] = useState<number | null>(null);

  // Load QCF fonts if applicable
  useEffect(() => {
    if (!isQcf) return;
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
      if (!isMounted) return;
    }
    loadRequiredFonts();
    return () => {
      isMounted = false;
    };
  }, [ayahs, isQcf, version]);

  const handleCopy = async (ayah: Ayah) => {
    const parts: string[] = [];
    const header = surahName
      ? `QS. ${surahName} [${surahId || ''}:${ayah.ayahNumber}]`
      : `Ayat ${ayah.ayahNumber}`;
    parts.push(header);

    if (showArabic && ayah.text) {
      parts.push(ayah.text);
    }
    if (showTransliteration && ayah.latin) {
      parts.push(ayah.latin);
    }
    if (showTranslation && ayah.translation) {
      parts.push(ayah.translation);
    }

    const textToCopy = parts.join('\n');
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedAyah(ayah.ayahNumber);
      setTimeout(() => {
        setCopiedAyah(null);
      }, 2000);
    } catch {
      // Fallback
    }
  };

  if (!ayahs || ayahs.length === 0) {
    return <div className="text-center p-8 opacity-60">Tidak ada ayat untuk ditampilkan.</div>;
  }

  return (
    <div className="space-y-3.5 md:space-y-4">
      {ayahs.map((ayah, idx) => {
        // Arabic font resolution for this ayah
        const pageNumber =
          version === 'v1'
            ? (ayah.pageNumberV1 || ayah.pageNumber)
            : (ayah.pageNumberV2 || ayah.pageNumber);

        const glyph =
          version === 'v1'
            ? (ayah.glyphCodeV1 || ayah.glyphCode)
            : (ayah.glyphCodeV2 || ayah.glyphCode);

        const pagePad = pageNumber ? String(pageNumber).padStart(3, '0') : '';
        const fontList = isQcf && pageNumber
          ? `"p${pageNumber}-${version}", "p${pageNumber}", "QCF_P${pagePad}", "KFGQPC_Hafs", serif`
          : activeFontFamily || '"KFGQPC_Hafs", "Noto Naskh Arabic", serif';
        const hasGlyph = isQcf && Boolean(glyph);

        const isCurrentlyCopied = copiedAyah === ayah.ayahNumber;

        return (
          <article
            key={`${ayah.surahId || surahId || 's'}-${ayah.ayahNumber}-${idx}`}
            id={`ayah-${ayah.ayahNumber}`}
            className="group relative rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-sm p-4 sm:p-6"
            style={{
              backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)',
              borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
            }}
          >
            {/* Quick Copy Button (Minimal in corner, no header bar or labels) */}
            <button
              type="button"
              onClick={() => handleCopy(ayah)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer z-10"
              style={{
                color: isCurrentlyCopied
                  ? '#10b981'
                  : isDark
                    ? 'var(--color-dark-text-muted)'
                    : 'var(--color-text-muted)',
              }}
              title="Salin ayat"
              aria-label={`Salin ayat ${ayah.ayahNumber}`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isCurrentlyCopied ? 'check' : 'content_copy'}
              </span>
            </button>

            {/* Content Body without any labels */}
            <div className="space-y-3.5">
              {/* Element 1: Arabic Text */}
              {showArabic && (
                <div
                  className="w-full text-right pr-6 sm:pr-8"
                  dir="rtl"
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight,
                    wordSpacing: isQcf ? '0.15em' : 'normal',
                  }}
                >
                  <span
                    className="quran-ayah-text inline transition-colors select-text dark:text-white"
                    style={{
                      fontFamily: fontList,
                    }}
                  >
                    {hasGlyph ? glyph : ayah.text}
                  </span>
                  {!hasGlyph && (
                    <span
                      className="ayah-end-marker inline-block mx-1.5 text-[0.75em] select-none align-middle font-medium"
                      style={{ fontFamily: '"KFGQPC_Hafs", "Noto Naskh Arabic", serif' }}
                    >
                      ۝{ayah.ayahNumber}
                    </span>
                  )}
                </div>
              )}

              {/* Subtle divider if Arabic text is visible and other elements follow */}
              {showArabic && (showTransliteration || showTranslation) && (
                <div
                  className="border-t opacity-30 pt-1"
                  style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}
                />
              )}

              {/* Element 2: Latin Transliteration (Clean text, no label) */}
              {showTransliteration && (
                <p
                  className="text-[15px] sm:text-[16px] leading-relaxed italic font-serif tracking-wide select-text text-left pr-6 sm:pr-8"
                  dir="ltr"
                  style={{
                    color: isDark ? '#fef3c7' : '#78350f',
                  }}
                >
                  {ayah.latin || 'Transliterasi belum tersedia'}
                </p>
              )}

              {/* Element 3: Indonesian Translation (Clean text, no label) */}
              {showTranslation && (
                <p
                  className="text-[14px] sm:text-[15px] leading-relaxed select-text text-left pr-6 sm:pr-8"
                  dir="ltr"
                  style={{
                    color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)',
                  }}
                >
                  {ayah.translation || 'Terjemahan belum tersedia'}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};
