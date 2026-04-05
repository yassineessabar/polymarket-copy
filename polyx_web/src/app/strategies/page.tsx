"use client";

import { useEffect, useState, useMemo } from "react";
import { copyApi, traderApi, userApi } from "@/lib/api";
import { STRATEGY_LIST, STRATEGIES, generateEquityData } from "@/lib/strategies";
import { formatUsd } from "@/lib/utils";
import type { CopyTarget } from "@/lib/types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const TIME_FILTERS = ["1W", "1M", "3M", "6M", "YTD", "1Y", "ALL"] as const;

export default function StrategiesPage() {
  const [targets, setTargets] = useState<CopyTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customWallet, setCustomWallet] = useState("");
  const [customName, setCustomName] = useState("");
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [traderData, setTraderData] = useState<any>(null);
  const [loadingTrader, setLoadingTrader] = useState(false);
  const [timeFilter, setTimeFilter] = useState<string>("ALL");
  const [settings, setSettings] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadTargets();
    userApi.me().then((data) => setSettings(data.settings || {})).catch(() => {});
  }, []);

  async function loadTargets() {
    try {
      const data = await copyApi.targets();
      setTargets(data.targets);
    } catch {}
    setLoading(false);
  }

  async function addCustomTarget() {
    if (!customWallet.startsWith("0x") || customWallet.length < 10) return;
    setAdding(true);
    try {
      await copyApi.addTarget(customWallet, customName || "Custom Trader");
      await loadTargets();
      setShowAddModal(false);
      setCustomWallet("");
      setCustomName("");
    } catch {}
    setAdding(false);
  }

  async function addStrategyTarget(wallet: string, name: string) {
    setToggling(wallet);
    try {
      await copyApi.addTarget(wallet, name);
      await copyApi.start();
      await loadTargets();
    } catch {}
    setToggling(null);
  }

  async function removeTarget(wallet: string) {
    setToggling(wallet);
    try {
      await copyApi.removeTarget(wallet);
      await loadTargets();
    } catch {}
    setToggling(null);
  }

  async function toggleExpand(slug: string, wallet: string) {
    if (expandedSlug === slug) {
      setExpandedSlug(null);
      setTraderData(null);
      return;
    }
    setExpandedSlug(slug);
    setTimeFilter("ALL");
    setLoadingTrader(true);
    setTraderData(null);
    try {
      const data = await traderApi.one(wallet);
      setTraderData(data);
    } catch {
      setTraderData(null);
    }
    setLoadingTrader(false);
  }

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

  const activeWallets = new Set(targets.map((t) => t.wallet_addr.toLowerCase()));

  return (
    <div className="max-w-[900px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-4 sm:mb-6 text-[#121212]">Strategies</h1>

      {/* Your Active Strategies */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm sm:text-base text-[#121212]">Your Active Strategies</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs text-[#121212] font-medium underline"
          >
            + Add Custom
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-6 h-6 border-2 border-[#121212] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : targets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[#9B9B9B] font-medium mb-3">No active strategies yet</p>
            <p className="text-xs text-[#9B9B9B] font-medium">Pick a strategy below to start copying</p>
          </div>
        ) : (
          <div className="space-y-0">
            {targets.map((t) => {
              const strat = Object.values(STRATEGIES).find(
                (s) => s.wallet.toLowerCase() === t.wallet_addr.toLowerCase()
              );
              return (
                <div key={t.id} className="flex items-center justify-between py-3 border-b border-black/5 last:border-0">
                  <div className="flex items-center gap-3">
                    {strat && (
                      <img src={strat.image} alt={strat.name} className="w-9 h-9 rounded-xl object-cover" />
                    )}
                    <div>
                      <div className="text-sm font-bold text-[#121212]">{t.display_name || t.wallet_addr.slice(0, 10)}</div>
                      <div className="text-[10px] text-[#9B9B9B] font-mono font-medium">
                        {t.wallet_addr.slice(0, 8)}...{t.wallet_addr.slice(-6)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeTarget(t.wallet_addr)}
                    disabled={toggling === t.wallet_addr}
                    className="text-xs text-[#DC2626] font-medium hover:underline disabled:opacity-50"
                  >
                    {toggling === t.wallet_addr ? "..." : "Stop"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Discover Strategies */}
      <div>
        <h2 className="font-bold text-sm sm:text-base mb-4 text-[#121212]">Discover Strategies</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STRATEGY_LIST.map((s) => {
            const isActive = activeWallets.has(s.wallet.toLowerCase());
            const isExpanded = expandedSlug === s.slug;
            return (
              <div
                key={s.slug}
                className={`bg-white rounded-2xl overflow-hidden shadow-sm transition-all ${
                  isExpanded ? "sm:col-span-2 ring-2 ring-[#121212]" : "hover:shadow-md"
                }`}
              >
                {/* Card Header */}
                <button
                  onClick={() => toggleExpand(s.slug, s.wallet)}
                  className="block w-full h-36 sm:h-40 relative overflow-hidden text-left"
                >
                  <img
                    src={s.image}
                    alt={s.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {s.featured && (
                    <div className="absolute top-2.5 right-2.5 bg-white/90 text-[#121212] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Featured
                    </div>
                  )}
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <div className="flex items-center gap-2">
                      <img src={s.image} alt={s.manager} className="w-8 h-8 rounded-full object-cover border-2 border-white/30" />
                      <span className="text-white text-sm font-bold drop-shadow-sm">{s.name}</span>
                    </div>
                    <span className="text-white/90 font-bold font-mono text-xs bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5">+{s.returnPct}%</span>
                  </div>
                </button>

                {/* Card Summary (always visible) */}
                {!isExpanded && (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <button
                        onClick={() => toggleExpand(s.slug, s.wallet)}
                        className="font-bold text-sm text-[#121212] hover:underline transition-colors text-left"
                      >
                        {s.name}
                      </button>
                      <span className="text-[#009D55] font-bold font-mono text-xs">+{s.returnPct}%</span>
                    </div>
                    <p className="text-[10px] text-[#9B9B9B] font-medium mb-3">
                      {s.winRate}% win &middot; {s.copiers} copiers &middot; {s.trades} trades
                    </p>
                    {isActive ? (
                      <div className="flex items-center gap-2 text-[#009D55] text-xs font-bold">
                        <span className="w-2 h-2 bg-[#009D55] rounded-full animate-pulse" />
                        Active
                      </div>
                    ) : (
                      <button
                        onClick={() => addStrategyTarget(s.wallet, s.name)}
                        disabled={toggling === s.wallet}
                        className="w-full bg-[#121212] hover:bg-[#333] text-white text-xs font-medium py-2.5 rounded-full transition-all disabled:opacity-50"
                      >
                        {toggling === s.wallet ? "Adding..." : "Start Copying"}
                      </button>
                    )}
                  </div>
                )}

                {/* FULL Inline Detail Panel */}
                {isExpanded && (
                  <ExpandedStrategyDetail
                    strategy={s}
                    traderData={traderData}
                    loadingTrader={loadingTrader}
                    isActive={isActive}
                    toggling={toggling}
                    timeFilter={timeFilter}
                    setTimeFilter={setTimeFilter}
                    settings={settings}
                    updateSetting={updateSetting}
                    saveSettings={saveSettings}
                    saving={saving}
                    saved={saved}
                    onStartCopying={() => addStrategyTarget(s.wallet, s.name)}
                    onClose={() => { setExpandedSlug(null); setTraderData(null); }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Custom Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[420px] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-[#121212]">Add Custom Wallet</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#9B9B9B] hover:text-[#121212]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-sm text-[#9B9B9B] font-medium mb-4">
              Paste any Polymarket wallet address to start copying their trades.
            </p>
            <input
              type="text"
              placeholder="0x..."
              value={customWallet}
              onChange={(e) => setCustomWallet(e.target.value)}
              className="w-full bg-[#F7F7F7] border border-black/5 rounded-full px-5 py-3 text-[#121212] placeholder-[#BFBFBF] outline-none focus:border-[#121212] transition-colors mb-3"
            />
            <input
              type="text"
              placeholder="Display name (optional)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full bg-[#F7F7F7] border border-black/5 rounded-full px-5 py-3 text-[#121212] placeholder-[#BFBFBF] outline-none focus:border-[#121212] transition-colors mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 border border-[#121212] text-[#121212] font-medium py-2.5 rounded-full transition-all text-sm hover:bg-[#F7F7F7]"
              >
                Cancel
              </button>
              <button
                onClick={addCustomTarget}
                disabled={adding || !customWallet.startsWith("0x")}
                className="flex-1 bg-[#121212] hover:bg-[#333] text-white font-medium py-2.5 rounded-full transition-all disabled:opacity-50 text-sm"
              >
                {adding ? "Adding..." : "Add Target"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Full inline strategy detail (mirrors /strategy/[slug] content)    */
/* ------------------------------------------------------------------ */

function ExpandedStrategyDetail({
  strategy,
  traderData,
  loadingTrader,
  isActive,
  toggling,
  timeFilter,
  setTimeFilter,
  settings,
  updateSetting,
  saveSettings,
  saving,
  saved,
  onStartCopying,
  onClose,
}: {
  strategy: any;
  traderData: any;
  loadingTrader: boolean;
  isActive: boolean;
  toggling: string | null;
  timeFilter: string;
  setTimeFilter: (f: string) => void;
  settings: any;
  updateSetting: (key: string, value: any) => void;
  saveSettings: () => void;
  saving: boolean;
  saved: boolean;
  onStartCopying: () => void;
  onClose: () => void;
}) {
  const winRate = traderData?.win_rate ?? strategy.winRate;
  const totalPnl = traderData?.total_pnl;
  const totalValue = traderData?.total_value;
  const recentTrades = traderData?.recent_trades || [];
  const holdings = traderData?.top_holdings || [];

  const equityData = useMemo(() => {
    if (traderData?.equity_curve && traderData.equity_curve.length > 3) {
      return traderData.equity_curve;
    }
    return generateEquityData(traderData?.roi || strategy.returnPct);
  }, [strategy, traderData]);

  const filteredData = useMemo(() => {
    const filterMap: Record<string, number> = {
      "1W": 7, "1M": 30, "3M": 90, "6M": 180, "YTD": 90, "1Y": 365, "ALL": 9999,
    };
    return equityData.slice(-(filterMap[timeFilter] || 9999));
  }, [equityData, timeFilter]);

  const values = filteredData.map((d: any) => d.value).filter(Boolean);
  const chartMin = values.length > 0 ? Math.min(...values) : 0;
  const chartMax = values.length > 0 ? Math.max(...values) : 1000;
  const startVal = filteredData[0]?.value || 1000;
  const endVal = filteredData[filteredData.length - 1]?.value || 1000;
  const periodReturn = ((endVal - startVal) / startVal) * 100;

  if (loadingTrader) {
    return (
      <div className="p-6 bg-[#F7F7F7]">
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#121212] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F7F7F7]">
      {/* Hero image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={strategy.image}
          alt={strategy.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
        <div className="relative px-5 py-6 flex flex-col justify-end h-full">
          <div className="flex items-center gap-3 mb-2">
            <img
              src={strategy.image}
              alt={strategy.manager}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
            />
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">{strategy.name}</h3>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-white/60">by</span>
                <span className="text-white/90 font-medium">{strategy.manager}</span>
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white">+{strategy.returnPct}%</span>
            <span className="text-sm font-medium text-white/60">all time</span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "AUM", value: totalValue ? `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : strategy.aum },
            { label: "Win Rate", value: `${winRate}%` },
            { label: "Total P&L", value: totalPnl !== undefined ? `$${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : strategy.profit },
            { label: "Positions", value: traderData?.position_count?.toString() || strategy.trades },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-3 text-center">
              <div className="text-sm sm:text-base font-bold font-mono text-[#121212]">{stat.value}</div>
              <div className="text-[10px] text-[#9B9B9B] uppercase tracking-wider mt-0.5 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Equity Chart */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className={`text-base font-bold font-mono ${periodReturn >= 0 ? "text-[#009D55]" : "text-[#DC2626]"}`}>
                {periodReturn >= 0 ? "+" : ""}{periodReturn.toFixed(1)}%
              </span>
              <span className="text-[10px] text-[#9B9B9B] font-medium ml-1.5">{timeFilter} return</span>
            </div>
            <div className="flex gap-0.5 bg-[#F7F7F7] rounded-full p-0.5">
              {TIME_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setTimeFilter(f)}
                  className={`px-2 py-1 rounded-full text-[9px] sm:text-[10px] font-medium transition-all ${
                    timeFilter === f ? "bg-[#121212] text-white" : "text-[#9B9B9B] hover:text-[#121212]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id={`eqGrad-${strategy.slug}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#009D55" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#009D55" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis domain={[chartMin * 0.98, chartMax * 1.02]} hide />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: "12px",
                    fontSize: "11px",
                    color: "#121212",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value: number) => [`$${Number(value).toFixed(2)}`, "Value"]}
                  labelFormatter={() => ""}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#009D55"
                  strokeWidth={2}
                  fill={`url(#eqGrad-${strategy.slug})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <h4 className="font-bold text-sm text-[#121212]">Recent Trades</h4>
            {traderData && <span className="w-2 h-2 rounded-full bg-[#009D55] animate-pulse" />}
          </div>
          {recentTrades.length === 0 ? (
            <p className="text-xs text-[#9B9B9B] py-3 text-center">{traderData ? "No recent trades" : "Loading trades..."}</p>
          ) : (
            <div className="space-y-0">
              {recentTrades.slice(0, 6).map((trade: any, i: number) => {
                const isBuy = trade.side === "BUY" || trade.action === "BUY";
                const title = trade.title || trade.market || "Trade";
                const outcome = trade.outcome || "";
                const amount = trade.usdc_size ? `$${trade.usdc_size.toFixed(0)}` : trade.amount || "";
                const date = trade.timestamp
                  ? new Date(trade.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : trade.date || "";
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-black/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isBuy ? "bg-[#009D55]" : "bg-[#DC2626]"}`} />
                      <span className={`text-[10px] font-bold font-mono w-8 flex-shrink-0 ${isBuy ? "text-[#009D55]" : "text-[#DC2626]"}`}>
                        {isBuy ? "BUY" : "SELL"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate text-[#121212]">{title}</div>
                      <div className="text-[10px] text-[#9B9B9B]">{outcome}{outcome && amount ? " \u00b7 " : ""}{amount}</div>
                    </div>
                    <span className="text-[10px] text-[#9B9B9B] flex-shrink-0">{date}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Current Holdings */}
        <div className="bg-white rounded-xl p-4">
          <h4 className="font-bold text-sm mb-3 text-[#121212]">Current Holdings</h4>
          {holdings.length === 0 ? (
            <p className="text-xs text-[#9B9B9B] py-3 text-center">{traderData ? "No open positions" : "Loading..."}</p>
          ) : (
            <div className="space-y-0">
              {holdings.map((h: any, i: number) => {
                const title = h.title || h.market || "?";
                const outcome = h.outcome || "";
                const value = h.value || 0;
                const pnl = h.pnl || 0;
                const pnlPct = value > 0 && pnl !== 0 ? (pnl / (value - pnl)) * 100 : 0;
                return (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-black/5 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate text-[#121212]">{title}</div>
                      <div className="text-[10px] text-[#9B9B9B]">{outcome}</div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-xs font-mono font-medium text-[#121212]">${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
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

        {/* About */}
        <div className="bg-white rounded-xl p-4">
          <h4 className="font-bold text-sm mb-2 text-[#121212]">About this Strategy</h4>
          <p className="text-xs text-[#656565] leading-relaxed font-medium">{strategy.desc}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {strategy.categories.map((cat: string) => (
              <span key={cat} className="bg-[#F7F7F7] text-[#656565] text-[10px] px-2.5 py-1 rounded-full font-medium">
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Risk Settings */}
        <div className="bg-white rounded-xl p-4">
          <h4 className="font-bold text-sm mb-3 text-[#121212]">Risk Settings</h4>
          <div className="grid grid-cols-2 gap-3">
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
                <label className="text-[10px] text-[#9B9B9B] mb-1 block font-medium">{field.label}</label>
                {field.type === "select" ? (
                  <select
                    value={settings[field.key] || "standard"}
                    onChange={(e) => updateSetting(field.key, e.target.value)}
                    className="w-full bg-[#F7F7F7] border border-black/5 rounded-full px-3 py-2 text-[#121212] outline-none focus:border-[#121212] text-xs appearance-none"
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
                    className="w-full bg-[#F7F7F7] border border-black/5 rounded-full px-3 py-2 text-[#121212] outline-none focus:border-[#121212] text-xs"
                  />
                )}
              </div>
            ))}
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="mt-3 bg-[#121212] hover:bg-[#333] text-white font-medium px-5 py-2 rounded-full transition-all disabled:opacity-50 text-xs"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-1 pb-1">
          {isActive ? (
            <div className="flex-1 flex items-center justify-center gap-2 text-[#009D55] text-sm font-bold py-3">
              <span className="w-2.5 h-2.5 bg-[#009D55] rounded-full animate-pulse" />
              Currently Active
            </div>
          ) : (
            <button
              onClick={onStartCopying}
              disabled={toggling === strategy.wallet}
              className="flex-1 bg-[#121212] hover:bg-[#333] text-white text-sm font-medium py-3 rounded-full transition-all disabled:opacity-50"
            >
              {toggling === strategy.wallet ? "Adding..." : "Start Copying"}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 border border-[#121212] text-[#121212] text-sm font-medium py-3 rounded-full hover:bg-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
