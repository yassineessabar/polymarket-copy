"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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

const DOT_COLORS = [
  "#009D55",
  "#22c55e",
  "#60a5fa",
  "#f59e0b",
  "#DC2626",
  "#a78bfa",
  "#06b6d4",
  "#ec4899",
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
  colorIndex: number;
  positions: { title: string; outcome: string; pnl: number; image?: string }[];
  equityData: { day: number; value: number }[];
}

function truncateWallet(wallet: string): string {
  if (wallet.length <= 14) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
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

    const colorIdx = Math.abs(wallet.charCodeAt(2) || 0) % DOT_COLORS.length;

    if (strat) {
      const equityData = generateEquityData(strat.returnPct, 90);
      const holdings = generateHoldings(strat);
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
        colorIndex: colorIdx,
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
        colorIndex: colorIdx,
        positions: (data.positions || []).map((p: any) => ({
          title: p.title || "Unknown Market",
          outcome: p.outcome || "Yes",
          pnl: p.pnl || 0,
          image: p.image,
        })),
        equityData: data.equity_data || generateEquityData(50, 90),
      });
    } catch {
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
        colorIndex: colorIdx,
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[#F4F4F4] border-t-[#121212] rounded-full animate-spin" />
      </div>
    );
  }

  if (!trader) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#9B9B9B] text-sm font-medium">Trader not found</p>
      </div>
    );
  }

  const isPositivePnl = trader.pnlNum >= 0;
  const dotColor = DOT_COLORS[trader.colorIndex % DOT_COLORS.length];

  const stats = [
    {
      label: "PNL",
      value: `${isPositivePnl ? "+" : ""}${trader.pnl}`,
      colored: true,
    },
    {
      label: "Trades",
      value: trader.totalTrades.toLocaleString(),
      colored: false,
    },
    {
      label: "Win Rate",
      value: `${trader.winRate}%`,
      colored: true,
      isWinRate: true,
    },
    {
      label: "Avg Size",
      value: trader.avgSize,
      colored: false,
    },
    {
      label: "Trades/Day",
      value: trader.tradesPerDay,
      colored: false,
    },
    {
      label: "Categories",
      value: trader.topCategories,
      colored: false,
      isText: true,
    },
  ];

  return (
    <div className="pb-24">
      <div className="max-w-[700px] mx-auto">
        {/* Top nav */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/strategies"
            className="text-[#9B9B9B] hover:text-[#121212] p-1 transition-colors"
          >
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
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <button className="text-[#9B9B9B] hover:text-[#121212] p-1 transition-colors">
            <svg
              width="18"
              height="18"
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
        </div>

        {/* Hero */}
        <div className="animate-fade-up">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: dotColor }}
            />
            <h1 className="text-3xl sm:text-4xl font-bold text-[#121212]">
              {trader.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9B9B9B] font-mono">
              {truncateWallet(trader.wallet)}
            </span>
            {trader.rank > 0 && (
              <span className="text-xs text-[#656565] bg-[#F7F7F7] border border-black/5 px-2.5 py-0.5 rounded-full font-medium">
                #{trader.rank}
              </span>
            )}
            <a
              href={`https://polymarketanalytics.com/traders/${trader.wallet}#trades`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#009D55] font-medium hover:underline"
            >
              Polymarket Analytics
            </a>
          </div>
        </div>

        <div className="my-6 h-[1px] bg-[#F4F4F4]" />

        {/* Stats grid */}
        <div className="animate-fade-up delay-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="text-xs text-[#9B9B9B] font-medium mb-1.5">
                  {s.label}
                </div>
                {s.isText ? (
                  <div className="text-sm font-medium text-[#121212]">
                    {s.value}
                  </div>
                ) : (
                  <div
                    className={`text-xl sm:text-2xl font-bold ${
                      s.colored
                        ? s.isWinRate
                          ? trader.winRate >= 50
                            ? "text-[#009D55]"
                            : "text-[#DC2626]"
                          : isPositivePnl
                          ? "text-[#009D55]"
                          : "text-[#DC2626]"
                        : "text-[#121212]"
                    }`}
                  >
                    {s.value}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Equity chart */}
        <div className="mt-6 animate-fade-up delay-3">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-[#121212]">
                Equity Curve
              </span>
              <div className="flex gap-1 bg-[#F7F7F7] rounded-full p-1">
                {CHART_PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setChartPeriod(p)}
                    className={`text-xs font-medium px-3 py-1 rounded-full transition-all cursor-pointer ${
                      chartPeriod === p
                        ? "bg-[#121212] text-white"
                        : "text-[#9B9B9B] hover:text-[#656565]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[160px] sm:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={filteredEquity}
                  margin={{ top: 20, right: 20, bottom: 5, left: 20 }}
                >
                  <XAxis dataKey="day" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #F4F4F4",
                      borderRadius: "12px",
                      color: "#121212",
                      fontSize: "12px",
                      padding: "8px 12px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
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
                    stroke="#009D55"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "#009D55",
                      stroke: "#fff",
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
                        fill: "#009D55",
                        fontSize: 10,
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
                        fill: "#DC2626",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="my-6 h-[1px] bg-[#F4F4F4]" />

        {/* Positions */}
        <div className="animate-fade-up delay-4">
          <h2 className="text-xl font-bold text-[#121212] mb-3">Positions</h2>
          {trader.positions.length > 0 ? (
            <div className="space-y-2">
              {trader.positions.map((p, i) => {
                const isPositive = p.pnl >= 0;
                return (
                  <div
                    key={i}
                    className="bg-white rounded-2xl shadow-sm p-4 flex justify-between items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[#121212] truncate">
                        {p.title}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-semibold shrink-0 ${
                        isPositive ? "text-[#009D55]" : "text-[#DC2626]"
                      }`}
                    >
                      {formatPositionPnl(p.pnl)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-[#9B9B9B] text-2xl font-bold">&mdash;</p>
              <p className="text-[#9B9B9B] text-sm mt-2">
                No open positions.
              </p>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 mb-4">
          <button
            onClick={() => router.push("/wallet")}
            className="w-full h-14 bg-[#121212] text-white text-sm font-medium rounded-full transition-all hover:bg-[#121212]/90"
          >
            Deposit Funds
          </button>
        </div>
      </div>
    </div>
  );
}
