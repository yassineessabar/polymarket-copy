"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { traderApi } from "@/lib/api";
import { STRATEGIES, generateEquityData, generateHoldings } from "@/lib/strategies";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceDot,
} from "recharts";

const GRADIENTS = [
  "from-amber-400 to-pink-500",
  "from-pink-400 to-yellow-400",
  "from-blue-400 to-cyan-300",
  "from-green-400 to-emerald-600",
  "from-purple-500 to-indigo-600",
];

const CHART_PERIODS = ["7D", "30D", "90D"];

interface TraderData {
  wallet: string;
  name: string;
  pnl: string;
  pnlNum: number;
  totalTrades: number;
  winRate: number;
  avgSize: string;
  tradesPerDay: string;
  topCategories: string;
  rank: number;
  gradient: string;
  positions: { title: string; outcome: string; pnl: number; image?: string }[];
  equityData: { day: number; value: number }[];
}

function truncateWallet(wallet: string): string {
  if (wallet.length <= 14) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function truncateName(wallet: string): string {
  if (wallet.length <= 14) return wallet;
  return `${wallet.slice(0, 12)}...`;
}

function formatPnl(value: number): string {
  const abs = Math.abs(value);
  const sign = value >= 0 ? "+" : "-";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatPositionPnl(value: number): string {
  const abs = Math.abs(value);
  const sign = value >= 0 ? "+" : "-";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export default function TraderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const wallet = (params?.wallet as string) || "";
  const [trader, setTrader] = useState<TraderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState("30D");

  useEffect(() => {
    if (!wallet) return;
    loadTrader();
  }, [wallet]);

  async function loadTrader() {
    setLoading(true);

    const strat = Object.values(STRATEGIES).find(
      (s) => s.wallet.toLowerCase() === wallet.toLowerCase()
    );

    if (strat) {
      const equityData = generateEquityData(strat.returnPct, 90);
      const holdings = generateHoldings(strat);
      const idx = Math.abs(wallet.charCodeAt(2) || 0) % GRADIENTS.length;
      setTrader({
        wallet: strat.wallet,
        name: strat.name,
        pnl: strat.profit,
        pnlNum:
          parseFloat(strat.profit.replace(/[^0-9.-]/g, "")) *
          (strat.profit.includes("M")
            ? 1000000
            : strat.profit.includes("K")
            ? 1000
            : 1),
        totalTrades: parseInt(strat.trades.replace(/[^0-9]/g, "")),
        winRate: strat.winRate,
        avgSize: strat.avgTradeSize,
        tradesPerDay: (
          parseInt(strat.trades.replace(/[^0-9]/g, "")) / 30
        ).toFixed(1),
        topCategories: strat.categories.slice(0, 2).join(", "),
        rank: 1,
        gradient: GRADIENTS[idx],
        positions: holdings.map((h) => ({
          title: h.market,
          outcome: h.outcome,
          pnl:
            Math.round(
              (h.current - h.entry) *
                parseInt(h.size.replace(/[^0-9]/g, "")) *
                100
            ) / 100,
        })),
        equityData,
      });
      setLoading(false);
      return;
    }

    try {
      const data = await traderApi.one(wallet);
      const idx = Math.abs(wallet.charCodeAt(2) || 0) % GRADIENTS.length;
      setTrader({
        wallet,
        name: data.name || wallet.slice(0, 10),
        pnl: data.pnl || "$0",
        pnlNum: data.pnl_num || 0,
        totalTrades: data.total_trades || 0,
        winRate: data.win_rate || 0,
        avgSize: data.avg_size || "$0",
        tradesPerDay: data.trades_per_day || "0",
        topCategories:
          (data.categories || []).slice(0, 2).join(", ") || "Overall",
        rank: data.rank || 0,
        gradient: GRADIENTS[idx],
        positions: (data.positions || []).map((p: any) => ({
          title: p.title || "Unknown Market",
          outcome: p.outcome || "Yes",
          pnl: p.pnl || 0,
          image: p.image,
        })),
        equityData: data.equity_data || generateEquityData(50, 90),
      });
    } catch {
      const idx = Math.abs(wallet.charCodeAt(2) || 0) % GRADIENTS.length;
      setTrader({
        wallet,
        name: wallet.slice(0, 10),
        pnl: "$0",
        pnlNum: 0,
        totalTrades: 0,
        winRate: 0,
        avgSize: "$0",
        tradesPerDay: "0",
        topCategories: "Overall",
        rank: 0,
        gradient: GRADIENTS[idx],
        positions: [],
        equityData: generateEquityData(10, 90),
      });
    }
    setLoading(false);
  }

  const filteredEquity = useMemo(() => {
    if (!trader) return [];
    const data = trader.equityData;
    if (chartPeriod === "7D") return data.slice(-7);
    if (chartPeriod === "30D") return data.slice(-30);
    return data;
  }, [trader, chartPeriod]);

  const peakPoint = useMemo(() => {
    if (!filteredEquity.length) return null;
    return filteredEquity.reduce(
      (max, d) => (d.value > max.value ? d : max),
      filteredEquity[0]
    );
  }, [filteredEquity]);

  const troughPoint = useMemo(() => {
    if (!filteredEquity.length) return null;
    return filteredEquity.reduce(
      (min, d) => (d.value < min.value ? d : min),
      filteredEquity[0]
    );
  }, [filteredEquity]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: "#080B16" }}
      >
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!trader) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: "#080B16" }}
      >
        <p className="text-[#5A5F7A]">Trader not found</p>
      </div>
    );
  }

  const isPositivePnl = trader.pnlNum >= 0;

  return (
    <div
      className="max-w-[600px] mx-auto min-h-screen pb-24"
      style={{ backgroundColor: "#080B16" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => router.push("/strategies")}
          className="text-white p-1"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          {/* Share icon (arrow-up-from-square) */}
          <button className="text-[#8B8FA3] p-1">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
          {/* Bell icon */}
          <button className="text-[#8B8FA3] p-1">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Trader identity */}
      <div className="mt-4 px-4">
        <div className="flex items-start gap-4">
          <div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${trader.gradient} shrink-0`}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-lg truncate">
                {truncateName(trader.wallet)}
              </h1>
              {/* Blue external link icon */}
              <a
                href={`https://polymarket.com/profile/${trader.wallet}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 shrink-0"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </a>
            </div>
            <p className="text-[#5A5F7A] font-mono text-xs mt-0.5">
              {truncateWallet(trader.wallet)}
            </p>
            {trader.rank > 0 && (
              <span className="inline-block mt-1.5 bg-[#FFB800]/20 text-[#FFB800] rounded-full px-2 py-0.5 text-xs font-bold">
                #{trader.rank}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mt-5 px-4">
        {/* Row 1 */}
        <div>
          <div className="text-xs text-[#5A5F7A]">PnL</div>
          <div
            className={`text-lg font-bold ${
              isPositivePnl ? "text-[#00C853]" : "text-[#DC2626]"
            }`}
          >
            {isPositivePnl ? "+" : ""}
            {trader.pnl}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#5A5F7A]">Trades</div>
          <div className="text-lg font-bold text-white">
            {trader.totalTrades.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#5A5F7A]">Win Rate</div>
          <div
            className={`text-lg font-bold ${
              trader.winRate >= 50 ? "text-[#00C853]" : "text-[#DC2626]"
            }`}
          >
            {trader.winRate}%
          </div>
        </div>

        {/* Row 2 */}
        <div>
          <div className="text-xs text-[#5A5F7A]">Avg Size</div>
          <div className="text-lg font-bold text-white">{trader.avgSize}</div>
        </div>
        <div>
          <div className="text-xs text-[#5A5F7A]">Trades/Day</div>
          <div className="text-lg font-bold text-white">
            {trader.tradesPerDay}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#5A5F7A]">Top Categories</div>
          <div className="text-sm font-medium text-white">
            {trader.topCategories}
          </div>
        </div>
      </div>

      {/* Equity chart */}
      <div className="mt-4">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filteredEquity}
              margin={{ top: 20, right: 20, bottom: 5, left: 20 }}
            >
              <XAxis dataKey="day" hide />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1A1F35",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  "Value",
                ]}
                labelFormatter={(label: number) => `Day ${label}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00C853"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#00C853",
                  stroke: "#080B16",
                  strokeWidth: 2,
                }}
              />
              {peakPoint && (
                <ReferenceDot
                  x={peakPoint.day}
                  y={peakPoint.value}
                  r={0}
                  label={{
                    value: formatPnl(peakPoint.value),
                    position: "top",
                    fill: "#00C853",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              )}
              {troughPoint && troughPoint.value < 0 && (
                <ReferenceDot
                  x={troughPoint.day}
                  y={troughPoint.value}
                  r={0}
                  label={{
                    value: formatPnl(troughPoint.value),
                    position: "bottom",
                    fill: "#5A5F7A",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Time selector */}
        <div className="flex gap-2 justify-center mt-2">
          {CHART_PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setChartPeriod(p)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                chartPeriod === p
                  ? "bg-[#1E2235] text-white font-medium"
                  : "text-[#5A5F7A]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Positions section */}
      <div className="mt-6 px-4">
        <h2 className="text-lg font-bold text-white">Positions</h2>
        {trader.positions.length > 0 ? (
          <div className="space-y-2 mt-2">
            {trader.positions.map((p, i) => {
              const isPositive = p.pnl >= 0;
              return (
                <div
                  key={i}
                  className="bg-[#141728] rounded-xl p-3 flex items-center gap-3"
                >
                  {/* Position icon/image */}
                  <div className="w-10 h-10 rounded-lg bg-[#1E2235] shrink-0 overflow-hidden flex items-center justify-center">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#5A5F7A"
                        strokeWidth="1.5"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-sm font-medium truncate">
                      {p.title}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-bold shrink-0 ${
                      isPositive ? "text-[#00C853]" : "text-[#DC2626]"
                    }`}
                  >
                    {formatPositionPnl(p.pnl)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#141728] rounded-xl p-6 text-center mt-2">
            <p className="text-[#5A5F7A] text-sm">No open positions</p>
          </div>
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#141728] border-t border-white/[0.08] p-4 z-40">
        <div className="max-w-[600px] mx-auto">
          <button
            onClick={() => router.push("/wallet")}
            className="w-full bg-white text-[#0B0E1C] rounded-full py-3.5 font-semibold text-center text-sm"
          >
            Deposit funds to start copy trading
          </button>
        </div>
      </div>
    </div>
  );
}
