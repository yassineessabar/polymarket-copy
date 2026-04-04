"use client";

import { useEffect, useState } from "react";
import { portfolioApi } from "@/lib/api";
import { formatUsd, formatPnl, formatPct, formatDate } from "@/lib/utils";
import type { Position } from "@/lib/types";

export default function PortfolioPage() {
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPositions();
  }, [tab]);

  useEffect(() => {
    if (tab !== "open") return;
    const interval = setInterval(loadPositions, 10000);
    return () => clearInterval(interval);
  }, [tab]);

  async function loadPositions() {
    setLoading(true);
    try {
      const data = await portfolioApi.positions(tab);
      setPositions(data.positions);
    } catch {}
    setLoading(false);
  }

  return (
    <div className="max-w-[900px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-4 sm:mb-6 text-[#121212]">Portfolio</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F0F0F0] rounded-full p-1 mb-4 sm:mb-6 w-full sm:w-fit">
        {(["open", "closed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all capitalize ${
              tab === t ? "bg-[#121212] text-white" : "text-[#9B9B9B] hover:text-[#121212]"
            }`}
          >
            {t} Positions
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-[#121212] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : positions.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-sm">
          <h3 className="font-bold mb-2 text-[#121212]">No {tab} positions</h3>
          <p className="text-sm text-[#9B9B9B] font-medium">
            {tab === "open"
              ? "Start copy trading to open positions automatically."
              : "Closed positions and P&L will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((pos) => {
            const entryPct = (pos.entry_price * 100).toFixed(1);
            const livePct = pos.live_price ? (pos.live_price * 100).toFixed(1) : null;
            const exitPct = pos.exit_price ? (pos.exit_price * 100).toFixed(1) : null;
            const pnl = pos.pnl_usd || pos.unrealized_pnl || 0;
            const pnlPctVal = pos.pnl_pct || (pos.entry_price > 0 ? ((pos.live_price || pos.exit_price || pos.entry_price) - pos.entry_price) / pos.entry_price * 100 : 0);

            return (
              <div key={pos.id} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm mb-1 truncate text-[#121212]">{pos.title}</div>
                    <div className="text-xs text-[#9B9B9B] font-medium">{pos.outcome}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold font-mono text-sm ${pnl >= 0 ? "text-[#009D55]" : "text-[#DC2626]"}`}>
                      {formatPnl(pnl)}
                    </div>
                    <div className={`text-xs font-mono font-medium ${pnlPctVal >= 0 ? "text-[#009D55]" : "text-[#DC2626]"}`}>
                      {formatPct(pnlPctVal)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3 sm:mt-4">
                  <div>
                    <div className="text-xs text-[#9B9B9B] mb-0.5 font-medium">Entry</div>
                    <div className="text-sm font-mono font-medium text-[#121212]">{entryPct}c</div>
                  </div>
                  {tab === "open" && livePct && (
                    <div>
                      <div className="text-xs text-[#9B9B9B] mb-0.5 font-medium">Live</div>
                      <div className="text-sm font-mono font-medium text-[#121212]">{livePct}c</div>
                    </div>
                  )}
                  {tab === "closed" && exitPct && (
                    <div>
                      <div className="text-xs text-[#9B9B9B] mb-0.5 font-medium">Exit</div>
                      <div className="text-sm font-mono font-medium text-[#121212]">{exitPct}c</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-[#9B9B9B] mb-0.5 font-medium">Bet</div>
                    <div className="text-sm font-mono font-medium text-[#121212]">{formatUsd(pos.bet_amount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#9B9B9B] mb-0.5 font-medium">{tab === "open" ? "Opened" : "Closed"}</div>
                    <div className="text-xs text-[#656565] font-medium">{formatDate(tab === "open" ? pos.opened_at : pos.closed_at || "")}</div>
                  </div>
                </div>

                {pos.close_reason && (
                  <div className="mt-3 text-xs text-[#9B9B9B] font-medium">
                    Reason: {pos.close_reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
