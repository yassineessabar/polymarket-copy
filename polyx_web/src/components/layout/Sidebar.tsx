'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Copy,
  TrendingUp,
  BarChart3,
  Wallet,
  Settings,
  Users,
  X,
} from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/copy', label: 'Copy Trade', icon: Copy },
  { href: '/portfolio', label: 'Portfolio', icon: TrendingUp },
  { href: '/markets', label: 'Markets', icon: BarChart3 },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/referrals', label: 'Referrals', icon: Users },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-dark-border bg-dark-card transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
              PX
            </div>
            <span className="text-lg font-bold text-text-primary">PolyX</span>
          </Link>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="mt-4 flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-dark-hover hover:text-text-primary'
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-dark-border px-5 py-4">
          <p className="text-xs text-text-secondary">PolyX v0.1.0</p>
        </div>
      </aside>
    </>
  );
}
