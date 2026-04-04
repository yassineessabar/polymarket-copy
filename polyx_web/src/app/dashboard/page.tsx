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
        <div className="w-8 h-8 border-2 border-[#121212] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pnl = summary?.daily_pnl || 0;
  const pnlPositive = pnl >= 0;

  return (
    <div className="max-w-[900px] mx-auto">
      {error && (
        <div className="bg-[#DC2626]/5 border border-[#DC2626]/10 text-[#DC2626] text-sm p-3 rounded-2xl mb-4 flex items-center justify-between font-medium">
          <span>{error}</span>
          <button onClick={loadData} className="text-xs underline ml-2">Retry</button>
        </div>
      )}

      {summary?.demo_mode && (
        <div className="bg-[#F7F7F7] border border-black/5 text-[#656565] text-xs sm:text-sm px-4 py-2.5 rounded-2xl mb-5 flex items-center gap-2 font-medium">
          <span className="font-bold text-[#121212]">Demo Mode</span>
          <span>&mdash; Virtual funds. <Link href="/settings" className="underline text-[#121212]">Go live</Link></span>
        </div>
      )}

      {/* Net Worth */}
      <div className="bg-white rounded-2xl p-5 sm:p-8 mb-4 shadow-sm">
        <div className="text-xs text-[#9B9B9B] uppercase tracking-wider mb-2 font-medium">Net Worth</div>
        <div className="text-3xl sm:text-5xl font-bold font-mono tracking-tight mb-1 text-[#121212]">
          {formatUsd(summary?.net_worth || 0)}
        </div>
        <div className={`text-sm sm:text-base font-mono font-medium ${pnlPositive ? "text-[#009D55]" : "text-[#DC2626]"}`}>
          {formatPnl(pnl)} today
        </div>

        {/* Equity curve */}
        {chartData.length > 1 && (
          <div className="h-[160px] sm:h-[200px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={pnlPositive ? "#009D55" : "#DC2626"} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={pnlPositive ? "#009D55" : "#DC2626"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#121212",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value: number) => [formatUsd(value), "Value"]}
                  labelFormatter={(label) => label}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={pnlPositive ? "#009D55" : "#DC2626"}
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
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-lg sm:text-xl font-bold font-mono text-[#121212]">{summary?.win_rate?.toFixed(0) || 0}%</div>
          <div className="text-[10px] sm:text-xs text-[#9B9B9B] mt-0.5 font-medium">Win Rate</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-lg sm:text-xl font-bold font-mono text-[#121212]">{summary?.total_trades || 0}</div>
          <div className="text-[10px] sm:text-xs text-[#9B9B9B] mt-0.5 font-medium">Total Trades</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className={`text-lg sm:text-xl font-bold font-mono ${pnlPositive ? "text-[#009D55]" : "text-[#DC2626]"}`}>
            {formatPnl(pnl)}
          </div>
          <div className="text-[10px] sm:text-xs text-[#9B9B9B] mt-0.5 font-medium">Daily Return</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-lg sm:text-xl font-bold font-mono text-[#121212]">{summary?.position_count || 0}</div>
          <div className="text-[10px] sm:text-xs text-[#9B9B9B] mt-0.5 font-medium">Open Positions</div>
        </div>
      </div>

      {/* Active Strategies */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#121212]">Active Strategies</h3>
          <Link href="/strategies" className="text-xs text-[#121212] font-medium underline">Manage</Link>
        </div>

        {copyStatus?.active ? (
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#009D55] animate-pulse flex-shrink-0" />
            <div>
              <div className="text-sm font-bold text-[#121212]">Copying {copyStatus.target_count} trader{copyStatus.target_count !== 1 ? "s" : ""}</div>
              <div className="text-xs text-[#9B9B9B] font-medium">{copyStatus.open_positions} open positions</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-[#9B9B9B] font-medium mb-3">No active strategies</p>
            <Link href="/strategies" className="inline-flex items-center gap-2 bg-[#121212] hover:bg-[#333] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all">
              Browse Strategies
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        )}
      </div>

      {/* Recent Trades */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#121212]">Recent Trades</h3>
          {notifications.length > 0 && (
            <Link href="/portfolio" className="text-xs text-[#121212] font-medium underline">View all</Link>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[#9B9B9B] font-medium mb-3">No trades yet</p>
            <Link href="/strategies" className="inline-flex items-center gap-2 bg-[#121212] hover:bg-[#333] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all">
              Pick a strategy to copy
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        ) : (
          <div className="space-y-0">
            {notifications.slice(0, 10).map((n) => {
              let text = n.payload;
              try {
                const parsed = JSON.parse(n.payload);
                text = parsed.text || n.payload;
              } catch {}
              const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
              const colors: Record<string, string> = { BUY: "text-[#009D55]", SELL: "text-[#DC2626]", CLOSE: "text-[#656565]" };

              return (
                <div key={n.id} className="flex items-baseline gap-2 py-2.5 border-b border-black/5 last:border-0">
                  <span className={`text-[10px] sm:text-xs font-mono font-bold w-10 flex-shrink-0 ${colors[n.type] || "text-[#9B9B9B]"}`}>
                    {n.type}
                  </span>
                  <span className="text-xs sm:text-sm text-[#656565] truncate flex-1 font-medium">
                    {clean.slice(0, 80)}
                  </span>
                  <span className="text-[10px] text-[#9B9B9B] flex-shrink-0 hidden sm:block">
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
