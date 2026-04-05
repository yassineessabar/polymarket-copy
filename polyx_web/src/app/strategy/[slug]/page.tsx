"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { STRATEGIES, generateEquityData } from "@/lib/strategies";
import { traderApi, userApi } from "@/lib/api";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const TIME_FILTERS = ["1W", "1M", "3M", "6M", "YTD", "1Y", "ALL"] as const;

export default function StrategyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const strategy = STRATEGIES[slug];
  const [timeFilter, setTimeFilter] = useState<string>("ALL");
  const [copied, setCopied] = useState(false);
  const [liveData, setLiveData] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!strategy) return;
    traderApi.one(strategy.wallet).then(setLiveData).catch(() => {});
  }, [strategy]);

  useEffect(() => {
    userApi.me().then((data) => setSettings(data.settings || {})).catch(() => {});
  }, []);

  function updateSetting(key: string, value: any) {
    setSettings((s: any) => ({ ...s, [key]: value }));
  }
  async function saveSettings() {
    setSaving(true);
    try {
      await userApi.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  // Use live equity curve from API, fallback to generated
  const equityData = useMemo(() => {
    if (liveData?.equity_curve && liveData.equity_curve.length > 3) {
      return liveData.equity_curve;
    }
    if (!strategy) return [];
    return generateEquityData(liveData?.roi || strategy.returnPct);
  }, [strategy, liveData]);

  const filteredData = useMemo(() => {
    const filterMap: Record<string, number> = {
      "1W": 7, "1M": 30, "3M": 90, "6M": 180, "YTD": 90, "1Y": 365, "ALL": 9999,
    };
    return equityData.slice(-(filterMap[timeFilter] || 9999));
  }, [equityData, timeFilter]);

  // Use live data if available, fallback to static
  const recentTrades = liveData?.recent_trades || [];
  const holdings = liveData?.top_holdings || [];
  const winRate = liveData?.win_rate ?? strategy?.winRate;
  const totalPnl = liveData?.total_pnl;
  const totalValue = liveData?.total_value;
  const roi = liveData?.roi ?? strategy?.returnPct;
  const copiers = strategy?.copiers;

  if (!strategy) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 text-[#121212]">404</div>
          <h1 className="text-xl font-bold mb-2 text-[#121212]">Strategy Not Found</h1>
          <Link href="/" className="text-[#121212] underline text-sm font-medium">Back to Home</Link>
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

  return (
    <div className="max-w-[900px] mx-auto text-[#121212]">
      {/* Top row — back + title + share */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/strategies" className="flex items-center gap-2 text-[#9B9B9B] hover:text-[#121212] transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span className="text-sm font-medium">Back</span>
        </Link>
        <span className="font-bold text-sm text-[#121212] truncate mx-4">{strategy.name}</span>
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
            className="w-16 flex justify-end"
          >
            <span className="rounded-full bg-[#121212] text-white text-xs font-medium px-3.5 py-1.5">
              {copied ? "Copied!" : "Share"}
            </span>
          </button>
      </div>

      {/* Hero with image */}
      <div className="relative overflow-hidden rounded-2xl mb-4">
        <img alt={strategy.name} src={strategy.image} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
        <div className="relative px-5 sm:px-7 py-8 sm:py-12">
          <div className="flex items-center gap-4 mb-4">
            <img alt={strategy.manager} src={strategy.image} className="w-12 h-12 rounded-full object-cover border-2 border-white/30" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{strategy.name}</h1>
              <div className="flex items-center gap-2 text-sm -tracking-[0.28px] mt-1">
                <span className="text-white/60">by</span>
                <span className="text-white/90 font-medium">{strategy.manager}</span>
                <span className="text-white/30">|</span>
                <a href={`https://polymarket.com/profile/${strategy.wallet}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-white/70 hover:text-white transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white/70"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M8 12l3 3 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-xs font-mono">{strategy.wallet.slice(0, 6)}...{strategy.wallet.slice(-4)}</span>
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-bold font-mono text-white">
              +{strategy.returnPct}%
            </span>
            <span className="text-base sm:text-lg font-medium text-white/60">all time</span>
          </div>
        </div>
      </div>

      <div className="pb-6">
        {/* Stats row — above chart */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "AUM", value: totalValue ? `$${(totalValue).toLocaleString(undefined, {maximumFractionDigits: 0})}` : strategy.aum },
            { label: "Win Rate", value: `${winRate}%` },
            { label: "Total P&L", value: totalPnl !== undefined ? `$${totalPnl.toLocaleString(undefined, {maximumFractionDigits: 0})}` : strategy.profit },
            { label: "Positions", value: liveData?.position_count?.toString() || strategy.trades },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <div className="text-lg sm:text-xl font-bold font-mono text-[#121212]">{stat.value}</div>
              <div className="text-[10px] sm:text-xs text-[#9B9B9B] uppercase tracking-wider mt-1 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 mt-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className={`text-lg font-bold font-mono ${periodReturn >= 0 ? "text-[#009D55]" : "text-[#DC2626]"}`}>
                {periodReturn >= 0 ? "+" : ""}{periodReturn.toFixed(1)}%
              </span>
              <span className="text-xs text-[#9B9B9B] font-medium ml-2">{timeFilter} return</span>
            </div>
            <div className="flex gap-1 bg-[#F7F7F7] rounded-full p-1">
              {TIME_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setTimeFilter(f)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all ${
                    timeFilter === f ? "bg-[#121212] text-white" : "text-[#9B9B9B] hover:text-[#121212]"
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
                    <stop offset="0%" stopColor="#009D55" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#009D55" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis
                  domain={[chartMin * 0.98, chartMax * 1.02]}
                  hide
                />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#121212",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Value"]}
                  labelFormatter={() => ""}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#009D55"
                  strokeWidth={2}
                  fill="url(#equityGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trade Updates — live from Polymarket */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 mt-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-bold text-sm sm:text-base text-[#121212]">Recent Trade Updates</h3>
            {liveData && <span className="w-2 h-2 rounded-full bg-[#009D55] animate-pulse" />}
          </div>
          {recentTrades.length === 0 ? (
            <p className="text-sm text-[#9B9B9B] py-4 text-center">Loading trades...</p>
          ) : (
            <div className="space-y-0">
              {recentTrades.map((trade: any, i: number) => {
                const isBuy = trade.side === "BUY" || trade.action === "BUY";
                const title = trade.title || trade.market || "?";
                const outcome = trade.outcome || "";
                const amount = trade.usdc_size ? `$${trade.usdc_size.toFixed(0)}` : trade.amount || "";
                const date = trade.timestamp ? new Date(trade.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : trade.date || "";
                return (
                  <div key={i} className="flex items-center gap-3 py-3 border-b border-black/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isBuy ? "bg-[#009D55]" : "bg-[#DC2626]"}`} />
                      <span className={`text-[10px] sm:text-xs font-semibold font-mono w-10 flex-shrink-0 ${isBuy ? "text-[#009D55]" : "text-[#DC2626]"}`}>
                        {isBuy ? "BUY" : "SELL"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-medium truncate text-[#121212]">{title}</div>
                      <div className="text-[10px] text-[#9B9B9B]">{outcome}{outcome && amount ? " \u00b7 " : ""}{amount}</div>
                    </div>
                    <span className="text-[10px] sm:text-xs text-[#9B9B9B] flex-shrink-0">{date}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Current Holdings — live from Polymarket */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 mt-4 shadow-sm">
          <h3 className="font-bold text-sm sm:text-base mb-4 text-[#121212]">Current Holdings</h3>
          {holdings.length === 0 ? (
            <p className="text-sm text-[#9B9B9B] py-4 text-center">{liveData ? "No open positions" : "Loading..."}</p>
          ) : (
          <div className="space-y-0">
            {holdings.map((h: any, i: number) => {
              const title = h.title || h.market || "?";
              const outcome = h.outcome || "";
              const value = h.value || 0;
              const pnl = h.pnl || 0;
              const pnlPct = value > 0 && pnl !== 0 ? (pnl / (value - pnl)) * 100 : 0;
              return (
                <div key={i} className="flex items-center justify-between py-3 border-b border-black/5 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-medium truncate text-[#121212]">{title}</div>
                    <div className="text-[10px] text-[#9B9B9B]">{outcome}</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="text-xs sm:text-sm font-mono font-medium text-[#121212]">${value.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                    <div className={`text-[10px] font-mono font-medium ${pnlPct >= 0 ? "text-[#009D55]" : "text-[#DC2626]"}`}>
                      {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Risk Settings */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 mt-4 shadow-sm">
          <h3 className="font-bold text-sm sm:text-base mb-4 text-[#121212]">Risk Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "trade_mode", label: "Trade Mode", type: "select", options: ["cautious", "standard", "expert"] },
              { key: "quickbuy_amount", label: "Default Bet ($)", type: "number" },
              { key: "max_risk_pct", label: "Max Risk (%)", type: "number" },
              { key: "min_bet", label: "Min Bet ($)", type: "number" },
              { key: "max_open_positions", label: "Max Positions", type: "number" },
              { key: "max_per_event", label: "Max per Event", type: "number" },
              { key: "max_exposure_pct", label: "Max Exposure (%)", type: "number" },
              { key: "daily_loss_limit_pct", label: "Daily Loss Limit (%)", type: "number" },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-xs text-[#9B9B9B] mb-1.5 block font-medium">{field.label}</label>
                {field.type === "select" ? (
                  <select
                    value={settings[field.key] || "standard"}
                    onChange={(e) => updateSetting(field.key, e.target.value)}
                    className="w-full bg-[#F7F7F7] border border-black/5 rounded-full px-4 py-2.5 text-[#121212] outline-none focus:border-[#121212] text-sm appearance-none"
                  >
                    {field.options!.map((o) => (
                      <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={settings[field.key] ?? ""}
                    onChange={(e) => updateSetting(field.key, parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#F7F7F7] border border-black/5 rounded-full px-4 py-2.5 text-[#121212] outline-none focus:border-[#121212] text-sm"
                  />
                )}
              </div>
            ))}
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="mt-4 bg-[#121212] hover:bg-[#333] text-white font-medium px-6 py-2.5 rounded-full transition-all disabled:opacity-50 text-sm"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
          </button>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 mt-4 shadow-sm">
          <h3 className="font-bold text-sm sm:text-base mb-3 text-[#121212]">About this Strategy</h3>
          <p className="text-sm text-[#656565] leading-relaxed font-medium">{strategy.desc}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {strategy.categories.map((cat) => (
              <span key={cat} className="bg-[#F7F7F7] text-[#656565] text-[10px] sm:text-xs px-3 py-1.5 rounded-full font-medium">
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action button */}
      <Link
        href={`/invest/${strategy.slug}`}
        className="block w-full bg-[#121212] hover:bg-[#333] text-white font-medium py-3.5 rounded-full transition-all text-center text-sm mt-4"
      >
        Invest in this Strategy
      </Link>
      <a
        href={`https://polymarketanalytics.com/traders/${strategy.wallet}#trades`}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center text-[#009D55] text-xs font-medium mt-3 hover:underline"
      >
        View on Polymarket Analytics
      </a>
    </div>
  );
}
