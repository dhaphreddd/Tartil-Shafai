/**
 * Tartil Shafa'i — Settings Page
 */

import { useTheme } from '@/contexts/ThemeContext';
import { useReaderSettings } from '@/hooks/useReaderSettings';
import { QURAN_FONT_OPTIONS } from '@/core/fonts';
import type { ThemeMode } from '@/core/types';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'system', label: 'Sistem', icon: 'routine' },
  { mode: 'light', label: 'Terang', icon: 'light_mode' },
  { mode: 'dark', label: 'Gelap', icon: 'dark_mode' },
];

export default function SettingsPage() {
  const { mode, setMode, effective } = useTheme();
  const { settings, setFont, setFontSize, setLineHeight } = useReaderSettings();
  const isDark = effective === 'dark';

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 lg:px-12 py-12 animate-fade-in">
      <h1
        className="font-semibold mb-8"
        style={{
          color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)',
          fontSize: 'clamp(22px, 4vw, 30px)',
        }}
      >
        Pengaturan
      </h1>

      {/* Theme Selection */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{
          backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)',
          border: `1px solid ${isDark ? 'var(--color-dark-border)' : 'var(--color-border)'}`,
        }}
      >
        <h2
          className="font-semibold text-[18px] mb-4"
          style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}
        >
          Tema Visual
        </h2>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[14px] font-medium transition-all cursor-pointer"
              type="button"
              id={`theme-option-${opt.mode}`}
              onClick={() => setMode(opt.mode)}
              style={{
                backgroundColor:
                  mode === opt.mode
                    ? isDark
                      ? 'var(--color-dark-primary)'
                      : 'var(--color-primary)'
                    : isDark
                      ? 'var(--color-dark-surface-elevated)'
                      : 'var(--color-surface-subtle)',
                color:
                  mode === opt.mode
                    ? 'var(--color-on-primary)'
                    : isDark
                      ? 'var(--color-dark-text-secondary)'
                      : 'var(--color-text-secondary)',
                border: `1px solid ${
                  mode === opt.mode
                    ? 'transparent'
                    : isDark
                      ? 'var(--color-dark-border)'
                      : 'var(--color-border)'
                }`,
              }}
            >
              <span className="material-symbols-outlined text-[18px]">
                {opt.icon}
              </span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Settings */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{
          backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)',
          border: `1px solid ${isDark ? 'var(--color-dark-border)' : 'var(--color-border)'}`,
        }}
      >
        <h2
          className="font-semibold text-[18px] mb-4"
          style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}
        >
          Font Al-Qur'an
        </h2>
        <div className="flex flex-col gap-3">
          {QURAN_FONT_OPTIONS.map((font) => {
            const isSelected = settings.quranFont === font.id;
            return (
              <button
                key={font.id}
                type="button"
                onClick={() => setFont(font.id)}
                className="w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between"
                style={{
                  backgroundColor: isSelected
                    ? isDark
                      ? 'var(--color-dark-surface-elevated)'
                      : 'var(--color-surface-subtle)'
                    : 'transparent',
                  borderColor: isSelected
                    ? isDark
                      ? 'var(--color-dark-primary)'
                      : 'var(--color-primary)'
                    : isDark
                      ? 'var(--color-dark-border)'
                      : 'var(--color-border)',
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-semibold text-[15px]"
                      style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}
                    >
                      {font.name}
                    </span>
                    {isSelected && (
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          backgroundColor: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
                          color: '#fff',
                        }}
                      >
                        Aktif
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[13px] mt-0.5"
                    style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
                  >
                    {font.description}
                  </p>
                </div>
                <div
                  dir="rtl"
                  className="text-[22px]"
                  style={{
                    color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
                    fontFamily: font.id === 'qcf' ? 'QCF_BSML, serif' : font.fontFamily,
                  }}
                >
                  {font.sampleText}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Size & Line Spacing Settings */}
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: isDark ? 'var(--color-dark-surface)' : 'var(--color-surface)',
          border: `1px solid ${isDark ? 'var(--color-dark-border)' : 'var(--color-border)'}`,
        }}
      >
        <h2
          className="font-semibold text-[18px] mb-4"
          style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}
        >
          Tipografi Bacaan
        </h2>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className="text-[14px]"
                style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}
              >
                Ukuran Huruf Arab
              </label>
              <span
                className="font-mono text-[14px] font-semibold"
                style={{ color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)' }}
              >
                {settings.arabicFontSize}px
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setFontSize(Math.max(22, settings.arabicFontSize - 2))}
                className="w-10 h-10 rounded-lg flex items-center justify-center border transition-colors"
                style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <input
                type="range"
                min="22"
                max="48"
                step="2"
                value={settings.arabicFontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="flex-1 accent-amber-600"
              />
              <button
                type="button"
                onClick={() => setFontSize(Math.min(48, settings.arabicFontSize + 2))}
                className="w-10 h-10 rounded-lg flex items-center justify-center border transition-colors"
                style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className="text-[14px]"
                style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}
              >
                Kerapatan Baris (Line Height)
              </label>
              <span
                className="font-mono text-[14px] font-semibold"
                style={{ color: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)' }}
              >
                {settings.arabicLineHeight}x
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setLineHeight(Math.max(1.8, Number((settings.arabicLineHeight - 0.2).toFixed(1))))}
                className="w-10 h-10 rounded-lg flex items-center justify-center border transition-colors"
                style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <input
                type="range"
                min="1.8"
                max="2.8"
                step="0.1"
                value={settings.arabicLineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
                className="flex-1 accent-amber-600"
              />
              <button
                type="button"
                onClick={() => setLineHeight(Math.min(2.8, Number((settings.arabicLineHeight + 0.2).toFixed(1))))}
                className="w-10 h-10 rounded-lg flex items-center justify-center border transition-colors"
                style={{ borderColor: isDark ? 'var(--color-dark-border)' : 'var(--color-border)' }}
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
