'use client';

import { NavLink } from 'react-router-dom';
import { FileText, Scale, BarChart3, Settings, Gavel, Moon, Sun, Menu, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { path: '/submissions', label: 'Submissions', icon: FileText },
  { path: '/judges', label: 'Judges', icon: Scale },
  { path: '/results', label: 'Results', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const { theme, toggleTheme, mounted } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-slate-200 bg-slate-50 transition-transform dark:border-slate-800 dark:bg-slate-950',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600">
            <Gavel className="size-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            AI Judge
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                    )
                  }
                >
                  <item.icon className="size-4" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {mounted && (
                <>
                  {theme === 'dark' ? (
                    <Moon className="size-4 text-slate-500" />
                  ) : (
                    <Sun className="size-4 text-slate-500" />
                  )}
                  <span className="text-sm text-slate-500">
                    {theme === 'dark' ? 'Dark' : 'Light'}
                  </span>
                </>
              )}
            </div>
            <Switch
              checked={mounted && theme === 'dark'}
              onCheckedChange={toggleTheme}
              aria-label="Toggle dark mode"
            />
          </div>
          <p className="mt-3 text-xs text-slate-400">v1.0</p>
        </div>
      </aside>
    </>
  );
}
