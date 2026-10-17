/**
 * Tartil Shafa'i — Top Header / Navbar
 *
 * Clean, serene digital mus-haf header.
 * Displays: Logo Jalsah + brand name (left), and quick utility actions:
 * Theme Switcher, Settings, and Admin Portal (right).
 */

import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';

export default function Header() {
  const { mode, cycleMode, effective } = useTheme();

  const themeIcon =
    mode === 'system'
      ? 'routine'
      : effective === 'dark'
        ? 'dark_mode'
        : 'light_mode';

  const themeLabel =
    mode === 'system'
      ? 'Sistem'
      : mode === 'light'
        ? 'Terang'
        : 'Gelap';

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl border-b transition-colors duration-200"
      style={{
        backgroundColor: effective === 'dark'
          ? 'rgba(17, 17, 17, 0.85)'
          : 'rgba(250, 250, 247, 0.85)',
        borderColor: effective === 'dark'
          ? 'var(--color-dark-border)'
          : 'var(--color-border)',
      }}
    >
      <div className="h-16 max-w-[1280px] w-full mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <Link
          to="/"
          className="flex items-center gap-3 group focus:outline-none"
          id="nav-logo"
        >
          <img
            src={`${import.meta.env.BASE_URL}logo-128.png`}
            alt="Logo Jalsah Qur'aniyyah Shafa'i"
            className="w-8 h-8 md:w-9 md:h-9 object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
            width="36"
            height="36"
            loading="eager"
          />
          <span
            className="font-semibold text-[17px] md:text-[18px] leading-none tracking-tight transition-colors"
            style={{
              color: effective === 'dark'
                ? 'var(--color-dark-text)'
                : 'var(--color-text)',
            }}
          >
            Tartil Shafa'i
          </span>
        </Link>

        {/* Clean Right Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={cycleMode}
            id="theme-toggle"
            title={`Tema: ${themeLabel} (Klik untuk mengganti)`}
            aria-label={`Ganti Tema — saat ini: ${themeLabel}`}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-black/5 dark:hover:bg-white/10"
            style={{
              color: effective === 'dark'
                ? 'var(--color-dark-text-secondary)'
                : 'var(--color-text-secondary)',
            }}
          >
            <span className="material-symbols-outlined text-[20px]">
              {themeIcon}
            </span>
          </button>

          {/* Admin / Profile Link */}
          <Link
            to="/admin/packages"
            id="admin-link"
            title="Panel Admin"
            aria-label="Panel Admin"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-85 shadow-sm"
            style={{
              backgroundColor: effective === 'dark'
                ? 'var(--color-dark-primary)'
                : 'var(--color-primary)',
              color: 'var(--color-on-primary)',
            }}
          >
            <span className="material-symbols-outlined text-[18px]">
              person
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
