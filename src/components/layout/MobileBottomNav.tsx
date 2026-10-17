/**
 * Tartil Shafa'i — Mobile Bottom Navigation
 *
 * Based on Stitch home_mobile_tartil_shafa_i design.
 * Bottom nav with: Beranda, Jilid, Cari, Pengaturan.
 */

import { Link, useLocation } from 'react-router-dom';

import { useTheme } from '@/contexts/ThemeContext';

interface MobileNavItem {
  label: string;
  path: string;
  icon: string;
}

const NAV_ITEMS: MobileNavItem[] = [
  { label: 'Beranda', path: '/', icon: 'auto_stories' },
  { label: 'Jilid', path: '/jilid/1', icon: 'library_books' },
  { label: 'Cari', path: '/search', icon: 'search' },
  { label: 'Pengaturan', path: '/settings', icon: 'settings' },
];

export default function MobileBottomNav() {
  const { effective } = useTheme();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t transition-colors"
      id="mobile-nav"
      style={{
        backgroundColor: effective === 'dark'
          ? 'var(--color-dark-surface)'
          : 'var(--color-surface)',
        borderColor: effective === 'dark'
          ? 'var(--color-dark-border)'
          : 'var(--color-border)',
      }}
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-lg transition-colors"
              id={`mobile-nav-${item.label.toLowerCase()}`}
              style={{
                color: active
                  ? effective === 'dark'
                    ? 'var(--color-dark-primary)'
                    : 'var(--color-primary)'
                  : effective === 'dark'
                    ? 'var(--color-dark-text-muted)'
                    : 'var(--color-text-muted)',
              }}
            >
              <span className="material-symbols-outlined text-[24px]">
                {item.icon}
              </span>
              <span className="text-[11px] font-semibold tracking-wide">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}
