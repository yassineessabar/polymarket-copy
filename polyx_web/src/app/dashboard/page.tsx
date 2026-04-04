"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { portfolioApi, copyApi, notificationsApi } from "@/lib/api";
import { formatUsd, formatPnl } from "@/lib/utils";
import type { PortfolioSummary, CopyStatus, Notification } from "@/lib/types";

export default function DashboardPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [s, cs, n] = await Promise.all([
        portfolioApi.summary(),
        copyApi.status(),
        notificationsApi.list(false, 8),
      ]);
      setSummary(s);
      setCopyStatus(cs);
      setNotifications(n.notifications);
      setError("");
    } catch (e: any) {
      setError(e.message || "Failed to load data");
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pnl = summary?.daily_pnl || 0;
  const pnlPositive = pnl >= 0;

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Error */}
      {error && (
        <div className="bg-red/10 border border-red/20 text-red text-sm p-3 rounded-xl mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="text-xs underline ml-2">Retry</button>
        </div>
      )}

      {/* Demo badge */}
      {summary?.demo_mode && (
        <div className="bg-accent/10 border border-accent/20 text-accent text-xs sm:text-sm px-3 py-2 rounded-xl mb-5 flex items-center gap-2">
          <span>&#x1F3AE;</span>
          <span><strong>Demo Mode</strong> &mdash; Virtual funds. <Link href="/settings" className="underline">Go live</Link></span>
        </div>
      )}

      {/* Balance Card — the hero of the dashboard */}
      <div className="bg-bg-card border border-border rounded-2xl p-5 sm:p-8 mb-4 text-center">
        <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Total Net Worth</div>
        <div className="text-3xl sm:text-5xl font-bold font-mono tracking-tight mb-1">
          {formatUsd(summary?.net_worth || 0)}
        </div>
        <div className={`text-sm sm:text-base font-mono ${pnlPositive ? "text-green" : "text-red"}`}>
          {formatPnl(pnl)} today
        </div>

        <div className="flex justify-center gap-8 sm:gap-12 mt-6 pt-5 border-t border-border">
          <div>
            <div className="text-lg sm:text-xl font-semibold font-mono">{formatUsd(summary?.balance_usdc || 0)}</div>
            <div className="text-[10px] sm:text-xs text-text-muted mt-0.5">Available</div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-semibold font-mono">{summary?.position_count || 0}</div>
            <div className="text-[10px] sm:text-xs text-text-muted mt-0.5">Positions</div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-semibold font-mono">{summary?.win_rate?.toFixed(0) || 0}%</div>
            <div className="text-[10px] sm:text-xs text-text-muted mt-0.5">Win Rate</div>
          </div>
        </div>
      </div>

      {/* Copy Trading Status — simple single card */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 sm:p-5 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${copyStatus?.active ? "bg-green animate-pulse" : "bg-text-muted"}`} />
          <div>
            <div className="text-sm font-medium">
              {copyStatus?.active ? "Copying" : "Copy Trading Off"}
            </div>
            <div className="text-xs text-text-muted">
              {copyStatus?.target_count || 0} trader{(copyStatus?.target_count || 0) !== 1 ? "s" : ""} &middot; {copyStatus?.open_positions || 0} open
            </div>
          </div>
        </div>
        <Link
          href="/copy-trading"
          className="bg-accent hover:bg-accent-hover text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-xl transition-all"
        >
          {copyStatus?.active ? "Manage" : "Start"}
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Recent Activity</h3>
          {notifications.length > 0 && (
            <Link href="/portfolio" className="text-xs text-accent hover:underline">View all</Link>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-3xl mb-3 opacity-50">&#x1F4AD;</div>
            <p className="text-sm text-text-muted mb-4">No trades yet</p>
            <Link
              href="/copy-trading"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all"
            >
              Pick a trader to copy
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {notifications.map((n) => {
              let text = n.payload;
              try {
                const parsed = JSON.parse(n.payload);
                text = parsed.text || n.payload;
              } catch {}
              // Strip HTML tags for clean display
              const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

              const colors: Record<string, string> = {
                BUY: "text-green",
                SELL: "text-red",
                CLOSE: "text-accent",
              };

              return (
                <div key={n.id} className="flex items-baseline gap-2 py-1.5 border-b border-border last:border-0">
                  <span className={`text-[10px] sm:text-xs font-mono font-semibold w-10 flex-shrink-0 ${colors[n.type] || "text-text-muted"}`}>
                    {n.type}
                  </span>
                  <span className="text-xs sm:text-sm text-text-secondary truncate flex-1">
                    {clean.slice(0, 80)}
                  </span>
                  <span className="text-[10px] text-text-muted flex-shrink-0 hidden sm:block">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
