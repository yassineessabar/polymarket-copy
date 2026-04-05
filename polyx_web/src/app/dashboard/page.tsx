"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { portfolioApi, copyApi, notificationsApi, traderApi } from "@/lib/api";
import { formatUsd, formatPnl } from "@/lib/utils";
import type { PortfolioSummary, CopyStatus, Notification } from "@/lib/types";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type TimePeriod = "1W" | "1M" | "3M" | "ALL";

export default function DashboardPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [perfData, setPerfData] = useState<any[]>([]);
  const [equityPeriod, setEquityPeriod] = useState<TimePeriod>("1M");

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [s, cs, n, perf] = await Promise.all([
        portfolioApi.summary(),
        copyApi.status(),
        notificationsApi.list(false, 10),
        portfolioApi.performance(90).catch(() => ({ daily: [] })),
      ]);
      setSummary(s);
      setCopyStatus(cs);
      setNotifications(n.notifications);
      setPerfData(perf.daily || []);
      setError("");
      // Also load trades and positions as fallback for recent activity
      try {
        const [trades, pos] = await Promise.all([
          portfolioApi.trades(10, 0),
          portfolioApi.positions("open"),
        ]);
        setRecentTrades(trades.trades || []);
        setPositions(pos.positions || []);
      } catch {}
    } catch (e: any) {
      setError(e.message || "Failed to load");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Load once on mount — no interval
  useEffect(() => {
    loadData();
  }, [loadData]);

  const chartData = useMemo(() => {
    if (perfData.length > 0) return perfData;
    // No fake data — show flat line at current balance for new users
    const val = summary?.net_worth || 0;
    const data = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      data.push({ date: d.toISOString().split("T")[0], value: val });
    }
    return data;
  }, [perfData, summary]);

  const equityData = useMemo(() => {
    if (!chartData.length) return [];
    const now = new Date();
    const cutoffs: Record<TimePeriod, number> = {
      "1W": 7,
      "1M": 30,
      "3M": 90,
      "ALL": 99999,
    };
    const days = cutoffs[equityPeriod];
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];
    return chartData.filter((d: any) => equityPeriod === "ALL" || d.date >= cutoffStr);
  }, [chartData, equityPeriod]);

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto">
        {/* Skeleton for hero */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm mb-4 animate-pulse">
          <div className="h-3 w-20 bg-[#F0F0F0] rounded mb-3" />
          <div className="h-10 w-48 bg-[#F0F0F0] rounded mb-6" />
          <div className="h-[140px] bg-[#F7F7F7] rounded-xl" />
        </div>
        {/* Skeleton for stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm animate-pulse">
              <div className="h-5 w-16 bg-[#F0F0F0] rounded mx-auto mb-2" />
              <div className="h-2 w-12 bg-[#F0F0F0] rounded mx-auto" />
            </div>
          ))}
        </div>
        {/* Skeleton for equity curve */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 animate-pulse">
          <div className="h-4 w-24 bg-[#F0F0F0] rounded mb-4" />
          <div className="h-[180px] bg-[#F7F7F7] rounded-xl" />
        </div>
      </div>
    );
  }

  const pnl = summary?.daily_pnl || 0;
  const pnlUp = pnl >= 0;

  return (
    <div className="max-w-[900px] mx-auto">
      {error && (
        <div className="bg-[#DC2626]/5 border border-[#DC2626]/10 text-[#DC2626] text-sm p-3 rounded-2xl mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadData(true)} className="text-xs underline ml-2">Retry</button>
        </div>
      )}

      {summary?.demo_mode && (
        <div className="bg-[#F0F0F0] text-[#121212] text-sm px-4 py-3 rounded-2xl mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">DEMO</span>
            <span><strong>Demo Mode</strong> &mdash; Trading with virtual funds</span>
          </div>
          <Link href="/wallet" className="text-xs font-semibold text-[#121212] underline">Go Live</Link>
        </div>
      )}

      {/* Hero: Net Worth + Chart */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm mb-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-xs font-medium text-[#9B9B9B] uppercase tracking-wider mb-1">Net Worth</p>
            <p className="text-[32px] sm:text-[42px] font-bold -tracking-[1px] text-[#121212] leading-none">
              {formatUsd(summary?.net_worth || 0)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`text-right ${pnlUp ? "text-[#009D55]" : "text-[#DC2626]"}`}>
              <p className="text-lg sm:text-xl font-bold font-mono">{formatPnl(pnl)}</p>
              <p className="text-[10px] font-medium text-[#9B9B9B]">today</p>
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="w-8 h-8 rounded-full bg-[#F7F7F7] hover:bg-[#F0F0F0] flex items-center justify-center transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9B9B9B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={refreshing ? "animate-spin" : ""}
              >
                <path d="M21 12a9 9 0 11-2.63-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
          </div>
        </div>

        {chartData.length > 1 && (
          <div className="h-[140px] sm:h-[180px] mt-4 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={pnlUp ? "#009D55" : "#DC2626"} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={pnlUp ? "#009D55" : "#DC2626"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "14px", fontSize: "12px", color: "#121212", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                  formatter={(v: number) => [formatUsd(v), "Value"]}
                  labelFormatter={(l) => l}
                />
                <Area type="monotone" dataKey="value" stroke={pnlUp ? "#009D55" : "#DC2626"} strokeWidth={2} fill="url(#dGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Balance", value: formatUsd(summary?.balance_usdc || 0) },
          { label: "Win Rate", value: `${summary?.win_rate?.toFixed(0) || 0}%` },
          { label: "Trades", value: String(summary?.total_trades || 0) },
          { label: "Positions", value: String(summary?.position_count || 0) },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm text-center">
            <p className="text-sm sm:text-lg font-bold font-mono text-[#121212] truncate">{s.value}</p>
            <p className="text-[9px] sm:text-[10px] text-[#9B9B9B] uppercase tracking-wider mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Equity Curve */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#121212]">Equity Curve</h3>
          <div className="flex gap-1">
            {(["1W", "1M", "3M", "ALL"] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setEquityPeriod(period)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                  equityPeriod === period
                    ? "bg-[#121212] text-white"
                    : "bg-[#F7F7F7] text-[#9B9B9B] hover:bg-[#F0F0F0] hover:text-[#656565]"
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[180px]">
          {equityData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#009D55" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#009D55" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#9B9B9B" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  tickFormatter={(d: string) => {
                    const date = new Date(d);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis
                  hide
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid rgba(0,0,0,0.06)",
                    borderRadius: "14px",
                    fontSize: "12px",
                    color: "#121212",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                  formatter={(v: number) => [formatUsd(v), "Equity"]}
                  labelFormatter={(l) => l}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#009D55"
                  strokeWidth={2}
                  fill="url(#eqGrad)"
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0, fill: "#009D55" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-[#9B9B9B]">
              Not enough data for this period
            </div>
          )}
        </div>
      </div>

      {/* Two-column: Strategies + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        {/* Active Strategies */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#121212]">Active Strategies</h3>
            <Link href="/strategies" className="text-xs font-medium text-[#9B9B9B] hover:text-[#121212]">Manage</Link>
          </div>
          {copyStatus?.active ? (
            <div className="flex items-center gap-3 p-3 bg-[#F7F7F7] rounded-xl">
              <div className="w-2.5 h-2.5 rounded-full bg-[#009D55] animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-[#121212]">Copying {copyStatus.target_count} trader{copyStatus.target_count !== 1 ? "s" : ""}</p>
                <p className="text-xs text-[#9B9B9B]">{copyStatus.open_positions} open positions</p>
              </div>
              <Link href="/portfolio" className="text-xs font-medium text-[#121212] bg-white border border-black/8 rounded-full px-3 py-1.5">View</Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-[#9B9B9B] mb-3">No active strategies</p>
              <Link href="/strategies" className="inline-flex items-center gap-2 rounded-full bg-[#121212] text-white text-xs font-medium px-5 py-2.5">
                Browse Strategies
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[#121212] mb-3">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { href: "/strategies", label: "Add Strategy", icon: "M12 4v16m8-8H4" },
              { href: "/wallet", label: "Deposit Funds", icon: "M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4M4 6v12c0 1.1.9 2 2 2h14v-4" },
              { href: "/portfolio", label: "View Positions", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" },
            ].map((a) => (
              <Link key={a.label} href={a.href} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F7F7F7] transition-colors">
                <div className="w-8 h-8 rounded-full bg-[#F0F0F0] flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={a.icon}/></svg>
                </div>
                <span className="text-sm font-medium text-[#121212]">{a.label}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BFBFBF" strokeWidth="2" className="ml-auto"><path d="m9 18 6-6-6-6"/></svg>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity — show notifications, or trades as fallback */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#121212]">Recent Activity</h3>
          {(notifications.length > 0 || recentTrades.length > 0) && (
            <Link href="/notifications" className="text-xs font-medium text-[#9B9B9B] hover:text-[#121212]">View all</Link>
          )}
        </div>
        {notifications.length > 0 ? (
          <div className="space-y-0">
            {notifications.map((n) => {
              let text = n.payload;
              try { text = JSON.parse(n.payload).text || n.payload; } catch {}
              const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
              const isBuy = n.type === "BUY";
              const isSell = n.type === "SELL" || n.type === "CLOSE";
              return (
                <div key={n.id} className="flex items-center gap-3 py-3 border-b border-black/5 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isBuy ? "bg-[#009D55]" : isSell ? "bg-[#DC2626]" : "bg-[#9B9B9B]"}`} />
                  <span className={`text-[10px] sm:text-xs font-bold font-mono w-10 flex-shrink-0 ${isBuy ? "text-[#009D55]" : isSell ? "text-[#DC2626]" : "text-[#9B9B9B]"}`}>{n.type}</span>
                  <span className="text-xs sm:text-sm text-[#656565] truncate flex-1">{clean.slice(0, 80)}</span>
                  <span className="text-[10px] text-[#9B9B9B] flex-shrink-0 hidden sm:block">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : recentTrades.length > 0 ? (
          <div className="space-y-0">
            {recentTrades.map((t: any, i: number) => {
              const isBuy = t.side === "BUY";
              return (
                <div key={t.id || i} className="flex items-center gap-3 py-3 border-b border-black/5 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isBuy ? "bg-[#009D55]" : "bg-[#DC2626]"}`} />
                  <span className={`text-[10px] sm:text-xs font-bold font-mono w-10 flex-shrink-0 ${isBuy ? "text-[#009D55]" : "text-[#DC2626]"}`}>{t.side}</span>
                  <span className="text-xs sm:text-sm text-[#656565] truncate flex-1">
                    {t.amount_usdc ? `$${Number(t.amount_usdc).toFixed(2)}` : ""} {t.is_copy ? "(copy)" : ""} {t.dry_run ? "[demo]" : ""}
                  </span>
                  <span className="text-[10px] text-[#9B9B9B] flex-shrink-0 hidden sm:block">
                    {t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
              );
            })}
          </div>
        ) : positions.length > 0 ? (
          <div className="space-y-0">
            {positions.slice(0, 5).map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 py-3 border-b border-black/5 last:border-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0 bg-[#009D55]" />
                <span className="text-[10px] sm:text-xs font-bold font-mono w-10 flex-shrink-0 text-[#009D55]">OPEN</span>
                <span className="text-xs sm:text-sm text-[#656565] truncate flex-1">{p.title} — {p.outcome}</span>
                <span className="text-[10px] text-[#9B9B9B] flex-shrink-0 font-mono">{formatUsd(p.bet_amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-[#9B9B9B] mb-3">No trades yet</p>
            <Link href="/strategies" className="inline-flex items-center gap-2 rounded-full bg-[#121212] text-white text-xs font-medium px-5 py-2.5">
              Pick a Strategy
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
