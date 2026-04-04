"use client";

import { useEffect, useState } from "react";
import { portfolioApi } from "@/lib/api";
import { formatUsd, formatPnl, formatPct, formatDate } from "@/lib/utils";
import type { Position } from "@/lib/types";

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

  const openPositions = tab === "open" ? positions : [];
  const unrealizedPnl = openPositions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);
  const exposure = openPositions.reduce((sum, p) => sum + (p.bet_amount || 0), 0);

  return (
    <div className="max-w-[900px] mx-auto px-4 py-5">

      {/* Stats Bar */}
      {summary && (
        <div className="bg-[#141728] rounded-2xl p-4 sm:p-5 mb-4 border border-white/[0.06]">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <p className="text-[10px] text-[#5A5F7A] uppercase tracking-wider font-medium mb-1">Net Worth</p>
              <p className="text-base sm:text-lg font-bold font-mono text-white">{formatUsd(summary.net_worth || 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#5A5F7A] uppercase tracking-wider font-medium mb-1">Unrealized P&L</p>
              <p className={`text-base sm:text-lg font-bold font-mono ${unrealizedPnl >= 0 ? "text-[#00C853]" : "text-[#DC2626]"}`}>
                {formatPnl(unrealizedPnl)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#5A5F7A] uppercase tracking-wider font-medium mb-1">Realized P&L</p>
              <p className={`text-base sm:text-lg font-bold font-mono ${(summary.daily_pnl || 0) >= 0 ? "text-[#00C853]" : "text-[#DC2626]"}`}>
                {formatPnl(summary.daily_pnl || 0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#5A5F7A] uppercase tracking-wider font-medium mb-1">Exposure</p>
              <p className="text-base sm:text-lg font-bold font-mono text-white">{formatUsd(exposure)}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#5A5F7A] uppercase tracking-wider font-medium mb-1">Win Rate</p>
              <p className="text-base sm:text-lg font-bold font-mono text-white">{summary.win_rate?.toFixed(0) || 0}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#141728] rounded-full p-1 mb-4 w-full sm:w-fit border border-white/[0.06]">
        {(["open", "closed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all capitalize ${
              tab === t
                ? "bg-[#1E2235] text-white"
                : "text-[#5A5F7A] hover:text-white"
            }`}
          >
            {t} Positions
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-[#3B5BFE] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : positions.length === 0 ? (
        <div className="bg-[#141728] rounded-2xl p-8 sm:p-12 text-center border border-white/[0.06]">
          <div className="w-12 h-12 rounded-full bg-[#1E2235] flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5A5F7A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <h3 className="font-bold mb-2 text-white">No {tab} positions</h3>
          <p className="text-sm text-[#5A5F7A] font-medium max-w-xs mx-auto">
            {tab === "open" ? "Start copy trading to open positions." : "Closed trades will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((pos) => {
            const entryPct = (pos.entry_price * 100).toFixed(1);
            const livePct = pos.live_price ? (pos.live_price * 100).toFixed(1) : null;
            const exitPct = pos.exit_price ? (pos.exit_price * 100).toFixed(1) : null;
            const pnl = pos.pnl_usd || pos.unrealized_pnl || 0;
            const pnlPctVal = pos.entry_price > 0 ? (((pos.live_price || pos.exit_price || pos.entry_price) - pos.entry_price) / pos.entry_price * 100) : 0;

            return (
              <div key={pos.id} className="bg-[#141728] rounded-2xl p-4 sm:p-5 border border-white/[0.06] hover:border-white/[0.12] transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm mb-0.5 truncate text-white">{pos.title}</div>
                    <div className="text-xs text-[#8B8FA3] font-medium">{pos.outcome}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold font-mono text-sm ${pnl >= 0 ? "text-[#00C853]" : "text-[#DC2626]"}`}>
                      {formatPnl(pnl)}
                    </div>
                    <div className={`text-xs font-mono ${pnlPctVal >= 0 ? "text-[#00C853]" : "text-[#DC2626]"}`}>
                      {formatPct(pnlPctVal)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                  <div>
                    <div className="text-[10px] text-[#5A5F7A] font-medium">Entry</div>
                    <div className="text-sm font-mono font-medium text-white">{entryPct}c</div>
                  </div>
                  {tab === "open" && livePct && (
                    <div>
                      <div className="text-[10px] text-[#5A5F7A] font-medium">Live</div>
                      <div className="text-sm font-mono font-medium text-white">{livePct}c</div>
                    </div>
                  )}
                  {tab === "closed" && exitPct && (
                    <div>
                      <div className="text-[10px] text-[#5A5F7A] font-medium">Exit</div>
                      <div className="text-sm font-mono font-medium text-white">{exitPct}c</div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] text-[#5A5F7A] font-medium">Bet</div>
                    <div className="text-sm font-mono font-medium text-white">{formatUsd(pos.bet_amount)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#5A5F7A] font-medium">{tab === "open" ? "Opened" : "Closed"}</div>
                    <div className="text-xs text-[#8B8FA3]">{formatDate(tab === "open" ? pos.opened_at : pos.closed_at || "")}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
