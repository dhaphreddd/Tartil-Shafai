/**
 * Tartil Shafa'i — Quran Reading Settings Popover
 *
 * Modeled after Quran.com's reader settings popover
 * (https://quran.com/al-baqarah?readingMode=arabic&startingVerse=11).
 *
 * Clean floating dropdown popover anchored directly below the "Tampilan" button:
 * - NO dark backdrop overlay (page remains 100% visible)
 * - NO body scroll lock (user can freely scroll verses while adjusting)
 * - Live real-time adjustment of font size and line height
 * - Click-outside and Escape key detection
 */

import { useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { ThemeMode, QuranFont } from '@/core/types';

interface ReaderSettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  fontSize: number;
  setFontSize: (size: number) => void;
  lineHeight: number;
  setLineHeight: (height: number) => void;
  onReset: () => void;
  currentFont?: QuranFont;
  setFont?: (font: QuranFont) => void;
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

export default function ReaderSettingsPopover({
  isOpen,
  onClose,
  anchorRef,
  fontSize,
  setFontSize,
  lineHeight,
  setLineHeight,
  onReset,
  currentFont,
  setFont,
}: ReaderSettingsPopoverProps) {
  const { mode, setMode, effective } = useTheme();
  const isDark = effective === 'dark';
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside (without blocking clicks or scrolling on the page)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Pengaturan Tampilan Bacaan"
      className="absolute right-0 top-full mt-2 z-40 w-[calc(100vw-32px)] sm:w-[350px] max-w-[360px] rounded-2xl border shadow-2xl transition-all animate-fade-in flex flex-col max-h-[85vh] overflow-y-auto"
      style={{
        backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)',
        borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
        color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)' }}
          >
            tune
          </span>
          <span className="font-semibold text-sm">Tampilan Bacaan</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Tutup pengaturan"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-5">
        {/* Versi Font Mushaf */}
        {setFont && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold">Versi Font Mushaf</label>
              <span
                className="px-2 py-0.5 rounded text-[11px] font-semibold"
                style={{
                  backgroundColor: isDark ? 'rgba(198, 161, 91, 0.15)' : 'rgba(154, 119, 56, 0.12)',
                  color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
                }}
              >
                {currentFont === 'qcf-v1' ? 'V1 Klasik' : 'V2 Quran.com'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFont('qcf-v2')}
                className="p-2.5 rounded-xl border text-left transition-all cursor-pointer"
                style={{
                  backgroundColor:
                    currentFont === 'qcf-v2' || !currentFont || currentFont === 'qcf'
                      ? isDark
                        ? 'var(--color-dark-surface-elevated)'
                        : 'var(--color-surface-subtle)'
                      : 'transparent',
                  borderColor:
                    currentFont === 'qcf-v2' || !currentFont || currentFont === 'qcf'
                      ? isDark
                        ? 'var(--color-dark-primary)'
                        : 'var(--color-primary)'
                      : isDark
                        ? 'var(--color-dark-border)'
                        : 'var(--color-border)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">V2 (Quran.com)</span>
                  {(currentFont === 'qcf-v2' || !currentFont || currentFont === 'qcf') && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)' }}
                    />
                  )}
                </div>
                <p
                  className="text-[11px] leading-tight"
                  style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
                >
                  Modern & standar Quran.com
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFont('qcf-v1')}
                className="p-2.5 rounded-xl border text-left transition-all cursor-pointer"
                style={{
                  backgroundColor:
                    currentFont === 'qcf-v1'
                      ? isDark
                        ? 'var(--color-dark-surface-elevated)'
                        : 'var(--color-surface-subtle)'
                      : 'transparent',
                  borderColor:
                    currentFont === 'qcf-v1'
                      ? isDark
                        ? 'var(--color-dark-primary)'
                        : 'var(--color-primary)'
                      : isDark
                        ? 'var(--color-dark-border)'
                        : 'var(--color-border)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">V1 (Klasik)</span>
                  {currentFont === 'qcf-v1' && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)' }}
                    />
                  )}
                </div>
                <p
                  className="text-[11px] leading-tight"
                  style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
                >
                  Cetakan klasik 1421H
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Font Size */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold">Ukuran Huruf Al-Qur'an</label>
            <span
              className="px-2 py-0.5 rounded text-[11px] font-semibold font-mono"
              style={{
                backgroundColor: isDark ? 'rgba(198, 161, 91, 0.15)' : 'rgba(154, 119, 56, 0.12)',
                color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
              }}
            >
              {fontSize} px
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2.5">
            <button
              type="button"
              onClick={() => setFontSize(Math.max(22, fontSize - 2))}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}
              aria-label="Perkecil huruf"
            >
              <span className="material-symbols-outlined text-[16px]">remove</span>
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
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}
              aria-label="Perbesar huruf"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-4 gap-1">
            {FONT_PRESETS.map((p) => {
              const isSelected = fontSize === p.size;
              return (
                <button
                  key={p.size}
                  type="button"
                  onClick={() => setFontSize(p.size)}
                  className="py-1 rounded text-[11px] font-medium border transition-colors"
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

        {/* Line Height */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold">Jarak Baris</label>
            <span
              className="px-2 py-0.5 rounded text-[11px] font-semibold font-mono"
              style={{
                backgroundColor: isDark ? 'rgba(198, 161, 91, 0.15)' : 'rgba(154, 119, 56, 0.12)',
                color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
              }}
            >
              {lineHeight}x
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {LINE_HEIGHT_OPTIONS.map((opt) => {
              const isSelected = Math.abs(lineHeight - opt.value) < 0.05;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLineHeight(opt.value)}
                  className="py-1.5 px-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center"
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
                    className="text-[10px]"
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

        {/* Visual Theme Selection */}
        <div>
          <label className="text-xs font-semibold block mb-2">Tema Tampilan</label>
          <div className="grid grid-cols-3 gap-1.5">
            {THEME_OPTIONS.map((opt) => {
              const isSelected = mode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => setMode(opt.mode)}
                  className="py-1.5 px-2 rounded-lg border text-center transition-all flex items-center justify-center gap-1.5"
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
                  <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2.5 border-t flex items-center justify-between"
        style={{
          borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)',
          backgroundColor: isDark
            ? 'var(--color-dark-surface-elevated)'
            : 'var(--color-surface-subtle)',
        }}
      >
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-[11px] font-medium transition-colors hover:underline"
          style={{
            color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)',
          }}
        >
          <span className="material-symbols-outlined text-[14px]">restart_alt</span>
          <span>Reset Standar</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 rounded-lg text-xs font-semibold shadow-xs transition-opacity hover:opacity-90"
          style={{
            backgroundColor: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
            color: 'var(--color-on-primary)',
          }}
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
