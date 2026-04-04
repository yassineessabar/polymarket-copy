"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { portfolioApi, copyApi, notificationsApi } from "@/lib/api";
import { formatUsd, formatPnl } from "@/lib/utils";
import type { PortfolioSummary, CopyStatus, Notification } from "@/lib/types";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from "recharts";

export default function DashboardPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [perfData, setPerfData] = useState<any[]>([]);
  const [chartRange, setChartRange] = useState<"1D" | "7D" | "30D" | "All">("30D");
  const [autoRedeem, setAutoRedeem] = useState(false);
  const [posTab, setPosTab] = useState<"history" | "open">("history");

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
      <div className="flex items-center justify-center h-[50vh] bg-[#0B0E1C]">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pnl = summary?.daily_pnl || 0;
  const pnlUp = pnl >= 0;
  const totalPnl = summary?.daily_pnl || 0;

  return (
    <div className="max-w-[900px] mx-auto bg-[#0B0E1C] min-h-screen px-4 pt-5 pb-8">
      {error && (
        <div className="bg-[#DC2626]/10 border border-[#DC2626]/20 text-[#DC2626] text-sm p-3 rounded-2xl mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="text-xs underline ml-2">Retry</button>
        </div>
      )}

      {summary?.demo_mode && (
        <div className="bg-[#1A1F35] text-white text-sm px-4 py-3 rounded-2xl mb-5 flex items-center justify-between border border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-base">&#x1F3AE;</span>
            <span><strong>Demo Mode</strong> &mdash; Trading with virtual funds</span>
          </div>
          <Link href="/settings" className="text-xs font-semibold text-[#3B5BFE] underline">Go Live</Link>
        </div>
      )}

      {/* Top Row: Avatar + Username + Portfolio + Cash + Add + Settings */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-12 h-12 rounded-xl bg-[#2D8B4E] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-base">YE</span>
        </div>
        <div className="min-w-0 mr-auto">
          <p className="text-white font-semibold text-sm truncate max-w-[100px]">yassiness...</p>
        </div>
        <div className="text-right">
          <p className="text-[#5A5F7A] text-xs font-medium">Portfolio</p>
          <p className="text-white font-bold text-sm font-mono">{formatUsd(summary?.net_worth || 0)}</p>
        </div>
        <div className="text-right">
          <p className="text-[#5A5F7A] text-xs font-medium">Cash</p>
          <p className="text-white font-bold text-sm font-mono">{formatUsd(summary?.balance_usdc || 0)}</p>
        </div>
        <button className="w-8 h-8 rounded-full bg-[#F5A623] flex items-center justify-center flex-shrink-0 hover:bg-[#E09510] transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
        <Link href="/settings" className="flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A5F7A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </Link>
      </div>

      {/* 24h change */}
      <p className="text-[#5A5F7A] text-xs mb-5 ml-[60px]">+0.0$ 24h</p>

      {/* Equity Chart */}
      <div className="mb-4">
        {chartData.length > 1 && (
          <div className="h-[160px] sm:h-[200px] -mx-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00C853" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00C853" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    background: "#1E2235",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#fff",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  }}
                  formatter={(v: number) => [formatUsd(v), "Value"]}
                  labelFormatter={(l) => l}
                  labelStyle={{ color: "#8B8FA3" }}
                />
                <Area type="monotone" dataKey="value" stroke="#00C853" strokeWidth={2} fill="url(#dGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* PnL below chart */}
        <p className={`text-sm font-bold font-mono mt-2 ${pnlUp ? "text-[#00C853]" : "text-[#DC2626]"}`}>
          {formatPnl(totalPnl)}
        </p>
      </div>

      {/* Time Period Tabs */}
      <div className="flex items-center gap-2 mb-5">
        {(["1D", "7D", "30D", "All"] as const).map((range) => (
          <button
            key={range}
            onClick={() => setChartRange(range)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              chartRange === range
                ? "bg-[#1E2235] text-white"
                : "text-[#5A5F7A] hover:text-[#8B8FA3]"
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total PnL", value: formatPnl(totalPnl), color: totalPnl >= 0 ? "text-[#00C853]" : "text-[#DC2626]" },
          { label: "Copy", value: formatPnl(0), color: "text-[#00C853]" },
          { label: "Manual", value: formatPnl(0), color: "text-[#00C853]" },
          { label: "Win Rate", value: `${summary?.win_rate?.toFixed(0) || 0}%`, color: "text-white" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-[10px] text-[#5A5F7A] uppercase tracking-wider mb-0.5 font-medium">{s.label}</p>
            <p className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* My Rewards Card */}
      <div className="bg-[#141728] rounded-xl p-3 flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-base">&#x1F381;</span>
          <span className="text-white font-medium text-sm">My Rewards</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#8B8FA3] text-sm">$0.00 pending</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A5F7A" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </div>

      {/* Your Positions Section */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-base">Your Positions</h3>
          <div className="flex items-center gap-2">
            <span className="text-[#8B8FA3] text-xs">Auto redeem</span>
            <button
              onClick={() => setAutoRedeem(!autoRedeem)}
              className={`w-9 h-5 rounded-full relative transition-colors ${autoRedeem ? "bg-[#3B5BFE]" : "bg-[#1E2235]"}`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-transform ${autoRedeem ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setPosTab("history")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              posTab === "history" ? "bg-[#1E2235] text-white" : "text-[#5A5F7A] hover:text-[#8B8FA3]"
            }`}
          >
            History
          </button>
          <button
            onClick={() => setPosTab("open")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              posTab === "open" ? "bg-[#1E2235] text-white" : "text-[#5A5F7A] hover:text-[#8B8FA3]"
            }`}
          >
            Open Orders
          </button>
          <button className="bg-[#1E2235] text-[#8B8FA3] text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Syncing...
          </button>
          <button onClick={loadData} className="p-1.5 rounded-lg hover:bg-[#1E2235] transition-colors ml-auto">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A5F7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </button>
        </div>

        {/* Empty State / Positions */}
        {notifications.length === 0 ? (
          <div className="bg-[#141728] rounded-2xl p-8 sm:p-12 text-center border border-white/[0.06]">
            <div className="w-14 h-14 rounded-full bg-[#1E2235] flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5A5F7A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">No Positions Yet</h3>
            <p className="text-sm text-[#5A5F7A] max-w-xs mx-auto leading-relaxed">
              Start trading to see your positions here. Your portfolio will track all your active bets.
            </p>

            {/* Syncing pill */}
            <div className="mt-6 flex justify-center">
              <div className="bg-[#1E2235] text-[#8B8FA3] text-xs font-medium px-4 py-2 rounded-full flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3B5BFE] animate-pulse" />
                Syncing...
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              let text = n.payload;
              try { text = JSON.parse(n.payload).text || n.payload; } catch {}
              const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
              const isBuy = n.type === "BUY";
              const isSell = n.type === "SELL" || n.type === "CLOSE";
              return (
                <div key={n.id} className="flex items-center gap-3 py-3 border-b border-white/[0.06] last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isBuy ? "bg-[#00C853]" : isSell ? "bg-[#DC2626]" : "bg-[#5A5F7A]"}`} />
                  <span className={`text-[10px] sm:text-xs font-bold font-mono w-10 flex-shrink-0 ${isBuy ? "text-[#00C853]" : isSell ? "text-[#DC2626]" : "text-[#5A5F7A]"}`}>{n.type}</span>
                  <span className="text-xs sm:text-sm text-[#8B8FA3] truncate flex-1">{clean.slice(0, 80)}</span>
                  <span className="text-[10px] text-[#5A5F7A] flex-shrink-0 hidden sm:block">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feedback Card */}
      <div className="bg-[#141728] rounded-xl p-4 flex items-center justify-between mb-4 border border-white/[0.06]">
        <div className="flex items-center gap-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B8FA3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <div>
            <p className="text-white font-medium text-sm">Share your feedback</p>
            <p className="text-[#5A5F7A] text-xs">Help us improve Polycool</p>
          </div>
        </div>
        <button className="bg-white text-[#0B0E1C] text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-gray-100 transition-colors">
          Share
        </button>
      </div>

      {/* Social CTAs */}
      <div className="grid grid-cols-2 gap-3">
        <a href="#" className="bg-[#229ED9] rounded-xl p-3 text-white text-sm font-semibold text-center hover:bg-[#1E8FC4] transition-colors flex items-center justify-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
          </svg>
          Telegram
        </a>
        <a href="#" className="bg-[#1E2235] rounded-xl p-3 text-white text-sm font-semibold text-center border border-white/[0.06] hover:bg-[#252A40] transition-colors flex items-center justify-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          X @polycoolapp
        </a>
      </div>
    </div>
  );
}
