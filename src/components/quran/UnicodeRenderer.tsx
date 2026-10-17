import React from 'react';
import type { Ayah } from '@/core/types';

interface UnicodeRendererProps {
  ayahs: Ayah[];
  fontFamily: string;
  fontSize?: number;
  lineHeight?: number;
}

export const UnicodeRenderer: React.FC<UnicodeRendererProps> = ({
  ayahs,
  fontFamily,
  fontSize = 34,
  lineHeight = 2.4,
}) => {
  return (
    <div
      className="w-full"
      dir="rtl"
      style={{
        fontFamily: fontFamily || '"KFGQPC_Hafs", "Noto Naskh Arabic", serif',
        fontSize: `${fontSize}px`,
        lineHeight,
        textAlign: 'justify',
        textAlignLast: 'center',
      }}
    >
      {ayahs.map((ayah, idx) => (
        <React.Fragment key={`${ayah.surahId || 's'}-${ayah.ayahNumber}-${idx}`}>
          <span className="quran-ayah-text font-normal dark:text-white">
            {ayah.text}
          </span>
          <span 
            className="ayah-end-marker inline-block mx-1.5 text-[0.75em] select-none align-middle font-medium"
            style={{ fontFamily: '"KFGQPC_Hafs", "Noto Naskh Arabic", serif' }}
          >
            ۝{ayah.ayahNumber}
          </span>
          {idx < ayahs.length - 1 && ' '}
        </React.Fragment>
      ))}
    </div>
  );
};
