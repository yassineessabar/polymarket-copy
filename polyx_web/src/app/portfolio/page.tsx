"use client";

import { useEffect, useState } from "react";
import { portfolioApi } from "@/lib/api";
import { formatUsd, formatPnl, formatPct, formatDate, truncateAddress } from "@/lib/utils";
import { STRATEGIES } from "@/lib/strategies";
import type { Position } from "@/lib/types";

function getTraderName(wallet?: string): string {
  if (!wallet) return "";
  const strat = Object.values(STRATEGIES).find(s => s.wallet.toLowerCase() === wallet.toLowerCase());
  return strat ? strat.name : truncateAddress(wallet);
}

export default function PortfolioPage() {
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [tab]);

  useEffect(() => {
    if (tab !== "open") return;
    const interval = setInterval(loadAll, 10000);
    return () => clearInterval(interval);
  }, [tab]);

  async function loadAll() {
    setLoading(true);
    try {
      const [posData, sumData] = await Promise.all([
        portfolioApi.positions(tab),
        portfolioApi.summary(),
      ]);
      setPositions(posData.positions);
      setSummary(sumData);
    } catch {}
    setLoading(false);
  }

  // Calculate stats from positions
  const openPositions = tab === "open" ? positions : [];
  const unrealizedPnl = openPositions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);
  const exposure = openPositions.reduce((sum, p) => sum + (p.bet_amount || 0), 0);

  return (
    <div className="max-w-[900px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-4 sm:mb-6 text-[#0F0F0F]">Portfolio</h1>

      {/* Stats Bar */}
      {summary && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-1">Net Worth</p>
              <p className="text-base sm:text-lg font-bold font-mono text-[#0F0F0F]">{formatUsd(summary.net_worth || 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-1">Unrealized P&L</p>
              <p className={`text-base sm:text-lg font-bold font-mono ${unrealizedPnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                {formatPnl(unrealizedPnl)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-1">Realized P&L</p>
              <p className={`text-base sm:text-lg font-bold font-mono ${(summary.daily_pnl || 0) >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                {formatPnl(summary.daily_pnl || 0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-1">Exposure</p>
              <p className="text-base sm:text-lg font-bold font-mono text-[#0F0F0F]">{formatUsd(exposure)}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-1">Win Rate</p>
              <p className="text-base sm:text-lg font-bold font-mono text-[#0F0F0F]">{summary.win_rate?.toFixed(0) || 0}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-full p-1 mb-4 w-full sm:w-fit shadow-sm">
        {(["open", "closed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all capitalize ${
              tab === t ? "bg-[#0F0F0F] text-white" : "text-[#6B7280] hover:text-[#0F0F0F]"
            }`}
          >
            {t} Positions
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-[#0F0F0F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : positions.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-sm">
          <h3 className="font-bold mb-2 text-[#0F0F0F]">No {tab} positions</h3>
          <p className="text-sm text-[#6B7280] font-medium">
            {tab === "open" ? "Start following traders to open positions." : "Closed trades will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {positions.map((pos) => {
            const entryPct = (pos.entry_price * 100).toFixed(1);
            const livePct = pos.live_price ? (pos.live_price * 100).toFixed(1) : null;
            const exitPct = pos.exit_price ? (pos.exit_price * 100).toFixed(1) : null;
            const pnl = pos.pnl_usd || pos.unrealized_pnl || 0;
            const pnlPctVal = pos.entry_price > 0 ? (((pos.live_price || pos.exit_price || pos.entry_price) - pos.entry_price) / pos.entry_price * 100) : 0;

            return (
              <div key={pos.id} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                {/* Trader source */}
                {pos.target_wallet && (
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-black/5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                      <span className="text-[10px] text-[#6B7280] font-medium">
                        Copied from <span className="text-[#0F0F0F] font-bold">{getTraderName(pos.target_wallet)}</span>
                      </span>
                    </div>
                    <a
                      href={`https://polymarketanalytics.com/traders/${pos.target_wallet}#trades`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#10B981] font-medium hover:underline flex items-center gap-1"
                    >
                      Analytics
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                    </a>
                  </div>
                )}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm mb-0.5 truncate text-[#0F0F0F]">{pos.title}</div>
                    <div className="text-xs text-[#6B7280] font-medium">{pos.outcome}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold font-mono text-sm ${pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                      {formatPnl(pnl)}
                    </div>
                    <div className={`text-xs font-mono ${pnlPctVal >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                      {formatPct(pnlPctVal)}
                    </div>
                  </div>
                </div>
                <div className={`grid ${tab === "closed" ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-2 sm:grid-cols-5"} gap-2 mt-3 pt-3 border-t border-black/5`}>
                  <div>
                    <div className="text-[10px] text-[#6B7280] font-medium">Entry</div>
                    <div className="text-sm font-mono font-medium text-[#0F0F0F]">{entryPct}c</div>
                  </div>
                  {tab === "open" && livePct && (
                    <div>
                      <div className="text-[10px] text-[#6B7280] font-medium">Live</div>
                      <div className="text-sm font-mono font-medium text-[#0F0F0F]">{livePct}c</div>
                    </div>
                  )}
                  {tab === "closed" && exitPct && (
                    <div>
                      <div className="text-[10px] text-[#6B7280] font-medium">Exit</div>
                      <div className="text-sm font-mono font-medium text-[#0F0F0F]">{exitPct}c</div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] text-[#6B7280] font-medium">Bet</div>
                    <div className="text-sm font-mono font-medium text-[#0F0F0F]">{formatUsd(pos.bet_amount)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#6B7280] font-medium">Opened</div>
                    <div className="text-xs text-[#6B7280]">{formatDate(pos.opened_at)}</div>
                  </div>
                  {tab === "closed" && pos.closed_at && (
                    <div>
                      <div className="text-[10px] text-[#6B7280] font-medium">Closed</div>
                      <div className="text-xs text-[#6B7280]">{formatDate(pos.closed_at)}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
