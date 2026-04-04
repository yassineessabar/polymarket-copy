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
      <h1 className="text-xl sm:text-2xl font-semibold font-display mb-4 sm:mb-6">Portfolio</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-card border border-border rounded-xl p-1 mb-4 sm:mb-6 w-full sm:w-fit">
        {(["open", "closed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t ? "bg-accent text-white" : "text-text-secondary hover:text-white"
            }`}
          >
            {t} Positions
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : positions.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-2xl p-8 sm:p-12 text-center">
          <h3 className="font-semibold mb-2">No {tab} positions</h3>
          <p className="text-sm text-text-secondary">
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
              <div key={pos.id} className="bg-bg-card border border-border rounded-2xl p-4 sm:p-5 hover:border-border-hover transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm mb-1 truncate">{pos.title}</div>
                    <div className="text-xs text-text-muted">{pos.outcome}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold font-mono text-sm ${pnl >= 0 ? "text-green" : "text-red"}`}>
                      {formatPnl(pnl)}
                    </div>
                    <div className={`text-xs font-mono ${pnlPctVal >= 0 ? "text-green" : "text-red"}`}>
                      {formatPct(pnlPctVal)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3 sm:mt-4">
                  <div>
                    <div className="text-xs text-text-muted mb-0.5">Entry</div>
                    <div className="text-sm font-mono">{entryPct}c</div>
                  </div>
                  {tab === "open" && livePct && (
                    <div>
                      <div className="text-xs text-text-muted mb-0.5">Live</div>
                      <div className="text-sm font-mono">{livePct}c</div>
                    </div>
                  )}
                  {tab === "closed" && exitPct && (
                    <div>
                      <div className="text-xs text-text-muted mb-0.5">Exit</div>
                      <div className="text-sm font-mono">{exitPct}c</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-text-muted mb-0.5">Bet</div>
                    <div className="text-sm font-mono">{formatUsd(pos.bet_amount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted mb-0.5">{tab === "open" ? "Opened" : "Closed"}</div>
                    <div className="text-xs text-text-secondary">{formatDate(tab === "open" ? pos.opened_at : pos.closed_at || "")}</div>
                  </div>
                </div>

                {pos.close_reason && (
                  <div className="mt-3 text-xs text-text-muted">
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
