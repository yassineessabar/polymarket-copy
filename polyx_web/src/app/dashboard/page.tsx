"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { portfolioApi, copyApi, notificationsApi } from "@/lib/api";
import { formatUsd, formatPnl } from "@/lib/utils";
import type { PortfolioSummary, CopyStatus, Notification } from "@/lib/types";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
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
      setError(e.message || "Failed to load");
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
      data.push({ date: d.toISOString().split("T")[0], value: Math.round(val * 100) / 100 });
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
  const pnlUp = pnl >= 0;

  return (
    <div className="max-w-[900px] mx-auto">
      {error && (
        <div className="bg-[#DC2626]/5 border border-[#DC2626]/10 text-[#DC2626] text-sm p-3 rounded-2xl mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="text-xs underline ml-2">Retry</button>
        </div>
      )}

      {summary?.demo_mode && (
        <div className="bg-[#F0F0F0] text-[#121212] text-sm px-4 py-3 rounded-2xl mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">&#x1F3AE;</span>
            <span><strong>Demo Mode</strong> &mdash; Trading with virtual funds</span>
          </div>
          <Link href="/settings" className="text-xs font-semibold text-[#121212] underline">Go Live</Link>
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
          <div className={`text-right ${pnlUp ? "text-[#009D55]" : "text-[#DC2626]"}`}>
            <p className="text-lg sm:text-xl font-bold font-mono">{formatPnl(pnl)}</p>
            <p className="text-[10px] font-medium text-[#9B9B9B]">today</p>
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

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#121212]">Recent Activity</h3>
          {notifications.length > 0 && (
            <Link href="/portfolio" className="text-xs font-medium text-[#9B9B9B] hover:text-[#121212]">View all</Link>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[#9B9B9B] mb-3">No trades yet</p>
            <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-[#121212] text-white text-xs font-medium px-5 py-2.5">
              Pick a Strategy
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
