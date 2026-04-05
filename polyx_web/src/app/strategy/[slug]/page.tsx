"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { STRATEGIES, generateEquityData } from "@/lib/strategies";
import { traderApi, userApi, copyApi } from "@/lib/api";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const TIME_FILTERS = ["1W", "1M", "3M", "YTD", "ALL"] as const;

export default function StrategyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const strategy = STRATEGIES[slug];
  const [timeFilter, setTimeFilter] = useState<string>("ALL");
  const [copied, setCopied] = useState(false);
  const [liveData, setLiveData] = useState<any>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [walletCopied, setWalletCopied] = useState(false);

  useEffect(() => {
    if (!strategy) return;
    traderApi.one(strategy.wallet).then(setLiveData).catch(() => {});
  }, [strategy]);

  async function addStrategyTarget(wallet: string, name: string) {
    setToggling(wallet);
    try {
      await copyApi.addTarget(wallet, name);
      await copyApi.start();
    } catch {}
    setToggling(null);
  }

  const equityData = useMemo(() => {
    if (liveData?.equity_curve && liveData.equity_curve.length > 3) {
      return liveData.equity_curve;
    }
    if (!strategy) return [];
    return generateEquityData(liveData?.roi || strategy.returnPct);
  }, [strategy, liveData]);

  const filteredData = useMemo(() => {
    const filterMap: Record<string, number> = {
      "1W": 7, "1M": 30, "3M": 90, "YTD": 90, "ALL": 9999,
    };
    return equityData.slice(-(filterMap[timeFilter] || 9999));
  }, [equityData, timeFilter]);

  const recentTrades = liveData?.recent_trades || [];
  const winRate = liveData?.win_rate ?? strategy?.winRate;
  const totalPnl = liveData?.total_pnl;
  const totalValue = liveData?.total_value;
  const roi = liveData?.roi ?? strategy?.returnPct;

  if (!strategy) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 text-[#121212]">404</div>
          <h1 className="text-xl font-bold mb-2 text-[#121212]">Trader Not Found</h1>
          <Link href="/strategies" className="text-[#009D55] font-medium text-sm">Back to Traders</Link>
        </div>
      </div>
    );
  }

  const values = filteredData.map((d: any) => d.value).filter(Boolean);
  const chartMin = values.length > 0 ? Math.min(...values) : 0;
  const chartMax = values.length > 0 ? Math.max(...values) : 1000;
  const startVal = filteredData[0]?.value || 1000;
  const endVal = filteredData[filteredData.length - 1]?.value || 1000;
  const periodReturn = ((endVal - startVal) / startVal) * 100;
  const isPositive = periodReturn >= 0;

  const pnlDisplay = totalPnl !== undefined
    ? `$${Math.abs(totalPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : strategy.profit;

  const positionsCount = liveData?.position_count || strategy.trades;
  const volumeDisplay = totalValue
    ? `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : strategy.aum;

  return (
    <div className="max-w-[600px] mx-auto px-4 pb-32">
      {/* Top bar */}
      <div className="flex items-center justify-between py-3">
        <Link
          href="/strategies"
          className="w-10 h-10 rounded-full hover:bg-[#F4F4F5] flex items-center justify-center transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <button
          onClick={async () => {
            const url = window.location.href;
            const title = `${strategy.name} on PolyX`;
            if (navigator.share) {
              try { await navigator.share({ title, url }); } catch {}
            } else {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }
          }}
          className="w-10 h-10 rounded-full hover:bg-[#F4F4F5] flex items-center justify-center transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
      </div>

      {/* Hero: Name + Return */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#121212]">{strategy.name}</h1>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={`text-xl font-bold font-mono ${isPositive ? "text-[#009D55]" : "text-[#DC2626]"}`}>
            {isPositive ? "+" : ""}{periodReturn.toFixed(1)}%
          </span>
          <span className="text-sm text-[#737373]">{timeFilter}</span>
        </div>
      </div>

      {/* Equity chart */}
      <div className="h-[240px] -mx-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isPositive ? "#009D55" : "#DC2626"} stopOpacity={0.08} />
                <stop offset="100%" stopColor={isPositive ? "#009D55" : "#DC2626"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis domain={[chartMin * 0.98, chartMax * 1.02]} hide />
            <Tooltip
              contentStyle={{
                background: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#121212",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                padding: "8px 12px",
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
              labelFormatter={() => ""}
              cursor={{ stroke: isPositive ? "#009D55" : "#DC2626", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isPositive ? "#009D55" : "#DC2626"}
              strokeWidth={2}
              fill="url(#chartGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Time pills */}
      <div className="flex gap-1 justify-center mt-3 mb-6">
        {TIME_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setTimeFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              timeFilter === f
                ? "bg-[#121212] text-white"
                : "text-[#737373] hover:text-[#121212] hover:bg-[#F4F4F5]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Key stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "PnL",
            value: pnlDisplay,
            color: totalPnl !== undefined ? (totalPnl >= 0 ? "text-[#009D55]" : "text-[#DC2626]") : "text-[#121212]",
          },
          {
            label: "Win Rate",
            value: `${winRate}%`,
            color: "text-[#121212]",
          },
          {
            label: "Positions",
            value: positionsCount,
            color: "text-[#121212]",
          },
          {
            label: "Volume",
            value: volumeDisplay,
            color: "text-[#121212]",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#F4F4F5] rounded-xl p-3">
            <div className="text-xs text-[#737373] mb-1">{stat.label}</div>
            <div className={`text-lg font-bold font-mono ${stat.color} truncate`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* About section */}
      <div className="mb-6">
        <p className="text-xs text-[#737373] uppercase tracking-wider font-medium mb-3">About</p>
        <div className="bg-white rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={strategy.image}
              alt={strategy.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="text-base font-medium text-[#121212]">{strategy.name}</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#737373] font-mono">
                  {strategy.wallet.slice(0, 6)}...{strategy.wallet.slice(-4)}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(strategy.wallet);
                    setWalletCopied(true);
                    setTimeout(() => setWalletCopied(false), 2000);
                  }}
                  className="text-[#737373] hover:text-[#121212] transition-colors"
                >
                  {walletCopied ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#009D55" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                  )}
                </button>
              </div>
            </div>
          </div>
          <p className="text-sm text-[#737373] leading-relaxed mb-4">
            {strategy.desc}
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {strategy.categories.map((cat) => (
              <span
                key={cat}
                className="bg-[#F4F4F5] text-[#737373] text-xs px-3 py-1 rounded-full font-medium"
              >
                {cat}
              </span>
            ))}
          </div>
          <div className="flex gap-4">
            <a
              href={`https://polymarket.com/profile/${strategy.wallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#009D55] font-medium hover:underline"
            >
              View on Polymarket
            </a>
            <a
              href={`https://polymarketanalytics.com/traders/${strategy.wallet}#trades`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#009D55] font-medium hover:underline"
            >
              View Analytics
            </a>
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="mb-6">
        <p className="text-xs text-[#737373] uppercase tracking-wider font-medium mb-3">
          Recent Trades
        </p>
        <div className="bg-white rounded-xl">
          {recentTrades.length === 0 ? (
            <p className="text-sm text-[#737373] py-6 text-center">Loading trades...</p>
          ) : (
            <div>
              {recentTrades.slice(0, 5).map((trade: any, i: number) => {
                const isBuy = trade.side === "BUY" || trade.action === "BUY";
                const title = trade.title || trade.market || "Unknown";
                const date = trade.timestamp
                  ? (() => {
                      const ms = Date.now() - new Date(trade.timestamp).getTime();
                      const mins = Math.floor(ms / 60000);
                      if (mins < 60) return `${mins}m ago`;
                      const hrs = Math.floor(mins / 60);
                      if (hrs < 24) return `${hrs}h ago`;
                      const days = Math.floor(hrs / 24);
                      return `${days}d ago`;
                    })()
                  : trade.date || "";
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i < Math.min(recentTrades.length, 5) - 1 ? "border-b border-[#F4F4F5]" : ""
                    }`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        isBuy ? "bg-[#009D55]" : "bg-[#DC2626]"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#121212] truncate">{title}</div>
                    </div>
                    <span className="text-xs text-[#737373] flex-shrink-0">{date}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-[#F4F4F5] sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:mt-4">
        <div className="max-w-[600px] mx-auto">
          <button
            onClick={() => addStrategyTarget(strategy.wallet, strategy.name)}
            disabled={toggling === strategy.wallet}
            className="w-full bg-[#009D55] hover:bg-[#008548] text-white rounded-full h-14 text-base font-bold transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {toggling === strategy.wallet
              ? "Starting..."
              : `Invest in ${strategy.name}`}
          </button>
        </div>
      </div>
    </div>
  );
}
