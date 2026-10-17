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
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';

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

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-pulse-soft">
        <img
          src={`${import.meta.env.BASE_URL}logo-64.png`}
          alt="Tartil Shafa'i"
          className="w-10 h-10 object-contain drop-shadow-xs"
        />
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
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
