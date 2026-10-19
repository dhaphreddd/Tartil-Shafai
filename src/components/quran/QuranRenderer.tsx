import React from 'react';
import type { Ayah, QuranFont } from '@/core/types';
import { UnicodeRenderer } from './UnicodeRenderer';
import { QCFRenderer } from './QCFRenderer';
import { useQuranFont } from '@/hooks/useQuranFont';

interface QuranRendererProps {
  ayahs: Ayah[];
  font: QuranFont;
  fontSize?: number;
  lineHeight?: number;
}

export const QuranRenderer: React.FC<QuranRendererProps> = ({
  ayahs,
  font,
  fontSize = 32,
  lineHeight = 2.2,
}) => {
  const { activeFont, activeFontFamily, loading, error } = useQuranFont(font);

  if (!ayahs || ayahs.length === 0) {
    return <div className="text-center p-8 opacity-60">Tidak ada ayat untuk ditampilkan.</div>;
  }

  // If font is QCF glyph font, use QCFRenderer
  if (activeFont === 'qcf-v2' || activeFont === 'qcf-v1' || activeFont === 'qcf') {
    const version = activeFont === 'qcf-v1' ? 'v1' : 'v2';
    return (
      <QCFRenderer
        ayahs={ayahs}
        fontSize={fontSize}
        lineHeight={lineHeight}
        version={version}
      />
    );
  }

  return (
    <div className="relative">
      {/* Loading Indicator */}
      {loading && (
        <div className="absolute top-0 left-0 right-0 flex justify-center mt-[-30px]">
          <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full animate-pulse-soft">
            Memuat font...
          </span>
        </div>
      )}

      {/* Error Fallback Indicator */}
      {error && activeFont === 'system-fallback' && (
        <div className="absolute top-0 left-0 right-0 flex justify-center mt-[-30px]">
          <span className="bg-amber-100 text-amber-700 text-xs px-3 py-1 rounded-full">
            Gagal memuat font, menggunakan System Arabic
          </span>
        </div>
      )}

      <div className={`transition-opacity duration-300 ${loading ? 'opacity-40 blur-[1px]' : 'opacity-100 blur-none'}`}>
        <UnicodeRenderer
          ayahs={ayahs}
          fontFamily={activeFontFamily}
          fontSize={fontSize}
          lineHeight={lineHeight}
        />
      </div>
    </div>
  );
};
