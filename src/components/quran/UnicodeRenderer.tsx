import React from 'react';
import type { Ayah } from '@/core/types';

interface UnicodeRendererProps {
  ayahs: Ayah[];
  fontFamily: string;
  fontSize?: number;
  lineHeight?: number;
  isAdmin?: boolean;
  onToggleWaqof?: (ayah: Ayah) => void;
}

export const UnicodeRenderer: React.FC<UnicodeRendererProps> = ({
  ayahs,
  fontFamily,
  fontSize = 34,
  lineHeight = 2.4,
  isAdmin = false,
  onToggleWaqof,
}) => {
  const isClickable = Boolean(isAdmin && onToggleWaqof);

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
          {idx < ayahs.length - 1 && ' '}
        </React.Fragment>
      ))}
    </div>
  );
};
