import { useState, useEffect } from 'react';
import type { QuranFont, ReadingSettings } from '@/core/types';
import { storeFont } from '@/core/fonts';

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReadingSettings>(() => {
    const saved = localStorage.getItem('tartil_reader_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          theme: parsed.theme || 'system',
          quranFont: 'qcf',
          arabicFontSize: parsed.arabicFontSize || 32,
          arabicLineHeight: parsed.arabicLineHeight || 2.2,
        };
      } catch {
        // ignore
      }
    }
    return {
      theme: 'system',
      quranFont: 'qcf',
      arabicFontSize: 32,
      arabicLineHeight: 2.2,
    };
  });

  useEffect(() => {
    localStorage.setItem('tartil_reader_settings', JSON.stringify(settings));
    storeFont(settings.quranFont);
  }, [settings]);

  const setFont = (quranFont: QuranFont) => setSettings(s => ({ ...s, quranFont }));
  const setFontSize = (arabicFontSize: number) => setSettings(s => ({ ...s, arabicFontSize }));
  const setLineHeight = (arabicLineHeight: number) => setSettings(s => ({ ...s, arabicLineHeight }));

  const resetDefaults = () => {
    setSettings(s => ({
      ...s,
      arabicFontSize: 32,
      arabicLineHeight: 2.2,
      quranFont: 'qcf',
    }));
  };

  return { settings, setFont, setFontSize, setLineHeight, resetDefaults };
}
