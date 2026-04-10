"use client";

import { useEffect, useState, useCallback } from "react";
import { reconciliationApi } from "@/lib/api";
import { formatUsd, formatPnl, formatDate } from "@/lib/utils";
import { Card, Badge, Spinner, Button } from "@/components/ui";
import { PageHeader } from "@/components";

type Tab = "sharky" | "matched" | "unmatched";

export default function ReconciliationPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("matched");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await reconciliationApi.compare(200);
      setData(result);
      setError("");
    } catch (e: any) {
      setError(e.message || "Failed to load");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center pt-24">
        <Spinner />
      </div>
    );
  }

  const summary = data?.summary || {};
  const sharkyTrades = data?.sharky_activity || [];
  const matched = data?.comparison?.matched || [];
  const unmatched = data?.comparison?.unmatched_sharky || [];
  const ourOpen = data?.our_positions?.open || [];
  const ourClosed = data?.our_positions?.closed || [];

  return (
    <div className="max-w-[1000px] mx-auto">
      <PageHeader title="Reconciliation" />
      <p className="text-sm text-[#6B7280] -mt-4 mb-6">
        Live comparison: Sharky6999 Polyscan trades vs our copy bot. Auto-refreshes every 30s.
      </p>

      {error && (
        <div className="bg-[#FEF2F2] text-[#EF4444] text-sm p-3 rounded-xl mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="text-xs font-medium underline ml-2">Retry</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-6">
        <Card className="!p-3">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-1">Sharky Trades</p>
          <p className="text-lg font-bold font-mono text-[#0F0F0F]">{summary.sharky_trades_count || 0}</p>
        </Card>
        <Card className="!p-3">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-1">Our Open</p>
          <p className="text-lg font-bold font-mono text-[#0F0F0F]">{summary.our_open_count || 0}</p>
        </Card>
        <Card className="!p-3">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-1">Our Closed</p>
          <p className="text-lg font-bold font-mono text-[#0F0F0F]">{summary.our_closed_count || 0}</p>
        </Card>
        <Card className="!p-3">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-1">Matched</p>
          <p className="text-lg font-bold font-mono text-[#10B981]">{summary.matched_count || 0}</p>
        </Card>
        <Card className="!p-3">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-1">Not Copied</p>
          <p className="text-lg font-bold font-mono text-[#F59E0B]">{summary.unmatched_count || 0}</p>
        </Card>
        <Card className="!p-3">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-1">Realized P&L</p>
          <p className={`text-lg font-bold font-mono ${(summary.total_pnl || 0) >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            {formatPnl(summary.total_pnl || 0)}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-full p-1 mb-4 w-full sm:w-fit shadow-sm">
        {([
          ["matched", `Matched (${matched.length})`],
          ["unmatched", `Not Copied (${unmatched.length})`],
          ["sharky", `Sharky Activity (${sharkyTrades.length})`],
        ] as const).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? "primary" : "ghost"}
            size="sm"
            onClick={() => setTab(key as Tab)}
            className={`rounded-full ${tab === key ? "" : "text-[#6B7280] hover:text-[#0F0F0F]"}`}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "matched" && (
        <div className="space-y-2">
          {matched.length === 0 ? (
            <Card><p className="text-sm text-[#6B7280] text-center py-4">No matched trades yet. Waiting for Sharky to trade...</p></Card>
          ) : (
            matched.map((m: any, i: number) => {
              const st = m.sharky_trade;
              const p = m.our_position || {};
              const delay = m.delay_seconds;
              const isBuy = (st.side || "").toUpperCase() === "BUY";
              const pnl = p.pnl_usd || 0;
              const sharkyTime = st.timestamp ? new Date(st.timestamp * 1000) : null;
              return (
                <Card key={i} className="hover:shadow-md transition-all">
                  {/* Header row */}
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-black/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    <span className="text-[10px] text-[#10B981] font-semibold uppercase">Matched</span>
                    {delay !== null && delay !== undefined && (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        delay <= 10 ? "bg-[#10B981]/10 text-[#10B981]"
                        : delay <= 30 ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                        : delay <= 60 ? "bg-[#F97316]/10 text-[#F97316]"
                        : "bg-[#EF4444]/10 text-[#EF4444]"
                      }`}>
                        {delay}s delay
                      </span>
                    )}
                    <Badge variant={p.is_open ? "active" : "neutral"} className="ml-auto">
                      {p.is_open ? "OPEN" : "CLOSED"}
                    </Badge>
                  </div>

                  {/* Trade info */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={isBuy ? "success" : "danger"}>{st.side}</Badge>
                        <span className="font-bold text-sm truncate text-[#0F0F0F]">{st.title}</span>
                      </div>
                      <p className="text-xs text-[#6B7280]">{st.outcome}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold font-mono text-[#0F0F0F]">{formatUsd(st.usdcSize || 0)}</p>
                      <p className="text-xs text-[#6B7280] font-mono">{((st.price || 0) * 100).toFixed(1)}c</p>
                    </div>
                  </div>

                  {/* Our position details */}
                  <div className="mt-2 pt-2 border-t border-black/5 flex items-center justify-between text-xs">
                    <span className="text-[#6B7280]">
                      Entry: {((p.entry_price || 0) * 100).toFixed(1)}c
                      {p.exit_price ? ` | Exit: ${((p.exit_price || 0) * 100).toFixed(1)}c` : ""}
                      {" | "}Bet: {formatUsd(p.bet_amount || 0)}
                    </span>
                    {!p.is_open && pnl !== 0 && (
                      <span className={`font-mono font-bold ${pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                        {formatPnl(pnl)}
                      </span>
                    )}
                  </div>

                  {/* Timestamps + Polyscan */}
                  <div className="mt-2 pt-2 border-t border-black/5 flex items-center justify-between text-[10px] text-[#9CA3AF]">
                    <div className="flex gap-3">
                      {sharkyTime && (
                        <span>Sharky: {sharkyTime.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                      )}
                      {p.opened_at && (
                        <span>Ours: {formatDate(p.opened_at)}</span>
                      )}
                    </div>
                    {st.polyscanUrl && (
                      <a
                        href={st.polyscanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#10B981] font-semibold hover:underline flex items-center gap-1"
                      >
                        Polyscan
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {tab === "unmatched" && (
        <div className="space-y-2">
          {unmatched.length === 0 ? (
            <Card><p className="text-sm text-[#10B981] text-center py-4">All Sharky trades matched! Bot is copying everything.</p></Card>
          ) : (
            <>
              <p className="text-xs text-[#F59E0B] mb-2">
                Sharky trades our bot didn&apos;t copy. Could be: trade happened before bot started, risk limits blocked it, or older than tracking window.
              </p>
              {unmatched.map((t: any, i: number) => {
                const isBuy = (t.side || "").toUpperCase() === "BUY";
                const sharkyTime = t.timestamp ? new Date(t.timestamp * 1000) : null;
                return (
                  <Card key={i} className="hover:shadow-md transition-all border-[#F59E0B]/30">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-black/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                      <span className="text-[10px] text-[#F59E0B] font-semibold uppercase">Not Copied</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={isBuy ? "success" : "danger"}>{t.side}</Badge>
                          <span className="font-bold text-sm truncate text-[#0F0F0F]">{t.title}</span>
                        </div>
                        <p className="text-xs text-[#6B7280]">{t.outcome}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold font-mono text-[#0F0F0F]">{formatUsd(t.usdcSize || 0)}</p>
                        <p className="text-xs text-[#6B7280] font-mono">{((t.price || 0) * 100).toFixed(1)}c</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 text-[10px] text-[#9CA3AF]">
                      <span>{sharkyTime ? sharkyTime.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : ""}</span>
                      {t.polyscanUrl && (
                        <a
                          href={t.polyscanUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#10B981] font-semibold hover:underline flex items-center gap-1"
                        >
                          Polyscan
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}

      {tab === "sharky" && (
        <div className="space-y-2">
          {sharkyTrades.length === 0 ? (
            <Card><p className="text-sm text-[#6B7280] text-center py-4">No Sharky trades found from API</p></Card>
          ) : (
            sharkyTrades.map((t: any, i: number) => {
              const side = t.side || "";
              const isBuy = side.toUpperCase() === "BUY";
              const price = Number(t.price || 0);
              const usdc = Number(t.usdcSize || t.size || 0);
              const sharkyTime = t.timestamp ? new Date(t.timestamp * 1000) : null;
              return (
                <Card key={i} className="hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={isBuy ? "success" : "danger"}>{side || t.type}</Badge>
                        <span className="font-bold text-sm truncate text-[#0F0F0F]">{t.title || "Unknown"}</span>
                      </div>
                      <p className="text-xs text-[#6B7280]">{t.outcome || ""}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold font-mono text-[#0F0F0F]">{formatUsd(usdc)}</p>
                      <p className="text-xs text-[#6B7280] font-mono">{(price * 100).toFixed(1)}c</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 text-[10px] text-[#9CA3AF]">
                    <span>{sharkyTime ? sharkyTime.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : ""}</span>
                    {t.transactionHash && (
                      <a
                        href={`https://polygonscan.com/tx/${t.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#10B981] font-semibold hover:underline flex items-center gap-1"
                      >
                        Polyscan
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
