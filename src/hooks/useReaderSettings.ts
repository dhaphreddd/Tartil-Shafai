import { useState, useEffect } from 'react';
import type { QuranFont, ReadingSettings, ReadingViewMode } from '@/core/types';
import { storeFont } from '@/core/fonts';

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReadingSettings>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('tartil_reader_settings') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let font: QuranFont = 'qcf-v2';
        if (parsed.quranFont === 'qcf-v1' || parsed.quranFont === 'qcf-v2') {
          font = parsed.quranFont;
        } else if (parsed.quranFont === 'qcf') {
          font = 'qcf-v2';
        } else if (parsed.quranFont === 'kfgqpc' || parsed.quranFont === 'system-fallback') {
          font = parsed.quranFont;
        }

        return {
          theme: parsed.theme || 'system',
          quranFont: font,
          arabicFontSize: parsed.arabicFontSize || 32,
          arabicLineHeight: parsed.arabicLineHeight || 2.2,
          showArabic: parsed.showArabic !== undefined ? Boolean(parsed.showArabic) : true,
          showTransliteration: parsed.showTransliteration !== undefined ? Boolean(parsed.showTransliteration) : false,
          showTranslation: parsed.showTranslation !== undefined ? Boolean(parsed.showTranslation) : false,
          viewMode: parsed.viewMode === 'ayah' ? 'ayah' : 'mushaf',
        };
      } catch {
        // ignore
      }
    }
    return {
      theme: 'system',
      quranFont: 'qcf-v2',
      arabicFontSize: 32,
      arabicLineHeight: 2.2,
      showArabic: true,
      showTransliteration: false,
      showTranslation: false,
      viewMode: 'mushaf',
    };
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tartil_reader_settings', JSON.stringify(settings));
    }
    storeFont(settings.quranFont);
  }, [settings]);

  const setFont = (quranFont: QuranFont) => setSettings((s) => ({ ...s, quranFont }));
  const setFontSize = (arabicFontSize: number) => setSettings((s) => ({ ...s, arabicFontSize }));
  const setLineHeight = (arabicLineHeight: number) => setSettings((s) => ({ ...s, arabicLineHeight }));

  const setShowArabic = (showArabic: boolean) => {
    setSettings((s) => {
      // Minimal 1 elemen harus aktif
      if (!showArabic && !s.showTransliteration && !s.showTranslation) return s;
      const nextViewMode = !showArabic ? 'ayah' : s.viewMode;
      return { ...s, showArabic, viewMode: nextViewMode };
    });
  };

  const setShowTransliteration = (showTransliteration: boolean) => {
    setSettings((s) => {
      if (!showTransliteration && !s.showArabic && !s.showTranslation) return s;
      const nextViewMode = showTransliteration ? 'ayah' : s.viewMode;
      return { ...s, showTransliteration, viewMode: nextViewMode };
    });
  };

  const setShowTranslation = (showTranslation: boolean) => {
    setSettings((s) => {
      if (!showTranslation && !s.showArabic && !s.showTransliteration) return s;
      const nextViewMode = showTranslation ? 'ayah' : s.viewMode;
      return { ...s, showTranslation, viewMode: nextViewMode };
    });
  };

  const setViewMode = (viewMode: ReadingViewMode) => {
    setSettings((s) => {
      if (viewMode === 'mushaf') {
        // Mode baca mushaf mengalir fokus pada ayat asli Al-Qur'an
        return {
          ...s,
          viewMode: 'mushaf',
          showArabic: true,
          showTransliteration: false,
          showTranslation: false,
        };
      }
      return {
        ...s,
        viewMode: 'ayah',
      };
    });
  };

  const toggleElement = (elem: 'arabic' | 'transliteration' | 'translation') => {
    setSettings((s) => {
      const nextArabic = elem === 'arabic' ? !s.showArabic : s.showArabic;
      const nextTransliteration = elem === 'transliteration' ? !s.showTransliteration : s.showTransliteration;
      const nextTranslation = elem === 'translation' ? !s.showTranslation : s.showTranslation;

      // Cegah semua 3 elemen dimatikan sekaligus (minimal 1 harus aktif)
      if (!nextArabic && !nextTransliteration && !nextTranslation) {
        return s;
      }

      // Jika transliterasi/terjemahan aktif atau teks arab dimatikan, otomatis masuk ke mode 'ayah'
      let nextViewMode = s.viewMode;
      if (nextTransliteration || nextTranslation || !nextArabic) {
        nextViewMode = 'ayah';
      }

      return {
        ...s,
        showArabic: nextArabic,
        showTransliteration: nextTransliteration,
        showTranslation: nextTranslation,
        viewMode: nextViewMode,
      };
    });
  };

  const resetDefaults = () => {
    setSettings((s) => ({
      ...s,
      arabicFontSize: 32,
      arabicLineHeight: 2.2,
      quranFont: 'qcf-v2',
      showArabic: true,
      showTransliteration: false,
      showTranslation: false,
      viewMode: 'mushaf',
    }));
  };

  return {
    settings,
    setFont,
    setFontSize,
    setLineHeight,
    setShowArabic,
    setShowTransliteration,
    setShowTranslation,
    setViewMode,
    toggleElement,
    resetDefaults,
  };
}
