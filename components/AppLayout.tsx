'use client';

import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { Toaster } from 'sonner';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppSidebar />
      <main className="lg:pl-60">
        <div className="min-h-screen px-6 py-8 lg:px-8">
          <Outlet />
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
