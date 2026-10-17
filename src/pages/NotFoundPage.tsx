/**
 * Tartil Shafa'i — 404 Not Found Page
 */

import { Link } from 'react-router-dom';

import { useTheme } from '@/contexts/ThemeContext';

export default function NotFoundPage() {
  const { effective } = useTheme();
  const isDark = effective === 'dark';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in">
      <span
        className="material-symbols-outlined text-[64px] mb-4"
        style={{ color: isDark ? 'var(--color-dark-text-muted)' : 'var(--color-text-muted)' }}
      >
        explore_off
      </span>
      <h1
        className="font-semibold text-[30px] mb-2"
        style={{ color: isDark ? 'var(--color-dark-text)' : 'var(--color-text)' }}
      >
        404
      </h1>
      <p
        className="text-[15px] mb-6"
        style={{ color: isDark ? 'var(--color-dark-text-secondary)' : 'var(--color-text-secondary)' }}
      >
        Halaman yang Anda cari tidak ditemukan.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 h-10 px-4 rounded-lg font-medium text-[14px] transition-colors"
        style={{
          backgroundColor: isDark ? 'var(--color-dark-primary)' : 'var(--color-primary)',
          color: 'var(--color-on-primary)',
        }}
      >
        <span className="material-symbols-outlined text-[18px]">home</span>
        Kembali ke Beranda
      </Link>
    </div>
  );
}
