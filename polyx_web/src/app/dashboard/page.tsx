"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { portfolioApi, copyApi, notificationsApi, traderApi } from "@/lib/api";
import { formatUsd, formatPnl } from "@/lib/utils";
import type { PortfolioSummary, CopyStatus, Notification } from "@/lib/types";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from "recharts";

type TimePeriod = "1W" | "1M" | "3M" | "YTD" | "ALL";

export default function DashboardPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [perfData, setPerfData] = useState<any[]>([]);
  const [equityPeriod, setEquityPeriod] = useState<TimePeriod>("1M");

  const loadData = useCallback(async () => {
    try {
      const [s, cs, n, perf] = await Promise.all([
        portfolioApi.summary(),
        copyApi.status(),
        notificationsApi.list(false, 5),
        portfolioApi.performance(365).catch(() => ({ daily: [] })),
      ]);
      setSummary(s);
      setCopyStatus(cs);
      setNotifications(n.notifications);
      setPerfData(perf.daily || []);
      setError("");
      try {
        const trades = await portfolioApi.trades(5, 0);
        setRecentTrades(trades.trades || []);
      } catch {}
    } catch (e: any) {
      setError(e.message || "Failed to load");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chartData = useMemo(() => {
    if (perfData.length > 0) return perfData;
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
    let cutoffDate: Date;
    if (equityPeriod === "YTD") {
      cutoffDate = new Date(now.getFullYear(), 0, 1);
    } else if (equityPeriod === "ALL") {
      return chartData;
    } else {
      const days: Record<string, number> = { "1W": 7, "1M": 30, "3M": 90 };
      cutoffDate = new Date();
      cutoffDate.setDate(now.getDate() - days[equityPeriod]);
    }
    const cutoffStr = cutoffDate.toISOString().split("T")[0];
    return chartData.filter((d: any) => d.date >= cutoffStr);
  }, [chartData, equityPeriod]);

  // Compute period return
  const periodReturn = useMemo(() => {
    if (equityData.length < 2) return { amount: 0, pct: 0 };
    const first = equityData[0]?.value || 0;
    const last = equityData[equityData.length - 1]?.value || 0;
    const amount = last - first;
    const pct = first > 0 ? (amount / first) * 100 : 0;
    return { amount, pct };
  }, [equityData]);

  if (loading) {
    return (
      <div className="max-w-[680px] mx-auto pt-8">
        <div className="animate-pulse">
          <div className="h-5 w-24 bg-black/5 rounded mb-3" />
          <div className="h-12 w-56 bg-black/5 rounded mb-2" />
          <div className="h-5 w-40 bg-black/5 rounded mb-8" />
          <div className="h-[200px] bg-black/5 rounded-xl" />
        </div>
      </div>
    );
  }

  const pnl = summary?.daily_pnl || 0;
  const netWorth = summary?.net_worth || 0;
  const isUp = periodReturn.amount >= 0;

  return (
    <div className="max-w-[680px] mx-auto">
      {error && (
        <div className="bg-[#DC2626]/5 text-[#DC2626] text-sm p-3 rounded-xl mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadData()} className="text-xs underline ml-2">Retry</button>
        </div>
      )}

      {/* Section 1: Portfolio Value (hero) */}
      <div className="pt-4 sm:pt-8 mb-8">
        {/* Large portfolio number */}
        <p className="text-[32px] sm:text-[42px] font-bold tracking-tight text-[#121212] leading-none font-mono">
          {formatUsd(netWorth)}
        </p>

        {/* Period return */}
        <p className={`text-base mt-1.5 font-medium ${isUp ? "text-[#009D55]" : "text-[#DC2626]"}`}>
          {isUp ? "+" : ""}{formatPnl(periodReturn.amount)}{" "}
          ({isUp ? "+" : ""}{periodReturn.pct.toFixed(2)}%) {equityPeriod === "1W" ? "this week" : equityPeriod === "1M" ? "this month" : equityPeriod === "3M" ? "3 months" : equityPeriod === "YTD" ? "this year" : "all time"}
        </p>

        {/* Equity chart */}
        {equityData.length > 1 && (
          <div className="h-[200px] mt-6 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isUp ? "#009D55" : "#DC2626"} stopOpacity={0.08} />
                    <stop offset="100%" stopColor={isUp ? "#009D55" : "#DC2626"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "13px",
                    color: "#121212",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    padding: "8px 12px",
                  }}
                  formatter={(v: number) => [formatUsd(v), ""]}
                  labelFormatter={(l) => {
                    const d = new Date(l);
                    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={isUp ? "#009D55" : "#DC2626"}
                  strokeWidth={2}
                  fill="url(#heroGrad)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: isUp ? "#009D55" : "#DC2626" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Time period pills */}
        <div className="flex gap-2 mt-4">
          {(["1W", "1M", "3M", "YTD", "ALL"] as TimePeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setEquityPeriod(period)}
              className={`text-sm px-3 py-1 rounded-full transition-colors ${
                equityPeriod === period
                  ? "bg-[#121212] text-white font-bold"
                  : "text-[#9B9B9B] hover:text-[#121212]"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Section 2: Copying (active strategies) */}
      <div className="mb-8">
        <p className="text-xs text-[#9B9B9B] uppercase tracking-wider font-medium mb-3">Copying</p>

        {copyStatus?.active ? (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            {/* Active copy status row */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#009D55]/10 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#009D55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#121212]">
                  {copyStatus.target_count} trader{copyStatus.target_count !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-[#9B9B9B]">{copyStatus.open_positions} open positions</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-[#009D55] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#009D55] animate-pulse" />
                  Active
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-sm text-[#9B9B9B] mb-4">Start copying top traders</p>
            <Link
              href="/strategies"
              className="inline-flex items-center gap-2 bg-[#121212] text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-[#333] transition-colors"
            >
              Browse Traders
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>

      {/* Section 3: Recent Activity */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-[#9B9B9B] uppercase tracking-wider font-medium">Activity</p>
          {(notifications.length > 0 || recentTrades.length > 0) && (
            <Link href="/notifications" className="text-xs text-[#9B9B9B] hover:text-[#121212] transition-colors">
              See all
            </Link>
          )}
        </div>

        {notifications.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {notifications.slice(0, 5).map((n) => {
              let text = n.payload;
              try { text = JSON.parse(n.payload).text || n.payload; } catch {}
              const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
              const isBuy = n.type === "BUY";
              const isSell = n.type === "SELL" || n.type === "CLOSE";
              return (
                <div key={n.id} className="flex items-center gap-3 py-3 px-4 border-b border-black/5 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isBuy ? "bg-[#009D55]" : isSell ? "bg-[#DC2626]" : "bg-[#9B9B9B]"}`} />
                  <span className="text-sm text-[#121212] flex-1 truncate">{clean.slice(0, 80)}</span>
                  <span className="text-xs text-[#9B9B9B] flex-shrink-0">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : recentTrades.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {recentTrades.slice(0, 5).map((t: any, i: number) => {
              const isBuy = t.side === "BUY";
              return (
                <div key={t.id || i} className="flex items-center gap-3 py-3 px-4 border-b border-black/5 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isBuy ? "bg-[#009D55]" : "bg-[#DC2626]"}`} />
                  <span className="text-sm text-[#121212] flex-1 truncate">
                    {t.side} {t.amount_usdc ? `$${Number(t.amount_usdc).toFixed(2)}` : ""} {t.is_copy ? "(copy)" : ""}
                  </span>
                  <span className="text-xs text-[#9B9B9B] flex-shrink-0">
                    {t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm py-8 text-center">
            <p className="text-sm text-[#9B9B9B] mb-4">No trades yet</p>
            <Link
              href="/strategies"
              className="inline-flex items-center gap-2 bg-[#121212] text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-[#333] transition-colors"
            >
              Pick a Strategy
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
