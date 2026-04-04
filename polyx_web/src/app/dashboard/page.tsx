"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { portfolioApi, copyApi, notificationsApi } from "@/lib/api";
import { formatUsd, formatPnl } from "@/lib/utils";
import type { PortfolioSummary, CopyStatus, Notification } from "@/lib/types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [perfData, setPerfData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [s, cs, n, perf] = await Promise.all([
        portfolioApi.summary(),
        copyApi.status(),
        notificationsApi.list(false, 10),
        portfolioApi.performance(30).catch(() => ({ daily: [] })),
      ]);
      setSummary(s);
      setCopyStatus(cs);
      setNotifications(n.notifications);
      setPerfData(perf.daily || []);
      setError("");
    } catch (e: any) {
      setError(e.message || "Failed to load data");
    }
    setLoading(false);
  }

  // Generate fallback chart data if no perf data
  const chartData = useMemo(() => {
    if (perfData.length > 0) return perfData;
    const data = [];
    let val = summary?.net_worth || 1000;
    for (let i = 30; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      data.push({
        date: d.toISOString().split("T")[0],
        value: Math.round(val * 100) / 100,
      });
      val += (Math.random() - 0.45) * (val * 0.02);
    }
    return data;
  }, [perfData, summary]);

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
    <div className="max-w-[900px] mx-auto">
      {error && (
        <div className="bg-red/10 border border-red/20 text-red text-sm p-3 rounded-xl mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="text-xs underline ml-2">Retry</button>
        </div>
      )}

      {summary?.demo_mode && (
        <div className="bg-accent/10 border border-accent/20 text-accent text-xs sm:text-sm px-3 py-2 rounded-xl mb-5 flex items-center gap-2">
          <span className="font-semibold">Demo Mode</span>
          <span className="text-accent/70">&mdash; Virtual funds. <Link href="/settings" className="underline">Go live</Link></span>
        </div>
      )}

      {/* Net Worth */}
      <div className="bg-bg-card border border-border rounded-2xl p-5 sm:p-8 mb-4">
        <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Net Worth</div>
        <div className="text-3xl sm:text-5xl font-bold font-mono tracking-tight mb-1">
          {formatUsd(summary?.net_worth || 0)}
        </div>
        <div className={`text-sm sm:text-base font-mono ${pnlPositive ? "text-green" : "text-red"}`}>
          {formatPnl(pnl)} today
        </div>

        {/* Equity curve */}
        {chartData.length > 1 && (
          <div className="h-[160px] sm:h-[200px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={pnlPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={pnlPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "#16181c",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#fff",
                  }}
                  formatter={(value: number) => [formatUsd(value), "Value"]}
                  labelFormatter={(label) => label}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={pnlPositive ? "#22c55e" : "#ef4444"}
                  strokeWidth={2}
                  fill="url(#dashGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <div className="text-lg sm:text-xl font-semibold font-mono">{summary?.win_rate?.toFixed(0) || 0}%</div>
          <div className="text-[10px] sm:text-xs text-text-muted mt-0.5">Win Rate</div>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <div className="text-lg sm:text-xl font-semibold font-mono">{summary?.total_trades || 0}</div>
          <div className="text-[10px] sm:text-xs text-text-muted mt-0.5">Total Trades</div>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <div className={`text-lg sm:text-xl font-semibold font-mono ${pnlPositive ? "text-green" : "text-red"}`}>
            {formatPnl(pnl)}
          </div>
          <div className="text-[10px] sm:text-xs text-text-muted mt-0.5">Daily Return</div>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <div className="text-lg sm:text-xl font-semibold font-mono">{summary?.position_count || 0}</div>
          <div className="text-[10px] sm:text-xs text-text-muted mt-0.5">Open Positions</div>
        </div>
      </div>

      {/* Active Strategies */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 sm:p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Active Strategies</h3>
          <Link href="/strategies" className="text-xs text-accent hover:underline">Manage</Link>
        </div>

        {copyStatus?.active ? (
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green animate-pulse flex-shrink-0" />
            <div>
              <div className="text-sm font-medium">Copying {copyStatus.target_count} trader{copyStatus.target_count !== 1 ? "s" : ""}</div>
              <div className="text-xs text-text-muted">{copyStatus.open_positions} open positions</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-text-muted mb-3">No active strategies</p>
            <Link href="/strategies" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all">
              Browse Strategies
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        )}
      </div>

      {/* Recent Trades */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Recent Trades</h3>
          {notifications.length > 0 && (
            <Link href="/portfolio" className="text-xs text-accent hover:underline">View all</Link>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-text-muted mb-3">No trades yet</p>
            <Link href="/strategies" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all">
              Pick a strategy to copy
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {notifications.slice(0, 10).map((n) => {
              let text = n.payload;
              try {
                const parsed = JSON.parse(n.payload);
                text = parsed.text || n.payload;
              } catch {}
              const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
              const colors: Record<string, string> = { BUY: "text-green", SELL: "text-red", CLOSE: "text-accent" };

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
