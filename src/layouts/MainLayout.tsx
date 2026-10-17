/**
 * Tartil Shafa'i — Main Layout
 *
 * Wraps all public pages with Header (desktop), Footer (desktop),
 * and MobileBottomNav (mobile).
 */

import { Outlet } from 'react-router-dom';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useTheme } from '@/contexts/ThemeContext';

export default function MainLayout() {
  const { effective } = useTheme();

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-200"
      style={{
        backgroundColor: effective === 'dark'
          ? 'var(--color-dark-bg)'
          : 'var(--color-bg)',
        color: effective === 'dark'
          ? 'var(--color-dark-text)'
          : 'var(--color-text)',
      }}
    >
      <Header />
      <main className="flex-1 w-full pt-16 pb-20 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
