"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { portfolioApi, copyApi, notificationsApi } from "@/lib/api";
import { formatUsd, formatPnl } from "@/lib/utils";
import type { PortfolioSummary, CopyStatus, Notification } from "@/lib/types";
import { Button, Card, Badge, Spinner } from "@/components/ui";
import { EquityChart, EmptyState } from "@/components";

type TimePeriod = "1W" | "1M" | "3M" | "YTD" | "ALL";

export default function DashboardPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [perfData, setPerfData] = useState<any[]>([]);
  const [equityPeriod, setEquityPeriod] = useState<TimePeriod>("1M");

  const loadData = useCallback(async () => {
    try {
      const [s, cs, n, perf] = await Promise.all([
        portfolioApi.summary(),
        copyApi.status(),
        notificationsApi.list(false, 5),
        portfolioApi.performance(365).catch(() => ({ daily: [] })),
      ]);
      setSummary(s);
      setCopyStatus(cs);
      setNotifications(n.notifications);
      setPerfData(perf.daily || []);
      setError("");
      try {
        const trades = await portfolioApi.trades(5, 0);
        setRecentTrades(trades.trades || []);
      } catch {}
    } catch (e: any) {
      setError(e.message || "Failed to load");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chartData = useMemo(() => {
    if (perfData.length > 0) return perfData;
    const val = summary?.net_worth || 0;
    const data = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      data.push({ date: d.toISOString().split("T")[0], value: val });
    }
    return data;
  }, [perfData, summary]);

  const equityData = useMemo(() => {
    if (!chartData.length) return [];
    const now = new Date();
    let cutoffDate: Date;
    if (equityPeriod === "YTD") {
      cutoffDate = new Date(now.getFullYear(), 0, 1);
    } else if (equityPeriod === "ALL") {
      return chartData;
    } else {
      const days: Record<string, number> = { "1W": 7, "1M": 30, "3M": 90 };
      cutoffDate = new Date();
      cutoffDate.setDate(now.getDate() - days[equityPeriod]);
    }
    const cutoffStr = cutoffDate.toISOString().split("T")[0];
    return chartData.filter((d: any) => d.date >= cutoffStr);
  }, [chartData, equityPeriod]);

  const periodReturn = useMemo(() => {
    if (equityData.length < 2) return { amount: 0, pct: 0 };
    const first = equityData[0]?.value || 0;
    const last = equityData[equityData.length - 1]?.value || 0;
    const amount = last - first;
    const pct = first > 0 ? (amount / first) * 100 : 0;
    return { amount, pct };
  }, [equityData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-24">
        <Spinner />
      </div>
    );
  }

  const pnl = summary?.daily_pnl || 0;
  const netWorth = summary?.net_worth || 0;
  const isUp = periodReturn.amount >= 0;

  return (
    <div>
      {error && (
        <div className="bg-[#FEF2F2] text-[#EF4444] text-sm p-3 rounded-xl mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadData()} className="text-xs font-medium underline ml-2">Retry</button>
        </div>
      )}

      {/* Section 1: Portfolio Value */}
      <div className="pt-2 mb-8">
        <p className="text-[#9CA3AF] text-xs uppercase tracking-[0.05em] font-medium mb-1">Portfolio</p>
        <p className="text-[36px] font-bold -tracking-[0.02em] text-[#0F0F0F] leading-none font-mono">
          {formatUsd(netWorth)}
        </p>
        <p className={`text-sm font-medium mt-1.5 ${isUp ? "text-[#10B981]" : "text-[#EF4444]"}`}>
          {isUp ? "+" : ""}{formatPnl(periodReturn.amount)}{" "}
          ({isUp ? "+" : ""}{periodReturn.pct.toFixed(2)}%){" "}
          <span className="text-[#9CA3AF] font-normal">
            {equityPeriod === "1W" ? "this week" : equityPeriod === "1M" ? "this month" : equityPeriod === "3M" ? "3 months" : equityPeriod === "YTD" ? "this year" : "all time"}
          </span>
        </p>

        <div className="mt-4 -mx-2">
          <EquityChart
            data={equityData}
            height={180}
            positive={isUp}
            period={equityPeriod}
            onPeriodChange={(p) => setEquityPeriod(p as TimePeriod)}
          />
        </div>
      </div>

      {/* Section 2: Active Traders */}
      <div className="mt-8">
        <p className="text-[#9CA3AF] text-xs uppercase tracking-[0.05em] font-medium mb-3">Active Traders</p>

        {copyStatus?.active ? (
          <Card>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#0F0F0F]">
                  Following {copyStatus.target_count} trader{copyStatus.target_count !== 1 ? "s" : ""}
                </p>
              </div>
              <span className="text-xs text-[#6B7280]">{copyStatus.open_positions} open positions</span>
              <Button variant="ghost" size="sm" href="/strategies">View</Button>
            </div>
          </Card>
        ) : (
          <EmptyState
            title="Start automated trading"
            subtitle="Follow top traders and mirror their positions automatically"
            action={<Button href="/strategies">Browse Traders</Button>}
          />
        )}
      </div>

      {/* Section 3: Activity */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[#9CA3AF] text-xs uppercase tracking-[0.05em] font-medium">Recent</p>
          {(notifications.length > 0 || recentTrades.length > 0) && (
            <Button variant="ghost" size="sm" href="/notifications">See all</Button>
          )}
        </div>

        {notifications.length > 0 ? (
          <Card padding="none" className="overflow-hidden">
            {notifications.slice(0, 5).map((n) => {
              let text = n.payload;
              try { text = JSON.parse(n.payload).text || n.payload; } catch {}
              const clean = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
              const isBuy = n.type === "BUY";
              const isSell = n.type === "SELL" || n.type === "CLOSE";
              return (
                <div key={n.id} className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.04] last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isBuy ? "bg-[#10B981]" : isSell ? "bg-[#EF4444]" : "bg-[#9CA3AF]"}`} />
                  <Badge variant={isBuy ? "success" : isSell ? "danger" : "neutral"}>{n.type}</Badge>
                  <span className="text-sm text-[#6B7280] flex-1 truncate">{clean.slice(0, 80)}</span>
                  <span className="text-xs text-[#9CA3AF] flex-shrink-0">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </Card>
        ) : recentTrades.length > 0 ? (
          <Card padding="none" className="overflow-hidden">
            {recentTrades.slice(0, 5).map((t: any, i: number) => {
              const isBuy = t.side === "BUY";
              return (
                <div key={t.id || i} className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.04] last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isBuy ? "bg-[#10B981]" : "bg-[#EF4444]"}`} />
                  <Badge variant={isBuy ? "success" : "danger"}>{t.side}</Badge>
                  <span className="text-sm text-[#6B7280] flex-1 truncate">
                    {t.amount_usdc ? `$${Number(t.amount_usdc).toFixed(2)}` : ""} {t.is_copy ? "(auto)" : ""}
                  </span>
                  <span className="text-xs text-[#9CA3AF] flex-shrink-0">
                    {t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
              );
            })}
          </Card>
        ) : (
          <EmptyState title="No activity yet" />
        )}
      </div>
    </div>
  );
}
