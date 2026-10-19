/**
 * Tartil Shafa'i — Mobile Bottom Navigation
 *
 * Based on Stitch home_mobile_tartil_shafa_i design.
 * Bottom nav with: Beranda, Jilid, Cari, Pengaturan.
 * Dynamically remembers the last opened Jilid / Reading package so switching to
 * Settings and back does not reset or reload to Jilid 1.
 */

import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { setLastReadingPath, getLastReadingPath } from '@/utils/navigationHistory';

export default function MobileBottomNav() {
  const { effective } = useTheme();
  const location = useLocation();

  // Track the last visited Jilid or package reading route
  useEffect(() => {
    if (location.pathname.startsWith('/jilid/') || location.pathname.startsWith('/paket/')) {
      setLastReadingPath(location.pathname);
    }
  }, [location.pathname]);

  const lastReadingPath = getLastReadingPath();

  const navItems = [
    { label: 'Beranda', path: '/', icon: 'auto_stories' },
    { label: 'Jilid', path: lastReadingPath, icon: 'library_books' },
    { label: 'Cari', path: '/search', icon: 'search' },
    { label: 'Pengaturan', path: '/settings', icon: 'settings' },
  ];

  const isItemActive = (label: string) => {
    if (label === 'Beranda') return location.pathname === '/';
    if (label === 'Jilid') {
      return location.pathname.startsWith('/jilid') || location.pathname.startsWith('/paket');
    }
    if (label === 'Cari') return location.pathname.startsWith('/search');
    if (label === 'Pengaturan') return location.pathname.startsWith('/settings');
    return false;
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
        {navItems.map((item) => {
          const active = isItemActive(item.label);
          return (
            <Link
              key={item.label}
              to={item.path}
              className="flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-lg transition-colors cursor-pointer"
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

