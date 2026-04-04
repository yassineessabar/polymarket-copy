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
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    href: "/strategies",
    label: "Strategies",
    icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
  },
  {
    href: "/markets",
    label: "Markets",
    icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
  },
  {
    href: "/wallet",
    label: "Wallet",
    icon: "M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4M4 6v12c0 1.1.9 2 2 2h14v-4M18 12a2 2 0 000 4h4v-4h-4z",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
];

const MOBILE_NAV = NAV_ITEMS.slice(0, 5);

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

  return (
    <div className="min-h-screen min-h-[100dvh] bg-bg-primary flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[240px] flex-col border-r border-border bg-bg-primary fixed top-0 left-0 bottom-0 z-40">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-sm text-white">X</div>
            <span className="font-display text-lg font-semibold text-white">PolyX</span>
          </Link>
        </div>

        <nav className="flex-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm transition-all ${
                  active
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-text-secondary hover:text-white hover:bg-bg-hover"
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="text-xs text-text-muted mb-2 truncate">{truncateAddress(wallet)}</div>
          <button onClick={logout} className="text-xs text-text-muted hover:text-red transition-colors">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-[240px] w-full">
        {/* Top header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-bg-primary/80 border-b border-border">
          <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6">
            <Link href="/" className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center font-bold text-xs text-white">X</div>
              <span className="font-display font-semibold text-sm">PolyX</span>
            </Link>
            <div className="hidden md:block" />

            <div className="flex items-center gap-3 sm:gap-4">
              <Link href="/dashboard" className="relative text-text-secondary hover:text-white transition-colors p-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent rounded-full text-[10px] font-bold flex items-center justify-center">{unread}</span>
                )}
              </Link>

              <div className="hidden sm:block text-xs text-text-muted bg-bg-card border border-border rounded-lg px-3 py-1.5 truncate max-w-[160px]">
                {truncateAddress(wallet)}
              </div>

              <button onClick={logout} className="md:hidden text-xs text-text-muted hover:text-red transition-colors p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 pb-24 md:pb-6">{children}</div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-primary/95 backdrop-blur-lg border-t border-border flex z-40 mobile-bottom-nav">
          {MOBILE_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex-1 flex flex-col items-center py-2.5 pb-3 text-[10px] gap-0.5 ${active ? "text-accent" : "text-text-muted"}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
