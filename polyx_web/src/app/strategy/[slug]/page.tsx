"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { STRATEGIES, generateEquityData } from "@/lib/strategies";
import { traderApi, userApi, copyApi } from "@/lib/api";
import { Card } from "@/components/ui";
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
  const [settings, setSettings] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!strategy) return;
    traderApi.one(strategy.wallet).then(setLiveData).catch(() => {});
    userApi.me().then((d) => setSettings(d.settings || {})).catch(() => {});
    copyApi.targets().then((d) => {
      const active = (d.targets || []).some((t: any) => t.wallet_addr.toLowerCase() === strategy.wallet.toLowerCase() && t.is_active);
      setIsFollowing(active);
    }).catch(() => {});
  }, [strategy]);

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

  async function toggleFollow(wallet: string, name: string) {
    setToggling(wallet);
    try {
      if (isFollowing) {
        await copyApi.removeTarget(wallet);
        setIsFollowing(false);
      } else {
        await copyApi.addTarget(wallet, name);
        await copyApi.start();
        setIsFollowing(true);
      }
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
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 text-[var(--color-primary)]">404</div>
          <h1 className="text-xl font-bold mb-2 text-[var(--color-primary)]">Trader Not Found</h1>
          <Link href="/strategies" className="text-[var(--color-positive)] font-medium text-sm">Back to Traders</Link>
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
      {/* 1. Top bar: Back + Share */}
      <div className="flex items-center justify-between py-3">
        <Link
          href="/strategies"
          className="w-10 h-10 rounded-full hover:bg-[var(--color-surface)] flex items-center justify-center transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          className="w-10 h-10 rounded-full hover:bg-[var(--color-surface)] flex items-center justify-center transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
      </div>

      {/* 2. Hero Banner with image, name, rank, wallet */}
      <Card padding="none" className="overflow-hidden mb-4">
        <div className="relative h-36 sm:h-44 overflow-hidden">
          <img alt={strategy.name} src={strategy.image} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-3">
              <img
                alt={strategy.manager}
                src={strategy.image}
                className="w-12 h-12 rounded-full object-cover border-2 border-white/40"
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{strategy.name}</h1>
                <div className="flex items-center gap-2">
                  <span className="text-white/70 text-xs">by {strategy.manager}</span>
                  <a
                    href={`https://polymarket.com/profile/${strategy.wallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-white/80 text-[10px] font-mono transition-colors"
                  >
                    {strategy.wallet.slice(0, 6)}...{strategy.wallet.slice(-4)}
                  </a>
                </div>
              </div>
              <span className="bg-[var(--color-negative)] text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7L2 9.4h7.6z"/></svg>
                Rank #{liveData?.rank || Math.floor(strategy.winRate * 2)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Action row */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] flex-wrap">
          <button
            onClick={() => {
              navigator.clipboard.writeText(strategy.wallet);
              setWalletCopied(true);
              setTimeout(() => setWalletCopied(false), 2000);
            }}
            className="flex items-center gap-1.5 bg-[var(--color-surface)] hover:bg-[#EBEBEB] text-[var(--color-primary)] text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            {walletCopied ? "Copied!" : "Copy Address"}
          </button>
          <button
            onClick={() => toggleFollow(strategy.wallet, strategy.name)}
            disabled={toggling === strategy.wallet}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
              isFollowing
                ? "bg-[var(--color-positive)] text-white hover:bg-[#0d9668]"
                : "bg-[var(--color-primary)] text-white hover:bg-[#262626]"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            {toggling === strategy.wallet ? "..." : isFollowing ? "Following" : "Follow This Trader"}
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <a
              href={`https://polymarket.com/profile/${strategy.wallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-primary)] text-xs transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>
              Polymarket
            </a>
            <a
              href={`https://polymarketanalytics.com/traders/${strategy.wallet}#trades`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[var(--color-muted)] hover:text-[var(--color-primary)] text-xs transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              Analytics
            </a>
          </div>
        </div>

        {/* 4. Stats: PnL, Total Gains, Total Losses, Win Rate */}
        <div className="px-4 py-4">
          <div className="flex flex-wrap gap-x-6 gap-y-3 mb-3">
            <div>
              <div className="text-[10px] text-[var(--color-muted)] font-medium">Polymarket PnL</div>
              <div className="text-lg font-bold font-mono text-[var(--color-primary)]">
                {pnlDisplay}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--color-muted)] font-medium">Total Gains</div>
              <div className="text-lg font-bold font-mono text-[var(--color-positive)]">
                +{totalPnl !== undefined && totalPnl > 0 ? `$${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : strategy.profit}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--color-muted)] font-medium">Total Losses</div>
              <div className="text-lg font-bold font-mono text-[var(--color-negative)]">
                -${liveData?.total_losses ? Math.abs(liveData.total_losses).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--color-muted)] font-medium">Win Rate</div>
              <div className="text-lg font-bold font-mono text-[var(--color-primary)]">{winRate}%</div>
            </div>
          </div>

          {/* 5. Polymarket Positions card */}
          <div className="bg-[var(--color-surface)] rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-[var(--color-muted)] font-medium">Polymarket Positions</div>
              <div className="text-lg font-bold font-mono text-[var(--color-primary)]">
                {volumeDisplay}
              </div>
            </div>
            <div className="text-[10px] text-[var(--color-muted)]">
              {positionsCount} positions
            </div>
          </div>
        </div>
      </Card>

      {/* 6. View full verified stats banner */}
      <a
        href={`https://polymarketanalytics.com/traders/${strategy.wallet}#trades`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between bg-[var(--color-primary)] text-white rounded-xl px-4 py-3 mb-4 hover:bg-[#262626] transition-colors group"
      >
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          <span className="text-sm font-medium">View full verified stats on Polymarket Analytics</span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-50 group-hover:opacity-100 transition-opacity">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </a>

      {/* 7. Category tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {strategy.categories.map((cat) => (
          <span
            key={cat}
            className="bg-[var(--color-surface)] text-[var(--color-secondary)] text-[10px] px-3 py-1 rounded-full font-medium border border-[var(--color-border)]"
          >
            {cat}
          </span>
        ))}
        {winRate >= 67 && (
          <span className="bg-[var(--color-surface)] text-[var(--color-secondary)] text-[10px] px-3 py-1 rounded-full font-medium border border-[var(--color-border)]">
            Win Rate &gt; 67%
          </span>
        )}
        {strategy.returnPct > 100 && (
          <span className="bg-[var(--color-surface)] text-[var(--color-secondary)] text-[10px] px-3 py-1 rounded-full font-medium border border-[var(--color-border)]">
            PnL &gt; $100k
          </span>
        )}
      </div>

      {/* 8. Equity chart with time filters */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className={`text-lg font-bold font-mono ${isPositive ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}`}>
              {isPositive ? "+" : ""}{periodReturn.toFixed(1)}%
            </span>
            <span className="text-xs text-[var(--color-muted)] font-medium ml-2">{timeFilter} return</span>
          </div>
        </div>
        <div className="h-[240px] -mx-4 sm:-mx-5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis domain={[chartMin * 0.98, chartMax * 1.02]} hide />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "var(--color-primary)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  padding: "8px 12px",
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
                labelFormatter={() => ""}
                cursor={{ stroke: isPositive ? "#10B981" : "#EF4444", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? "#10B981" : "#EF4444"}
                strokeWidth={2}
                fill="url(#chartGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Time pills */}
        <div className="flex gap-1 justify-center mt-3">
          {TIME_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                timeFilter === f
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </Card>

      {/* 9. Recent Trades */}
      <Card className="mb-6" padding="none">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <h3 className="text-sm font-semibold text-[var(--color-primary)]">Recent Trades</h3>
          {liveData && <span className="w-2 h-2 rounded-full bg-[var(--color-positive)] animate-pulse" />}
        </div>
        {recentTrades.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)] py-6 text-center">Loading trades...</p>
        ) : (
          <div>
            {recentTrades.slice(0, 6).map((trade: any, i: number) => {
              const isBuy = trade.side === "BUY" || trade.action === "BUY";
              const title = trade.title || trade.market || "Unknown";
              const outcome = trade.outcome || "";
              const amount = trade.usdc_size ? `$${trade.usdc_size.toFixed(0)}` : trade.amount || "";
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
                    i < Math.min(recentTrades.length, 6) - 1 ? "border-b border-[var(--color-border)]" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        isBuy ? "bg-[var(--color-positive)]" : "bg-[var(--color-negative)]"
                      }`}
                    />
                    <span className={`text-[10px] font-semibold font-mono w-8 flex-shrink-0 ${isBuy ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}`}>
                      {isBuy ? "BUY" : "SELL"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--color-primary)] truncate">{title}</div>
                    <div className="text-[10px] text-[var(--color-muted)]">{outcome}{outcome && amount ? " \u00b7 " : ""}{amount}</div>
                  </div>
                  <span className="text-xs text-[var(--color-muted)] flex-shrink-0">{date}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 10. Copy Settings */}
      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-[var(--color-primary)] mb-3">Copy Settings</h3>
        <div className="space-y-4">
          {/* Copy Factor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-[var(--color-secondary)] font-medium">Copy Factor</label>
              <span className="text-xs font-bold text-[var(--color-primary)] font-mono">{(settings.copy_factor || 1.0).toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={settings.copy_factor || 1.0}
              onChange={(e) => updateSetting("copy_factor", parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[var(--color-surface)] rounded-full appearance-none cursor-pointer accent-[var(--color-primary)]"
            />
            <div className="flex justify-between text-[10px] text-[var(--color-muted)] mt-1">
              <span>0.1x (conservative)</span>
              <span>1x (mirror)</span>
              <span>5x (aggressive)</span>
            </div>
            <p className="text-[10px] text-[var(--color-muted)] mt-2">
              If the trader invests 10% of their portfolio, you invest 10% x {(settings.copy_factor || 1.0).toFixed(1)} = {(10 * (settings.copy_factor || 1.0)).toFixed(0)}% of yours.
            </p>
          </div>

          {/* Quick settings row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[var(--color-muted)] font-medium block mb-1">Max Risk per Trade</label>
              <div className="flex items-center bg-[var(--color-surface)] rounded-xl h-10 px-3">
                <input
                  type="number"
                  value={settings.max_risk_pct ?? 10}
                  onChange={(e) => updateSetting("max_risk_pct", parseFloat(e.target.value) || 10)}
                  className="flex-1 bg-transparent text-sm text-[var(--color-primary)] outline-none font-mono w-full"
                />
                <span className="text-xs text-[var(--color-muted)]">%</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-[var(--color-muted)] font-medium block mb-1">Min Bet</label>
              <div className="flex items-center bg-[var(--color-surface)] rounded-xl h-10 px-3">
                <span className="text-xs text-[var(--color-muted)] mr-1">$</span>
                <input
                  type="number"
                  value={settings.min_bet ?? 0.1}
                  onChange={(e) => updateSetting("min_bet", parseFloat(e.target.value) || 0.1)}
                  className="flex-1 bg-transparent text-sm text-[var(--color-primary)] outline-none font-mono w-full"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full h-10 rounded-xl bg-[var(--color-primary)] hover:bg-[#262626] text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
          </button>
        </div>
      </Card>

      {/* 11. About section */}
      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-[var(--color-primary)] mb-3">About</h3>
        <p className="text-sm text-[var(--color-secondary)] leading-relaxed">
          {strategy.desc}
        </p>
      </Card>

      {/* 12. Sticky CTA: Follow / Following */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-[var(--color-border)] sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:mt-4">
        <div className="max-w-[600px] mx-auto">
          <button
            onClick={() => toggleFollow(strategy.wallet, strategy.name)}
            disabled={toggling === strategy.wallet}
            className={`w-full rounded-xl h-14 text-base font-semibold transition-colors disabled:opacity-50 ${
              isFollowing
                ? "bg-[var(--color-positive)] hover:bg-[#0d9668] text-white"
                : "bg-[var(--color-primary)] hover:bg-[#262626] text-white"
            }`}
          >
            {toggling === strategy.wallet
              ? "Updating..."
              : isFollowing
              ? `Following ${strategy.name}`
              : `Follow ${strategy.name}`}
          </button>
        </div>
      </div>
    </div>
  );
}
