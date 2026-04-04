"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useMemo } from "react";
import { STRATEGIES, generateEquityData, generateRecentTrades, generateHoldings } from "@/lib/strategies";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const TIME_FILTERS = ["1W", "1M", "3M", "6M", "YTD", "1Y", "ALL"] as const;

export default function StrategyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const strategy = STRATEGIES[slug];
  const [timeFilter, setTimeFilter] = useState<string>("ALL");

  const equityData = useMemo(() => {
    if (!strategy) return [];
    return generateEquityData(strategy.returnPct);
  }, [strategy]);

  const filteredData = useMemo(() => {
    const filterMap: Record<string, number> = {
      "1W": 7,
      "1M": 30,
      "3M": 90,
      "6M": 180,
      "YTD": 90,
      "1Y": 180,
      "ALL": 180,
    };
    const points = filterMap[timeFilter] || 180;
    return equityData.slice(-points);
  }, [equityData, timeFilter]);

  const recentTrades = useMemo(() => {
    if (!strategy) return [];
    return generateRecentTrades(strategy);
  }, [strategy]);

  const holdings = useMemo(() => {
    if (!strategy) return [];
    return generateHoldings(strategy);
  }, [strategy]);

  if (!strategy) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">404</div>
          <h1 className="text-xl font-semibold mb-2">Strategy Not Found</h1>
          <Link href="/" className="text-accent hover:underline text-sm">Back to Home</Link>
        </div>
      </div>
    );
  }

  const chartMin = Math.min(...filteredData.map((d) => d.value));
  const chartMax = Math.max(...filteredData.map((d) => d.value));
  const startVal = filteredData[0]?.value || 1000;
  const endVal = filteredData[filteredData.length - 1]?.value || 1000;
  const periodReturn = ((endVal - startVal) / startVal) * 100;

  return (
    <div className="min-h-screen bg-bg-primary text-white">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[rgba(14,15,17,0.85)] border-b border-border">
        <div className="max-w-[1000px] mx-auto flex items-center justify-between h-[56px] sm:h-[64px] px-4 sm:px-7">
          <Link href="/" className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span className="text-sm">Back</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center font-bold text-xs text-white">X</div>
            <span className="font-display font-semibold text-sm">PolyX</span>
          </Link>
        </div>
      </nav>

      {/* Hero with gradient */}
      <div className={`bg-gradient-to-br ${strategy.gradient} relative`}>
        <div className="max-w-[1000px] mx-auto px-4 sm:px-7 py-8 sm:py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl sm:text-5xl">{strategy.emoji}</div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">{strategy.name}</h1>
              <p className="text-white/70 text-sm">by {strategy.manager}</p>
            </div>
          </div>
          <div className="text-4xl sm:text-5xl font-bold font-mono text-white">
            +{strategy.returnPct}%
            <span className="text-base sm:text-lg font-normal text-white/60 ml-2">all time</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-7 pb-32">
        {/* Chart */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 sm:p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className={`text-lg font-semibold font-mono ${periodReturn >= 0 ? "text-green" : "text-red"}`}>
                {periodReturn >= 0 ? "+" : ""}{periodReturn.toFixed(1)}%
              </span>
              <span className="text-xs text-text-muted ml-2">{timeFilter} return</span>
            </div>
            <div className="flex gap-1 bg-bg-secondary rounded-lg p-0.5">
              {TIME_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setTimeFilter(f)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all ${
                    timeFilter === f ? "bg-accent text-white" : "text-text-muted hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[240px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2850ee" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2850ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" hide />
                <YAxis
                  domain={[chartMin * 0.98, chartMax * 1.02]}
                  hide
                />
                <Tooltip
                  contentStyle={{
                    background: "#16181c",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#fff",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Value"]}
                  labelFormatter={() => ""}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2850ee"
                  strokeWidth={2}
                  fill="url(#equityGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: "AUM", value: strategy.aum },
            { label: "Win Rate", value: `${strategy.winRate}%` },
            { label: "Copiers", value: strategy.copiers.toLocaleString() },
            { label: "Avg Trade", value: strategy.avgTradeSize },
          ].map((stat) => (
            <div key={stat.label} className="bg-bg-card border border-border rounded-2xl p-4 text-center">
              <div className="text-lg sm:text-xl font-semibold font-mono">{stat.value}</div>
              <div className="text-[10px] sm:text-xs text-text-muted uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Trade Updates */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 sm:p-6 mt-4">
          <h3 className="font-semibold text-sm sm:text-base mb-4">Recent Trade Updates</h3>
          <div className="space-y-2">
            {recentTrades.map((trade, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                <span className={`text-[10px] sm:text-xs font-semibold font-mono w-10 flex-shrink-0 ${trade.action === "BUY" ? "text-green" : "text-red"}`}>
                  {trade.action}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm truncate">{trade.market}</div>
                  <div className="text-[10px] text-text-muted">{trade.outcome} &middot; {trade.amount}</div>
                </div>
                <span className="text-[10px] sm:text-xs text-text-muted flex-shrink-0">{trade.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Holdings */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 sm:p-6 mt-4">
          <h3 className="font-semibold text-sm sm:text-base mb-4">Current Holdings</h3>
          <div className="space-y-2">
            {holdings.map((h, i) => {
              const pnlPct = ((h.current - h.entry) / h.entry) * 100;
              return (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm truncate">{h.market}</div>
                    <div className="text-[10px] text-text-muted">{h.outcome} &middot; Entry: {(h.entry * 100).toFixed(0)}c &middot; {h.size}</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="text-xs sm:text-sm font-mono">{(h.current * 100).toFixed(0)}c</div>
                    <div className={`text-[10px] font-mono ${pnlPct >= 0 ? "text-green" : "text-red"}`}>
                      {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* About */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 sm:p-6 mt-4">
          <h3 className="font-semibold text-sm sm:text-base mb-3">About this Strategy</h3>
          <p className="text-sm text-text-secondary leading-relaxed">{strategy.desc}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {strategy.categories.map((cat) => (
              <span key={cat} className="bg-bg-secondary border border-border text-text-secondary text-[10px] sm:text-xs px-3 py-1 rounded-full">
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-bg-primary/95 backdrop-blur-xl border-t border-border">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-7 py-3 sm:py-4 flex gap-3">
          <Link
            href={`/invest/${strategy.slug}`}
            className="flex-1 bg-accent hover:bg-accent-hover text-white font-medium py-3 sm:py-3.5 rounded-xl transition-all text-center text-sm sm:text-base"
          >
            Invest in this Strategy
          </Link>
          <Link
            href={`/invest/${strategy.slug}?demo=1`}
            className="flex-1 bg-bg-card border border-border hover:border-border-hover text-white font-medium py-3 sm:py-3.5 rounded-xl transition-all text-center text-sm sm:text-base"
          >
            Demo this Strategy
          </Link>
        </div>
      </div>
    </div>
  );
}
