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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/strategies",
    label: "Strategies",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </svg>
    ),
  },
  {
    href: "/wallet",
    label: "Wallet",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

const MOBILE_NAV = [NAV_ITEMS[0], NAV_ITEMS[1], NAV_ITEMS[3], NAV_ITEMS[4]]; // Dashboard, Strategies, Wallet, Settings

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [wallet, setWallet] = useState("");
  const [unread, setUnread] = useState(0);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen min-h-[100dvh] bg-white flex">
      {/* Desktop Sidebar */}
      <aside
        onMouseEnter={() => setSidebarHover(true)}
        onMouseLeave={() => setSidebarHover(false)}
        className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-white border-r border-[#F4F4F5] transition-all duration-200 ease-in-out"
        style={{ width: sidebarHover ? 240 : 72 }}
      >
        {/* Logo */}
        <div className="h-[72px] flex items-center px-4 flex-shrink-0">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-[#00C805] flex items-center justify-center font-bold text-[15px] text-white flex-shrink-0">
              P
            </div>
            <span
              className="text-lg font-bold text-[#121212] whitespace-nowrap transition-opacity duration-200"
              style={{ opacity: sidebarHover ? 1 : 0 }}
            >
              Polycool
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 mt-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 mb-1 transition-all duration-150 rounded-xl overflow-hidden ${
                  sidebarHover ? "px-3 py-2.5" : "justify-center py-2.5"
                } ${
                  active
                    ? "bg-[#F4F4F5] text-[#121212]"
                    : "text-[#737373] hover:text-[#121212]"
                }`}
                style={!sidebarHover ? { width: 40, height: 40, margin: "0 auto 4px auto", display: "flex" } : {}}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#00C805] rounded-r-full" />
                )}
                <span className="flex-shrink-0">{item.icon}</span>
                {sidebarHover && (
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user avatar + logout */}
        <div className="px-4 pb-5 flex-shrink-0">
          <div
            className={`flex items-center gap-3 transition-all duration-200 ${
              sidebarHover ? "" : "justify-center"
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-[#00C805] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            {sidebarHover && (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#737373] font-mono truncate">{truncateAddress(wallet)}</p>
                <button
                  onClick={logout}
                  className="text-xs text-[#737373] hover:text-[#FF5000] transition-colors font-medium mt-0.5"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-[72px] w-full">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#F4F4F5] h-14">
          <div className="flex items-center justify-between h-full px-4 sm:px-6">
            {/* Mobile: page title / logo */}
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#00C805] flex items-center justify-center font-bold text-sm text-white">
                P
              </div>
              <span className="font-bold text-[15px] text-[#121212]">Polycool</span>
            </div>
            <div className="hidden md:block" />

            <div className="flex items-center gap-3">
              {/* Notification bell */}
              <Link href="/notifications" className="relative text-[#737373] hover:text-[#121212] transition-colors p-1.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                {unread > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-[#FF5000] rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                    {unread}
                  </span>
                )}
              </Link>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-[#737373] hover:text-[#121212] transition-colors p-1.5"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  {mobileMenuOpen ? (
                    <>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </>
                  ) : (
                    <>
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-14 z-30 bg-white">
            <nav className="p-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#F4F4F5] text-[#121212]"
                        : "text-[#737373] hover:text-[#121212] hover:bg-[#F4F4F5]"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="absolute bottom-24 left-0 right-0 px-8">
              <div className="text-xs text-[#737373] font-mono mb-2">{truncateAddress(wallet)}</div>
              <button onClick={logout} className="text-sm text-[#737373] hover:text-[#FF5000] transition-colors font-medium">
                Sign Out
              </button>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 pb-20 md:pb-6">{children}</div>

        {/* Mobile bottom nav — 4 items, no labels */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#F4F4F5] flex z-40"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {MOBILE_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex items-center justify-center py-4 transition-colors ${
                  active ? "text-[#00C805]" : "text-[#737373]"
                }`}
              >
                {item.icon}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
