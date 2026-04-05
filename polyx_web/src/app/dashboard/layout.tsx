"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isLoggedIn, clearToken, userApi, notificationsApi } from "@/lib/api";
import { truncateAddress } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/strategies",
    label: "Strategies",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    href: "/wallet",
    label: "Wallet",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    href: "/refer",
    label: "Refer",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

const MOBILE_NAV = [
  NAV_ITEMS[0], // Dashboard
  NAV_ITEMS[1], // Strategies
  NAV_ITEMS[2], // Wallet
  NAV_ITEMS[4], // Settings (drop Refer on mobile)
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [wallet, setWallet] = useState("");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/auth");
      return;
    }
    userApi.me().then((data) => setWallet(data.wallet_address)).catch(() => {});
    notificationsApi.list(true, 1).then((data) => setUnread(data.unread_count)).catch(() => {});
  }, [router]);

  function logout() {
    clearToken();
    router.push("/auth");
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname?.startsWith(href);
  };

  const initials = wallet ? wallet.slice(2, 4).toUpperCase() : "PC";

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#FAFAFA] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-white border-r border-black/[0.04] w-[260px]">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 flex-shrink-0">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0F0F0F] flex items-center justify-center font-bold text-[13px] text-white flex-shrink-0">
              P
            </div>
            <span className="text-[15px] font-semibold text-[#0F0F0F] whitespace-nowrap">
              Polycool
            </span>
          </Link>
        </div>

        {/* Divider */}
        <div className="h-px bg-black/[0.04] mx-6 my-2" />

        {/* Nav label */}
        <div className="px-6 mb-2 mt-4">
          <span className="text-[10px] text-[#9CA3AF] uppercase tracking-[0.1em] font-medium">Menu</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 mx-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 h-10 px-3 mb-0.5 rounded-lg text-[13px] transition-all duration-150 ${
                  active
                    ? "bg-[#F5F5F5] text-[#0F0F0F] font-semibold"
                    : "text-[#6B7280] hover:text-[#0F0F0F] hover:bg-[#F5F5F5]/50"
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="whitespace-nowrap font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: wallet + logout */}
        <div className="border-t border-black/[0.04] pt-4 pb-5 px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center text-[#6B7280] text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-[#6B7280] font-mono truncate">{truncateAddress(wallet)}</p>
              <button
                onClick={logout}
                className="text-[11px] text-[#9CA3AF] hover:text-[#EF4444] transition-colors duration-150 font-medium mt-0.5"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-[260px] w-full">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/[0.04] h-16">
          <div className="flex items-center justify-between h-full px-6">
            {/* Mobile: logo */}
            <div className="md:hidden flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0F0F0F] flex items-center justify-center font-bold text-[13px] text-white">
                P
              </div>
              <span className="font-semibold text-[15px] text-[#0F0F0F]">Polycool</span>
            </div>
            <div className="hidden md:block" />

            <div className="flex items-center gap-3">
              {/* Notification bell */}
              <Link href="/notifications" className="relative text-[#9CA3AF] hover:text-[#0F0F0F] transition-colors duration-150 p-1.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                {unread > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-[#EF4444] rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                    {unread}
                  </span>
                )}
              </Link>

              {/* Desktop wallet pill */}
              <div className="hidden md:flex items-center bg-[#F5F5F5] rounded-lg px-3 py-1.5 text-[11px] text-[#6B7280] font-mono">
                {truncateAddress(wallet)}
              </div>
            </div>
          </div>
        </header>

        <div className="px-6 py-6 pb-24 md:pb-6">{children}</div>

        {/* Mobile bottom nav - 4 items */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black/[0.04] flex z-40 safe-bottom"
        >
          {MOBILE_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors duration-150 ${
                  active ? "text-[#0F0F0F]" : "text-[#9CA3AF]"
                }`}
              >
                <span className="flex-shrink-0">
                  {/* Re-render icon at 20px for mobile */}
                  {item.icon}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
