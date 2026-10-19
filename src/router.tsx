/**
 * Tartil Shafa'i — Application Router
 *
 * Routes as defined in PRD Section 13 & 21:
 * /             → Home
 * /jilid/:volumeId → Volume (Package List)
 * /paket/:packageId → Package (Quran Reader)
 * /search       → Search
 * /settings     → Settings
 * /admin/*      → Admin Panel
 */

import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useRouteError, Link } from 'react-router-dom';

import MainLayout from '@/layouts/MainLayout';
import AdminGuard from '@/components/AdminGuard';

// Lazy-loaded pages for route-based code splitting
const HomePage = lazy(() => import('@/pages/HomePage'));
const VolumePage = lazy(() => import('@/pages/VolumePage'));
const PackagePage = lazy(() => import('@/pages/PackagePage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// Admin Pages
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminPackagesPage = lazy(() => import('@/pages/admin/AdminPackagesPage'));
const AdminPackageFormPage = lazy(() => import('@/pages/admin/AdminPackageFormPage'));

function RouteErrorBoundary() {
  const error: any = useRouteError();
  const isChunkError =
    error?.message?.includes('dynamically imported module') ||
    error?.message?.includes('Failed to fetch') ||
    error?.name === 'ChunkLoadError';

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center py-12">
      <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-amber-600 text-[32px]">
          {isChunkError ? 'update' : 'error_outline'}
        </span>
      </div>
      <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
        {isChunkError ? 'Pembaruan Aplikasi Tersedia' : 'Terjadi Kendala Memuat Halaman'}
      </h2>
      <p className="text-sm max-w-md mb-6" style={{ color: 'var(--color-text-muted)' }}>
        {isChunkError
          ? 'Versi aplikasi telah diperbarui di server. Silakan muat ulang halaman untuk memperbarui tampilan.'
          : error?.message || 'Silakan muat ulang halaman atau kembali ke beranda.'}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm cursor-pointer"
        >
          Muat Ulang Halaman
        </button>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider border transition-colors"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-pulse-soft">
        <img
          src={`${import.meta.env.BASE_URL}logo-64.png`}
          alt="Tartil Shafa'i"
          className="w-10 h-10 object-contain drop-shadow-xs"
          width="40"
          height="40"
          decoding="async"
        />
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: 'jilid/:volumeId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <VolumePage />
          </Suspense>
        ),
      },
      {
        path: 'paket/:packageId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PackagePage />
          </Suspense>
        ),
      },
      {
        path: 'search',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SearchPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SettingsPage />
          </Suspense>
        ),
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<PageLoader />}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/admin',
    element: <Outlet />,
    children: [
      {
        index: true,
        element: <Navigate to="/admin/packages" replace />,
      },
      {
        path: 'login',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminLoginPage />
          </Suspense>
        ),
      },
      {
        path: 'packages',
        element: (
          <AdminGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminPackagesPage />
            </Suspense>
          </AdminGuard>
        ),
      },
      {
        path: 'packages/create',
        element: (
          <AdminGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminPackageFormPage />
            </Suspense>
          </AdminGuard>
        ),
      },
      {
        path: 'packages/new',
        element: <Navigate to="/admin/packages/create" replace />,
      },
      {
        path: 'packages/edit/:id',
        element: (
          <AdminGuard>
            <Suspense fallback={<PageLoader />}>
              <AdminPackageFormPage />
            </Suspense>
          </AdminGuard>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/admin/packages" replace />,
      },
    ],
  },
], {
  basename: import.meta.env.BASE_URL,
});

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
