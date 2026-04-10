"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isLoggedIn, clearToken, userApi } from "@/lib/api";
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
    href: "/portfolio",
    label: "Portfolio",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    href: "/reconciliation",
    label: "Reconciliation",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.5 2v6h-6" />
        <path d="M2.5 22v-6h6" />
        <path d="M2.5 11.5a10 10 0 0118.4-4.5L21.5 8" />
        <path d="M21.5 12.5a10 10 0 01-18.4 4.5L2.5 16" />
      </svg>
    ),
  },
];

const MOBILE_NAV = [
  NAV_ITEMS[0], // Dashboard
  NAV_ITEMS[1], // Portfolio
  NAV_ITEMS[2], // Reconciliation
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [wallet, setWallet] = useState("");

  useEffect(() => {
    // Try to load wallet from API if logged in, otherwise show default
    if (isLoggedIn()) {
      userApi.me().then((data) => setWallet(data.wallet_address)).catch(() => {
        setWallet("0x736fb967C9f02787fb37858C97D62577520a9568");
      });
    } else {
      setWallet("0x736fb967C9f02787fb37858C97D62577520a9568");
    }
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
              {/* Desktop wallet pill */}
              <div className="hidden md:flex items-center bg-[#F5F5F5] rounded-lg px-3 py-1.5 text-[11px] text-[#6B7280] font-mono">
                {truncateAddress(wallet)}
              </div>
            </div>
          </div>
        </header>

        <div className="px-6 py-6 pb-24 md:pb-6">{children}</div>

        {/* Mobile bottom nav - 3 items */}
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
