/**
 * Tartil Shafa'i — Quran Reading Settings Drawer
 *
 * Modeled after Quran.com's reader settings experience
 * (https://quran.com/al-baqarah?readingMode=arabic&startingVerse=11).
 *
 * Provides a slide-over panel on the reader view allowing users to adjust:
 * - Arabic font size (slider + quick presets + live preview)
 * - Arabic line spacing / line-height (Kompak, Normal, Renggang)
 * - Mushaf Font info (QSV / QCF Mushaf Madinah single official font)
 * - Visual Reading Theme (Terang, Gelap, Sistem)
 * - Reset to defaults
 */

import { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { ThemeMode } from '@/core/types';

interface ReaderSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  lineHeight: number;
  setLineHeight: (height: number) => void;
  onReset: () => void;
}

const LINE_HEIGHT_OPTIONS = [
  { value: 1.8, label: 'Kompak', description: '1.8x' },
  { value: 2.2, label: 'Normal', description: '2.2x' },
  { value: 2.6, label: 'Renggang', description: '2.6x' },
];

const FONT_PRESETS = [
  { size: 26, label: 'Kecil' },
  { size: 32, label: 'Standar' },
  { size: 38, label: 'Besar' },
  { size: 46, label: 'Ekstra' },
];

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Terang', icon: 'light_mode' },
  { mode: 'dark', label: 'Gelap', icon: 'dark_mode' },
  { mode: 'system', label: 'Sistem', icon: 'routine' },
];

export default function ReaderSettingsDrawer({
  isOpen,
  onClose,
  fontSize,
  setFontSize,
  lineHeight,
  setLineHeight,
  onReset,
}: ReaderSettingsDrawerProps) {
  const { mode, setMode, effective } = useTheme();
  const isDark = effective === 'dark';

  // Handle Escape key to close drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex max-w-full">
        <div
          className="w-full sm:w-[400px] max-w-full transform transition-all duration-300 ease-in-out shadow-2xl flex flex-col h-full"
          style={{
            backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)',
            color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)',
            borderLeft: `1px solid ${isDark ? 'var(--color-dark-border)' : 'var(--color-border)'}`,
          }}
        >
          {/* Header */}
          <div
            className="px-6 py-4 border-b flex items-center justify-between"
            style={{
              borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="material-symbols-outlined text-[22px]"
                style={{
                  color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
                }}
              >
                tune
              </span>
              <div>
                <h2 className="text-base font-semibold leading-tight">Pengaturan Bacaan</h2>
                <p
                  className="text-xs"
                  style={{
                    color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)',
                  }}
                >
                  Tampilan Mushaf & Ukuran Huruf
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Tutup Pengaturan"
              id="close-reader-settings"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Live Text Preview Box */}
            <div
              className="p-4 rounded-xl border text-center transition-all"
              style={{
                backgroundColor: isDark
                  ? 'var(--color-dark-surface-elevated)'
                  : 'var(--color-surface-subtle)',
                borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
              }}
            >
              <div
                className="text-[11px] font-medium tracking-wider uppercase mb-2"
                style={{
                  color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)',
                }}
              >
                Pratinjau Langsung
              </div>
              <div
                dir="rtl"
                className="font-arabic select-none leading-relaxed"
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight,
                  color: isDark ? '#FFFFFF' : 'var(--color-text)',
                  fontFamily: '"QCF_BSML", "p1", serif',
                }}
              >
                ﭑ ﭒ ﭓ ﭔ
              </div>
              <p
                className="text-[12px] mt-2"
                style={{
                  color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)',
                }}
              >
                Bismillāhir-raḥmānir-raḥīm
              </p>
            </div>

            {/* Font Size Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Ukuran Huruf Al-Qur'an</label>
                <span
                  className="px-2 py-0.5 rounded text-xs font-semibold font-mono"
                  style={{
                    backgroundColor: isDark ? 'rgba(198, 161, 91, 0.15)' : 'rgba(154, 119, 56, 0.12)',
                    color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
                  }}
                >
                  {fontSize} px
                </span>
              </div>

              {/* Slider with - and + buttons */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setFontSize(Math.max(22, fontSize - 2))}
                  className="w-9 h-9 rounded-lg flex items-center justify-center border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}
                  aria-label="Perkecil huruf"
                  title="Perkecil huruf (2px)"
                >
                  <span className="material-symbols-outlined text-[18px]">remove</span>
                </button>

                <input
                  type="range"
                  min="22"
                  max="54"
                  step="2"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="flex-1 accent-amber-600 cursor-pointer h-2 rounded-lg"
                  aria-label="Pilih ukuran huruf"
                />

                <button
                  type="button"
                  onClick={() => setFontSize(Math.min(54, fontSize + 2))}
                  className="w-9 h-9 rounded-lg flex items-center justify-center border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}
                  aria-label="Perbesar huruf"
                  title="Perbesar huruf (2px)"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>

              {/* Quick Size Presets */}
              <div className="grid grid-cols-4 gap-1.5">
                {FONT_PRESETS.map((p) => {
                  const isSelected = fontSize === p.size;
                  return (
                    <button
                      key={p.size}
                      type="button"
                      onClick={() => setFontSize(p.size)}
                      className="py-1.5 rounded text-xs font-medium border transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? isDark
                            ? 'var(--color-dark-primary)'
                            : 'var(--color-primary)'
                          : 'transparent',
                        color: isSelected
                          ? '#ffffff'
                          : isDark
                            ? 'var(--color-dark-text-secondary)'
                            : 'var(--color-text-secondary)',
                        borderColor: isSelected
                          ? 'transparent'
                          : isDark
                            ? 'var(--color-dark-border)'
                            : 'var(--color-border)',
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Line Height Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Jarak Antar Baris</label>
                <span
                  className="px-2 py-0.5 rounded text-xs font-semibold font-mono"
                  style={{
                    backgroundColor: isDark ? 'rgba(198, 161, 91, 0.15)' : 'rgba(154, 119, 56, 0.12)',
                    color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
                  }}
                >
                  {lineHeight}x
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {LINE_HEIGHT_OPTIONS.map((opt) => {
                  const isSelected = Math.abs(lineHeight - opt.value) < 0.05;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLineHeight(opt.value)}
                      className="py-2.5 px-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-0.5"
                      style={{
                        backgroundColor: isSelected
                          ? isDark
                            ? 'var(--color-dark-primary)'
                            : 'var(--color-primary)'
                          : isDark
                            ? 'var(--color-dark-surface-elevated)'
                            : 'var(--color-surface-subtle)',
                        color: isSelected
                          ? '#ffffff'
                          : isDark
                            ? 'var(--color-dark-text)'
                            : 'var(--color-text)',
                        borderColor: isSelected
                          ? 'transparent'
                          : isDark
                            ? 'var(--color-dark-border)'
                            : 'var(--color-border)',
                      }}
                    >
                      <span className="text-xs font-semibold">{opt.label}</span>
                      <span
                        className="text-[11px]"
                        style={{
                          color: isSelected
                            ? '#ffffff'
                            : isDark
                              ? 'var(--color-dark-text-muted)'
                              : 'var(--color-text-muted)',
                        }}
                      >
                        {opt.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Style Badge (Single Official Font) */}
            <div>
              <label className="text-sm font-semibold block mb-2">Font Mushaf</label>
              <div
                className="p-3.5 rounded-xl border flex items-start gap-3"
                style={{
                  backgroundColor: isDark
                    ? 'var(--color-dark-surface-elevated)'
                    : 'var(--color-surface-subtle)',
                  borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
                }}
              >
                <span
                  className="material-symbols-outlined text-[20px] shrink-0 mt-0.5"
                  style={{
                    color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
                  }}
                >
                  verified
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs leading-none">
                      Mushaf Madinah (QSV / QCF)
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.2 rounded font-semibold leading-tight"
                      style={{
                        backgroundColor: isDark
                          ? 'rgba(198, 161, 91, 0.2)'
                          : 'rgba(154, 119, 56, 0.15)',
                        color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
                      }}
                    >
                      Resmi
                    </span>
                  </div>
                  <p
                    className="text-[11px] mt-1 leading-relaxed"
                    style={{
                      color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)',
                    }}
                  >
                    Glif vektor standar Kompleks Percetakan Al-Qur'an Raja Fahd (Quran.com CDN).
                  </p>
                </div>
              </div>
            </div>

            {/* Theme Selection */}
            <div>
              <label className="text-sm font-semibold block mb-2">Tema Visual</label>
              <div className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map((opt) => {
                  const isSelected = mode === opt.mode;
                  return (
                    <button
                      key={opt.mode}
                      type="button"
                      onClick={() => setMode(opt.mode)}
                      className="py-2.5 px-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1"
                      style={{
                        backgroundColor: isSelected
                          ? isDark
                            ? 'var(--color-dark-primary)'
                            : 'var(--color-primary)'
                          : isDark
                            ? 'var(--color-dark-surface-elevated)'
                            : 'var(--color-surface-subtle)',
                        color: isSelected
                          ? '#ffffff'
                          : isDark
                            ? 'var(--color-dark-text)'
                            : 'var(--color-text)',
                        borderColor: isSelected
                          ? 'transparent'
                          : isDark
                            ? 'var(--color-dark-border)'
                            : 'var(--color-border)',
                      }}
                    >
                      <span className="material-symbols-outlined text-[20px]">{opt.icon}</span>
                      <span className="text-xs font-semibold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Drawer Footer */}
          <div
            className="p-4 border-t flex items-center justify-between gap-3"
            style={{
              borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
              backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)',
            }}
          >
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{
                borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
                color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)',
              }}
              title="Kembalikan ukuran huruf dan kerapatan ke standar awal"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Reset Standar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg text-xs font-semibold shadow-sm transition-all hover:opacity-90"
              style={{
                backgroundColor: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
                color: 'var(--color-on-primary)',
              }}
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
