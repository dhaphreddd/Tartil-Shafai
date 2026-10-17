import { useState, useEffect } from 'react';
import { loadFont, fonts } from '@/utils/FontManager';
import type { QuranFont } from '@/core/types';

export function useQuranFont(selectedFont: QuranFont) {
  const [activeFont, setActiveFont] = useState<QuranFont>('system-fallback');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      // If system fallback or qcf, switch immediately
      if (selectedFont === 'system-fallback' || selectedFont === 'qcf') {
        setActiveFont(selectedFont);
        setLoading(false);
        setError(false);
        return;
      }

      const fontMeta = fonts[selectedFont];
      if (!fontMeta) {
        setActiveFont('qcf');
        return;
      }



      // Start loading
      setLoading(true);
      setError(false);

      const success = await loadFont(selectedFont);
      
      if (!mounted) return;

      if (success) {
        setActiveFont(selectedFont);
        setError(false);
      } else {
        // Fallback on error
        setActiveFont('system-fallback');
        setError(true);
      }
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [selectedFont]);

  const activeFontFamily = activeFont; // Now passed directly as class modifier

  return { activeFont, activeFontFamily, loading, error };
}
