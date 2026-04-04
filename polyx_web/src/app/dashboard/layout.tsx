"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isLoggedIn, clearToken, userApi, notificationsApi } from "@/lib/api";
import { truncateAddress } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/portfolio", label: "Portfolio", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { href: "/copy-trading", label: "Copy Trade", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
  { href: "/settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
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

  return (
    <div className="min-h-screen min-h-[100dvh] bg-bg-primary flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[220px] lg:w-[240px] flex-col border-r border-border bg-bg-primary fixed top-0 left-0 bottom-0 z-40">
        <div className="p-5 lg:p-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-sm text-white">X</div>
            <span className="font-display text-lg font-semibold text-white">PolyX</span>
          </Link>
        </div>

        <nav className="flex-1 px-2 lg:px-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 lg:px-4 py-2.5 rounded-xl mb-1 text-sm transition-all ${
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

        <div className="p-3 lg:p-4 border-t border-border">
          <div className="text-xs text-text-muted mb-2 truncate">{truncateAddress(wallet)}</div>
          <button onClick={logout} className="text-xs text-text-muted hover:text-red transition-colors">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-[220px] lg:ml-[240px] w-full">
        {/* Top header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-bg-primary/80 border-b border-border">
          <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6">
            {/* Mobile logo */}
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

        {/* Page content — extra bottom padding on mobile for nav */}
        <div className="p-4 sm:p-6 pb-24 md:pb-6">{children}</div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-primary/95 backdrop-blur-lg border-t border-border flex z-40 mobile-bottom-nav">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
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
