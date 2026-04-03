'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Copy,
  TrendingUp,
  Wallet,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';

const TABS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/copy', label: 'Copy', icon: Copy },
  { href: '/portfolio', label: 'Portfolio', icon: TrendingUp },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-dark-border bg-dark-card lg:hidden">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              'flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors',
              active ? 'text-accent' : 'text-text-secondary'
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
