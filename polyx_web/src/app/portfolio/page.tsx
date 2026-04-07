"use client";

import { useEffect, useState } from "react";
import { portfolioApi } from "@/lib/api";
import { formatUsd, formatPnl, formatPct, formatDate, truncateAddress } from "@/lib/utils";
import { STRATEGIES } from "@/lib/strategies";
import type { Position } from "@/lib/types";
import { Card, Badge, Spinner, Button } from "@/components/ui";
import { IconExternalLink } from "@/components/ui";
import { PageHeader, StatCard, EmptyState } from "@/components";

function getTraderName(wallet?: string): string {
  if (!wallet) return "";
  const strat = Object.values(STRATEGIES).find(s => s.wallet.toLowerCase() === wallet.toLowerCase());
  return strat ? strat.name : truncateAddress(wallet);
}

export default function PortfolioPage() {
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [sortBy, setSortBy] = useState<"date" | "pnl" | "bet">("date");
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load(showSpinner = true) {
      if (showSpinner) setLoading(true);
      try {
        const [posData, sumData] = await Promise.all([
          portfolioApi.positions(tab, tab === "closed" ? 5000 : 50),
          portfolioApi.summary(),
        ]);
        if (!cancelled) {
          if (posData.positions) setPositions(posData.positions);
          if (sumData) setSummary(sumData);
        }
      } catch {}
      if (!cancelled && showSpinner) setLoading(false);
    }

    load();

    // Auto-refresh only for open positions
    let interval: ReturnType<typeof setInterval> | null = null;
    if (tab === "open") {
      interval = setInterval(() => load(false), 15000);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [tab]);

  // Sort closed positions
  const sortedPositions = tab === "closed" ? [...positions].sort((a, b) => {
    if (sortBy === "pnl") return Math.abs(b.pnl_usd || 0) - Math.abs(a.pnl_usd || 0);
    if (sortBy === "bet") return (b.bet_amount || 0) - (a.bet_amount || 0);
    return new Date(b.closed_at || 0).getTime() - new Date(a.closed_at || 0).getTime();
  }) : positions;

  // CSV Export
  function exportCsv() {
    if (!sortedPositions.length) return;
    const headers = ["Title","Outcome","Side","Entry Price","Exit Price","Bet Amount","P&L ($)","P&L (%)","Trader","Opened","Closed","Reason"];
    const rows = sortedPositions.map(pos => {
      const entry = pos.entry_price || 0;
      const exit = pos.exit_price || pos.live_price || entry;
      const pnlPct = entry > 0 ? ((exit - entry) / entry * 100).toFixed(2) : "0";
      return [
        `"${(pos.title || "").replace(/"/g, '""')}"`,
        pos.outcome || "",
        tab === "open" ? "OPEN" : "CLOSED",
        (entry * 100).toFixed(1) + "c",
        (exit * 100).toFixed(1) + "c",
        "$" + (pos.bet_amount || 0).toFixed(2),
        "$" + (pos.pnl_usd || pos.unrealized_pnl || 0).toFixed(2),
        pnlPct + "%",
        pos.target_wallet || "",
        pos.opened_at || "",
        pos.closed_at || "",
        pos.close_reason || "",
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `polyx_${tab}_positions_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Calculate stats from positions
  const openPositions = tab === "open" ? positions : [];
  const unrealizedPnl = openPositions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);
  const exposure = openPositions.reduce((sum, p) => sum + (p.bet_amount || 0), 0);

  return (
    <div className="max-w-[900px] mx-auto">
      <PageHeader title="Portfolio" />

      {/* Stats Bar */}
      {summary && (
        <Card className="mb-4">
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
              <p className={`text-base sm:text-lg font-bold font-mono ${(summary.total_pnl || 0) >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                {formatPnl(summary.total_pnl || 0)}
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
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-full p-1 mb-4 w-full sm:w-fit shadow-sm">
        {(["open", "closed"] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? "primary" : "ghost"}
            size="sm"
            onClick={() => setTab(t)}
            className={`rounded-full capitalize ${tab === t ? "" : "text-[#6B7280] hover:text-[#0F0F0F]"}`}
          >
            {t} Positions
          </Button>
        ))}
      </div>

      {/* Sort + Export */}
      {positions.length > 0 && (
        <div className="flex gap-1 mb-4 flex-wrap items-center">
          <button
            onClick={exportCsv}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-[#F5F5F5] text-[#6B7280] hover:bg-[#E5E5E5] transition-colors ml-auto"
          >
            Export CSV
          </button>
        </div>
      )}
      {tab === "closed" && positions.length > 0 && (
        <div className="flex gap-1 mb-4">
          <span className="text-xs text-[#9CA3AF] self-center mr-1">Sort:</span>
          {([["date", "Latest"], ["pnl", "Top P&L"], ["bet", "Largest"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key as any)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                sortBy === key ? "bg-[#0F0F0F] text-white" : "bg-[#F5F5F5] text-[#6B7280] hover:bg-[#E5E5E5]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Spinner />
        </div>
      ) : sortedPositions.length === 0 ? (
        <EmptyState
          title={`No ${tab} positions`}
          subtitle={tab === "open" ? "Start following traders to open positions." : "Closed trades will appear here."}
        />
      ) : (
        <div className="space-y-2">
          {sortedPositions.map((pos) => {
            const entryPct = (pos.entry_price * 100).toFixed(1);
            const livePct = pos.live_price ? (pos.live_price * 100).toFixed(1) : null;
            const exitPct = pos.exit_price ? (pos.exit_price * 100).toFixed(1) : null;
            const pnl = pos.pnl_usd || pos.unrealized_pnl || 0;
            const pnlPctVal = pos.entry_price > 0 ? (((pos.live_price || pos.exit_price || pos.entry_price) - pos.entry_price) / pos.entry_price * 100) : 0;

            return (
              <Card key={pos.id} className="hover:shadow-md transition-all">
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
                      <IconExternalLink size={10} />
                    </a>
                  </div>
                )}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm mb-0.5 truncate text-[#0F0F0F]">{pos.title}</div>
                    <div className="text-xs text-[#6B7280] font-medium">{pos.outcome}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant={pnl >= 0 ? "success" : "danger"} className="text-sm font-bold font-mono">
                      {formatPnl(pnl)}
                    </Badge>
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
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
