"use client";

import { useEffect, useState } from "react";
import { formatUsd } from "@/lib/utils";
import { Spinner } from "@/components/ui";
import { PageHeader } from "@/components";

interface WhalePosition {
  trader_name: string;
  trader_wallet: string;
  trader_rank: number;
  trader_pnl: number;
  trader_win_rate: number;
  title: string;
  outcome: string;
  value: number;
  pnl: number;
  size: number;
  price: number;
}

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

const MIN_VALUES = [
  { label: "$50K+", value: 50000 },
  { label: "$100K+", value: 100000 },
  { label: "$500K+", value: 500000 },
  { label: "$1M+", value: 1000000 },
];

export default function WhaleTrackerPage() {
  const [positions, setPositions] = useState<WhalePosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [minValue, setMinValue] = useState(50000);
  const [tradersScanned, setTradersScanned] = useState(0);

  useEffect(() => {
    setLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("polyx_token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch(`/api/v1/traders/whale-positions?min_value=${minValue}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        setPositions(data.positions || []);
        setTradersScanned(data.traders_scanned || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [minValue]);

  // Group by market title
  const grouped: Record<string, WhalePosition[]> = {};
  for (const p of positions) {
    const key = p.title;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  }
  const markets = Object.entries(grouped).sort((a, b) => {
    const totalA = a[1].reduce((s, p) => s + p.value, 0);
    const totalB = b[1].reduce((s, p) => s + p.value, 0);
    return totalB - totalA;
  });

  return (
    <div className="max-w-[900px] mx-auto">
      <PageHeader title="Whale Tracker" />
      <p className="text-sm text-[#6B7280] -mt-4 mb-6">
        Large positions across all top Polymarket traders. Real-time data.
      </p>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-xs text-[#9CA3AF] font-medium">Min position:</span>
        {MIN_VALUES.map((mv) => (
          <button
            key={mv.value}
            onClick={() => setMinValue(mv.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              minValue === mv.value
                ? "bg-[#0F0F0F] text-white"
                : "bg-[#F5F5F5] text-[#6B7280] hover:bg-[#E5E5E5]"
            }`}
          >
            {mv.label}
          </button>
        ))}
        {!loading && (
          <span className="text-[10px] text-[#9CA3AF] ml-auto">
            {positions.length} positions · {tradersScanned} traders scanned
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Spinner size="lg" />
        </div>
      ) : positions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/[0.04] p-12 text-center">
          <p className="text-lg font-semibold text-[#0F0F0F] mb-2">No positions found</p>
          <p className="text-sm text-[#6B7280]">Try lowering the minimum value filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {markets.map(([title, traders]) => {
            const totalValue = traders.reduce((s, p) => s + p.value, 0);
            const allSameOutcome = new Set(traders.map((t) => t.outcome)).size === 1;
            return (
              <div key={title} className="bg-white rounded-2xl border border-black/[0.04] overflow-hidden">
                {/* Market header */}
                <div className="px-5 py-4 border-b border-black/[0.04]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#0F0F0F]">{title}</p>
                      {allSameOutcome && (
                        <span className={`text-xs font-medium mt-1 inline-block px-2 py-0.5 rounded-md ${
                          traders[0].outcome === "Yes" || traders[0].outcome === "Over"
                            ? "bg-[#D1FAE5] text-[#065F46]"
                            : "bg-[#FEE2E2] text-[#991B1B]"
                        }`}>
                          All betting {traders[0].outcome}
                        </span>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-bold font-mono text-[#0F0F0F]">{formatCompact(totalValue)}</p>
                      <p className="text-[10px] text-[#9CA3AF]">{traders.length} whale{traders.length > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>

                {/* Individual trader positions */}
                {traders.map((p, i) => (
                  <a
                    key={i}
                    href={`https://polymarketanalytics.com/traders/${p.trader_wallet}#trades`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.04] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center text-xs font-bold text-[#6B7280] flex-shrink-0">
                      {p.trader_rank > 0 ? `#${p.trader_rank}` : p.trader_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F0F0F] truncate">{p.trader_name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF]">
                        <span>{p.trader_win_rate}% win</span>
                        <span>·</span>
                        <span className={p.trader_pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}>
                          {formatCompact(p.trader_pnl)} PnL
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                        p.outcome === "Yes" || p.outcome === "Over"
                          ? "bg-[#D1FAE5] text-[#065F46]"
                          : "bg-[#FEE2E2] text-[#991B1B]"
                      }`}>
                        {p.outcome}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-sm font-bold font-mono text-[#0F0F0F]">{formatCompact(p.value)}</p>
                      <p className={`text-[10px] font-mono ${p.pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                        {p.pnl >= 0 ? "+" : ""}{formatCompact(p.pnl)}
                      </p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" className="flex-shrink-0">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
