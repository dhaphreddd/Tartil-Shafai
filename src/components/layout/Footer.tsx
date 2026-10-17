/**
 * Tartil Shafa'i — Footer
 *
 * Based on Stitch home_desktop_tartil_shafa_i footer design.
 */

import { useTheme } from '@/contexts/ThemeContext';

export default function Footer() {
  const { effective } = useTheme();

  return (
    <footer
      className="w-full border-t transition-colors hidden md:block"
      style={{
        backgroundColor: effective === 'dark'
          ? 'rgba(24, 24, 24, 0.6)'
          : 'rgba(255, 255, 255, 0.6)',
        borderColor: effective === 'dark'
          ? 'var(--color-dark-border)'
          : 'var(--color-border)',
      }}
    >
      <div className="max-w-[1280px] w-full mx-auto px-4 md:px-8 lg:px-12 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex flex-col items-center md:items-start">
          <span
            className="font-semibold text-[18px]"
            style={{
              color: effective === 'dark'
                ? 'var(--color-dark-text)'
                : 'var(--color-text)',
            }}
          >
            Tartil Shafa'i
          </span>
          <p
            className="text-[13px] mt-1"
            style={{
              color: effective === 'dark'
                ? 'var(--color-dark-text-secondary)'
                : 'var(--color-text-secondary)',
            }}
          >
            Platform digital Tartil Shafa'i
          </p>
        </div>

        {/* Copyright */}
        <div
          className="text-[11px] font-semibold tracking-wider"
          style={{
            color: effective === 'dark'
              ? 'var(--color-dark-text-muted)'
              : 'var(--color-text-muted)',
          }}
        >
          © 2025 Tartil Shafa'i. Hak cipta terlindungi.
        </div>
      </div>
    </footer>
  );
}
