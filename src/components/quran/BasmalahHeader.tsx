import React, { useEffect } from 'react';
import type { QuranFont } from '@/core/types';
import { loadQCFPageFont } from '@/utils/FontManager';

interface BasmalahHeaderProps {
  font: QuranFont;
  fontSize?: number;
  showArabic?: boolean;
  showTransliteration?: boolean;
  showTranslation?: boolean;
  isDark?: boolean;
}

export const BasmalahHeader: React.FC<BasmalahHeaderProps> = ({
  font,
  fontSize = 32,
  showArabic = true,
  showTransliteration = false,
  showTranslation = false,
  isDark = false,
}) => {
  const isQcfV1 = font === 'qcf-v1';
  const isQcfV2 = font === 'qcf-v2' || font === 'qcf';
  const isKfgqpc = font === 'kfgqpc';

  useEffect(() => {
    if (isQcfV1) {
      loadQCFPageFont(1, 'v1');
    } else if (isQcfV2) {
      loadQCFPageFont(1, 'v2');
    }
  }, [isQcfV1, isQcfV2]);

  let arabicText = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
  let fontFamily = 'Arial, "Traditional Arabic", "Scheherazade New", serif';
  let wordSpacing = 'normal';

  if (isQcfV1) {
    // Mushaf Madinah V1 (Klasik Utsman Thaha)
    arabicText = 'ﭑ ﭒ ﭓ ﭔ';
    fontFamily = '"p1-v1", "p1", "QCF_BSML", "QCF_P001", serif';
    wordSpacing = '0.15em';
  } else if (isQcfV2) {
    // Mushaf Madinah V2 (Standar Modern Quran.com)
    arabicText = 'ﱁ ﱂ ﱃ ﱄ';
    fontFamily = '"p1-v2", "p1", serif';
    wordSpacing = '0.15em';
  } else if (isKfgqpc) {
    // KFGQPC Uthmanic Hafs
    arabicText = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
    fontFamily = '"KFGQPC_Hafs", "Noto Naskh Arabic", serif';
  }

  const effectiveFontSize = Math.max(26, Math.min(fontSize, 42));

  return (
    <div className="text-center select-none">
      {showArabic && (
        <div
          dir="rtl"
          className="quran-ayah-text inline-block transition-colors select-text dark:text-white"
          style={{
            fontFamily,
            fontSize: `${effectiveFontSize}px`,
            lineHeight: 2.2,
            wordSpacing,
          }}
          title="Bismillāhir-raḥmānir-raḥīm"
        >
          {arabicText}
        </div>
      )}

      {showTransliteration && (
        <p
          className="text-xs sm:text-[13px] italic font-serif mt-1 tracking-wide"
          style={{ color: isDark ? '#fef3c7' : '#78350f' }}
        >
          Bismillāhir-raḥmānir-raḥīm
        </p>
      )}

      {showTranslation && (
        <p
          className="text-xs sm:text-[12px] mt-0.5 opacity-80"
          style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
        >
          Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang
        </p>
      )}
    </div>
  );
};
