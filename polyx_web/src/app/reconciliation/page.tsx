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
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("sharky");
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
  }, [loadData]);

  async function handleImport() {
    setImporting(true);
    setImportResult(null);
    try {
      const result = await reconciliationApi.importTrades(200);
      setImportResult(result);
      await loadData();
    } catch (e: any) {
      setImportResult({ error: e.message });
    }
    setImporting(false);
  }

  async function handleReset() {
    if (!confirm("Delete all imported positions and trades? You can re-import after.")) return;
    try {
      await reconciliationApi.reset();
      setImportResult(null);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (loading) {
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
        Compare Sharky6999&apos;s Polyscan trades with our database. Import trades to track P&L before going live.
      </p>

      {error && (
        <div className="bg-[#FEF2F2] text-[#EF4444] text-sm p-3 rounded-xl mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="text-xs font-medium underline ml-2">Retry</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <Card className="!p-3">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-1">Sharky Trades</p>
          <p className="text-lg font-bold font-mono text-[#0F0F0F]">{summary.sharky_trades_count || 0}</p>
        </Card>
        <Card className="!p-3">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-1">Our Positions</p>
          <p className="text-lg font-bold font-mono text-[#0F0F0F]">{summary.our_positions_count || 0}</p>
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
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-medium mb-1">Total P&L</p>
          <p className={`text-lg font-bold font-mono ${(summary.total_pnl || 0) >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            {formatPnl(summary.total_pnl || 0)}
          </p>
        </Card>
      </div>

      {/* Import Button */}
      <Card className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-medium text-[#0F0F0F]">Import Sharky6999 Trades</p>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Fetch from Polymarket API and save to DB as positions. Run this to populate your portfolio view.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-[#EF4444] hover:bg-[#FEF2F2]"
            >
              Reset
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? "Importing..." : "Import Trades"}
            </Button>
          </div>
        </div>

        {importResult && (
          <div className="mt-3 pt-3 border-t border-black/5">
            {importResult.error ? (
              <p className="text-sm text-[#EF4444]">{importResult.error}</p>
            ) : (
              <div className="flex gap-4 text-xs">
                <span className="text-[#10B981] font-medium">Buys imported: {importResult.imported_buys}</span>
                <span className="text-[#EF4444] font-medium">Sells imported: {importResult.imported_sells}</span>
                <span className="text-[#6B7280]">Skipped: {importResult.skipped}</span>
                <span className="text-[#6B7280]">Total activity: {importResult.total_activity}</span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-full p-1 mb-4 w-full sm:w-fit shadow-sm">
        {([
          ["sharky", `Sharky Activity (${sharkyTrades.length})`],
          ["matched", `Matched (${matched.length})`],
          ["unmatched", `Not Copied (${unmatched.length})`],
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

      {/* Our Open / Closed Summary */}
      {(ourOpen.length > 0 || ourClosed.length > 0) && (
        <div className="flex gap-2 mb-4 text-xs text-[#6B7280]">
          <span>DB: {ourOpen.length} open, {ourClosed.length} closed positions</span>
        </div>
      )}

      {/* Tab Content */}
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
              return (
                <Card key={i} className="hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={isBuy ? "success" : "danger"}>{side}</Badge>
                        <span className="font-bold text-sm truncate text-[#0F0F0F]">{t.title || "Unknown"}</span>
                      </div>
                      <p className="text-xs text-[#6B7280]">{t.outcome || ""}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold font-mono text-[#0F0F0F]">{formatUsd(usdc)}</p>
                      <p className="text-xs text-[#6B7280] font-mono">{(price * 100).toFixed(1)}c</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 pt-2 border-t border-black/5 text-xs text-[#6B7280]">
                    <span>{t.createdAt ? formatDate(t.createdAt) : ""}</span>
                    <a
                      href={`https://polymarketanalytics.com/traders/0x751a2b86cab503496efd325c8344e10159349ea1#trades`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#10B981] font-medium hover:underline ml-auto"
                    >
                      Polyscan
                    </a>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {tab === "matched" && (
        <div className="space-y-2">
          {matched.length === 0 ? (
            <Card><p className="text-sm text-[#6B7280] text-center py-4">No matched trades yet. Import trades first.</p></Card>
          ) : (
            matched.map((m: any, i: number) => {
              const st = m.sharky_trade;
              const p = m.our_position || {};
              const isBuy = (st.side || "").toUpperCase() === "BUY";
              const pnl = p.pnl_usd || 0;
              return (
                <Card key={i} className="hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-black/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    <span className="text-[10px] text-[#10B981] font-semibold uppercase">Matched</span>
                    <Badge variant={p.is_open ? "active" : "neutral"} className="ml-auto">
                      {p.is_open ? "OPEN" : "CLOSED"}
                    </Badge>
                  </div>
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
                  {/* Our position for this trade */}
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
                </Card>
              );
            })
          )}
        </div>
      )}

      {tab === "unmatched" && (
        <div className="space-y-2">
          {unmatched.length === 0 ? (
            <Card><p className="text-sm text-[#6B7280] text-center py-4">All Sharky trades are matched!</p></Card>
          ) : (
            <>
              <p className="text-xs text-[#F59E0B] mb-2">
                These Sharky trades have no matching position in our DB. They would have been missed if live.
              </p>
              {unmatched.map((t: any, i: number) => {
                const isBuy = (t.side || "").toUpperCase() === "BUY";
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
                    <div className="flex gap-4 mt-2 pt-2 border-t border-black/5 text-xs text-[#6B7280]">
                      <span>{t.createdAt ? formatDate(t.createdAt) : ""}</span>
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
