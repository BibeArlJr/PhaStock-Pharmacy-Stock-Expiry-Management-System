import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import FullScreenLoader from '@/components/FullScreenLoader';
import PageTransition from '@/components/PageTransition';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { cn } from '@/lib/utils';

const SIDEBAR_STORAGE_KEY = 'phast_sidebar_collapsed';

const titleMap = {
  '/dashboard': 'Dashboard',
  '/medicines': 'Medicines',
  '/suppliers': 'Suppliers',
  '/receipts': 'Receipts',
  '/receipts/new': 'Add Receipt',
  '/batch-stock': 'Batch Stock',
  '/stock-issue': 'Stock Issue',
  '/alerts': 'Alerts',
  '/medicines/new': 'Add Medicine',
  '/suppliers/new': 'Add Supplier',
  '/settings': 'Settings',
};

const getPageTitle = (pathname) => {
  if (pathname.startsWith('/receipts/') && pathname !== '/receipts/new') {
    return 'Receipt Detail';
  }

  if (pathname === '/medicines/new') {
    return 'Add Medicine';
  }

  if (pathname.startsWith('/medicines/') && pathname.endsWith('/edit')) {
    return 'Edit Medicine';
  }

  if (pathname === '/suppliers/new') {
    return 'Add Supplier';
  }

  if (pathname.startsWith('/suppliers/') && pathname.endsWith('/edit')) {
    return 'Edit Supplier';
  }

  return titleMap[pathname] || 'PhaStock';
};

export default function AppShell() {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    setIsNavigating(true);
    const id = window.setTimeout(() => setIsNavigating(false), 180);

    return () => window.clearTimeout(id);
  }, [location.pathname]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const title = useMemo(() => getPageTitle(location.pathname), [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggle={() => {
          setIsSidebarCollapsed((prev) => !prev);
        }}
      />
      <Topbar isSidebarCollapsed={isSidebarCollapsed} />

      <main className={cn('pt-16 transition-[margin-left] duration-200', isSidebarCollapsed ? 'ml-[72px]' : 'ml-[260px]')}>
        <div className="h-[calc(100vh-4rem)] overflow-y-auto p-6">
          <div className="mb-4 text-sm font-medium text-muted-foreground">{title}</div>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>

      {isNavigating ? <FullScreenLoader /> : null}
    </div>
  );
}
