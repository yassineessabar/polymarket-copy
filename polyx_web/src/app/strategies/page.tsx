"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { copyApi, traderApi, portfolioApi } from "@/lib/api";
import { STRATEGY_LIST, STRATEGIES } from "@/lib/strategies";
import type { CopyTarget } from "@/lib/types";

const GRADIENTS = [
  "from-amber-400 to-pink-500",
  "from-blue-400 to-cyan-300",
  "from-green-400 to-emerald-600",
  "from-purple-500 to-indigo-600",
  "from-orange-400 to-red-500",
  "from-pink-400 to-purple-500",
  "from-teal-400 to-blue-500",
  "from-yellow-400 to-orange-500",
];

const CATEGORIES = ["Overall", "Crypto", "Politics", "Sports", "Culture"];
const TIME_PERIODS = ["7D", "30D", "ALL"];

interface TraderRow {
  wallet: string;
  name: string;
  pnl: string;
  pnlNum: number;
  winRate: number;
  rank: number;
  categories: string[];
  gradient: string;
}

export default function StrategiesPage() {
  const router = useRouter();
  const [targets, setTargets] = useState<CopyTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customWallet, setCustomWallet] = useState("");
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("Overall");
  const [selectedPeriod, setSelectedPeriod] = useState("30D");
  const [showMyTraders, setShowMyTraders] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiTraders, setApiTraders] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    loadTargets();
    loadTraders();
    loadBalance();
  }, []);

  async function loadTargets() {
    try {
      const data = await copyApi.targets();
      setTargets(data.targets);
    } catch {}
    setLoading(false);
  }

  async function loadTraders() {
    try {
      const data = await traderApi.all();
      setApiTraders(data.traders || []);
    } catch {}
  }

  async function loadBalance() {
    try {
      const data = await portfolioApi.summary();
      setBalance(data.balance_usdc || 0);
    } catch {}
  }

  async function addCustomTarget() {
    if (!customWallet.startsWith("0x") || customWallet.length < 10) return;
    setAdding(true);
    try {
      await copyApi.addTarget(customWallet, "Custom Trader");
      await loadTargets();
      setShowAddModal(false);
      setCustomWallet("");
    } catch {}
    setAdding(false);
  }

  async function addStrategyTarget(wallet: string, name: string) {
    setToggling(wallet);
    try {
      await copyApi.addTarget(wallet, name);
      await copyApi.start();
      await loadTargets();
    } catch {}
    setToggling(null);
  }

  const activeWallets = new Set(targets.map((t) => t.wallet_addr.toLowerCase()));

  const traders: TraderRow[] = useMemo(() => {
    const fromStrategies: TraderRow[] = STRATEGY_LIST.map((s, i) => ({
      wallet: s.wallet,
      name: s.name,
      pnl: s.profit,
      pnlNum:
        parseFloat(s.profit.replace(/[^0-9.-]/g, "")) *
        (s.profit.includes("M") ? 1000000 : s.profit.includes("K") ? 1000 : 1),
      winRate: s.winRate,
      rank: i + 1,
      categories: s.categories,
      gradient: s.gradient,
    }));

    const fromApi: TraderRow[] = apiTraders
      .filter(
        (t: any) =>
          !fromStrategies.some(
            (s) => s.wallet.toLowerCase() === (t.wallet || "").toLowerCase()
          )
      )
      .map((t: any, i: number) => ({
        wallet: t.wallet || "",
        name: t.name || t.wallet?.slice(0, 10) || "Unknown",
        pnl: t.pnl || "$0",
        pnlNum: t.pnl_num || 0,
        winRate: t.win_rate || 0,
        rank: fromStrategies.length + i + 1,
        categories: t.categories || ["Overall"],
        gradient: GRADIENTS[(fromStrategies.length + i) % GRADIENTS.length],
      }));

    let combined = [...fromStrategies, ...fromApi];
    combined.sort((a, b) => b.pnlNum - a.pnlNum);
    combined = combined.map((t, i) => ({ ...t, rank: i + 1 }));

    if (showMyTraders) {
      combined = combined.filter((t) =>
        activeWallets.has(t.wallet.toLowerCase())
      );
    }

    if (selectedCategory !== "Overall") {
      combined = combined.filter((t) =>
        t.categories.some((c) =>
          c.toLowerCase().includes(selectedCategory.toLowerCase())
        )
      );
    }

    return combined;
  }, [apiTraders, showMyTraders, selectedCategory, activeWallets]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return traders.slice(0, 20);
    const q = searchQuery.toLowerCase();
    return traders.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || t.wallet.toLowerCase().includes(q)
    );
  }, [searchQuery, traders]);

  function formatPnl(pnl: string) {
    if (pnl.startsWith("-")) return pnl;
    if (pnl.startsWith("+")) return pnl;
    return `+${pnl}`;
  }

  function truncateName(name: string, max: number = 16) {
    if (name.length <= max) return name;
    return name.slice(0, max) + "...";
  }

  return (
    <div className="min-h-screen bg-[#080B16]">
      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Top Traders</h1>
          <span className="text-white text-sm">
            Available ${balance.toFixed(0)}
          </span>
        </div>

        {/* Action buttons row */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-1.5 bg-[#1E2235] rounded-full px-4 py-2 text-sm text-white"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            Search
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-[#1E2235] rounded-full px-4 py-2 text-sm text-white"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Custom
          </button>
          <button
            onClick={() => setShowMyTraders(!showMyTraders)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm ${
              showMyTraders
                ? "bg-[#1E2235] text-white font-medium"
                : "bg-[#1E2235] text-white"
            }`}
          >
            My traders
          </button>
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm ${
                selectedCategory === cat
                  ? "bg-[#1E2235] text-white font-medium"
                  : "text-[#5A5F7A]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Time period */}
        <div className="flex gap-1 mt-3">
          {TIME_PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`rounded-full px-3 py-1 text-sm ${
                selectedPeriod === p
                  ? "bg-[#1E2235] rounded-full text-white font-medium"
                  : "text-[#5A5F7A]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Start copy trading CTA card */}
        <div className="mt-4 bg-gradient-to-r from-[#3B5BFE] via-[#9B59B6] via-[#E91E63] to-[#00C853] p-[2px] rounded-2xl">
          <div className="bg-[#141728] rounded-2xl p-4 flex items-center gap-3">
            <div className="bg-[#1E2235] w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <span className="text-white font-medium">Start copy trading</span>
          </div>
        </div>

        {/* Trader list */}
        {loading ? (
          <div className="flex items-center justify-center h-40 mt-4">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="mt-4 space-y-1">
            {traders.map((t, i) => {
              const isPositive = t.pnlNum >= 0;
              return (
                <button
                  key={t.wallet}
                  onClick={() => router.push(`/trader/${t.wallet}`)}
                  className="w-full flex items-center gap-3 py-3 text-left"
                >
                  {/* Large gradient avatar */}
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${
                      t.gradient || GRADIENTS[i % GRADIENTS.length]
                    } shrink-0`}
                  />
                  {/* Middle: name + rank */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-white truncate">
                        {truncateName(t.name)}
                      </span>
                      {/* Blue verified/chain icon */}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="#3B82F6"
                        className="shrink-0"
                      >
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <span className="text-xs text-[#5A5F7A]">
                      Top {t.rank <= 10 ? 10 : t.rank}
                    </span>
                  </div>
                  {/* Right: PnL + WR */}
                  <div className="text-right shrink-0">
                    <div
                      className={`font-bold ${
                        isPositive ? "text-[#00C853]" : "text-[#DC2626]"
                      }`}
                    >
                      {formatPnl(t.pnl)}
                    </div>
                    <div
                      className={`text-sm ${
                        isPositive ? "text-[#00C853]" : "text-[#DC2626]"
                      }`}
                    >
                      {t.winRate}% WR
                    </div>
                  </div>
                </button>
              );
            })}

            {traders.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[#5A5F7A] text-sm">No traders found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Modal (bottom sheet) */}
      {showSearchModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#141728] rounded-t-3xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[#2A2F45] rounded-full mx-auto mb-4" />
            </div>

            <div className="px-5 pb-3 flex items-center justify-between">
              <h3 className="text-white font-bold text-base">
                Search Traders
              </h3>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-[#5A5F7A] hover:text-white transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 pb-3">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5F7A]"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name or wallet address..."
                  autoFocus
                  className="w-full bg-[#1E2235] rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#5A5F7A] outline-none text-sm"
                />
              </div>
            </div>

            <div className="px-5 mt-4 mb-2">
              <span className="text-xs text-[#5A5F7A] uppercase tracking-wider">
                TOP TRADERS
              </span>
            </div>

            <div className="overflow-y-auto px-5 pb-8 flex-1">
              {searchResults.map((t, i) => {
                const isPositive = t.pnlNum >= 0;
                return (
                  <button
                    key={t.wallet}
                    onClick={() => {
                      setShowSearchModal(false);
                      router.push(`/trader/${t.wallet}`);
                    }}
                    className="w-full flex items-center gap-3 py-3 border-b border-white/[0.06] last:border-0 text-left"
                  >
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                        t.gradient || GRADIENTS[i % GRADIENTS.length]
                      } shrink-0`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {t.name}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-bold ${
                        isPositive ? "text-[#00C853]" : "text-[#DC2626]"
                      }`}
                    >
                      {formatPnl(t.pnl)}
                    </div>
                  </button>
                );
              })}
              {searchResults.length === 0 && (
                <p className="text-[#5A5F7A] text-sm text-center py-8">
                  No results found
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Modal (bottom sheet) */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#141728] rounded-t-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-[#2A2F45] rounded-full mx-auto mb-4" />
            </div>

            <div className="px-5 pb-3 flex items-center justify-between">
              <h3 className="text-white font-bold text-base">
                Add Custom Address
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#5A5F7A] hover:text-white transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 pb-8">
              <p className="text-sm text-[#8B8FA3] mb-5">
                Enter a Polymarket wallet address to copy their trades.
                We&apos;ll verify it&apos;s not a high-frequency trading bot.
              </p>

              <label className="block text-sm text-white mb-2">
                Wallet Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customWallet}
                onChange={(e) => setCustomWallet(e.target.value)}
                placeholder="0x..."
                className="w-full bg-[#1E2235] rounded-xl px-4 py-3 text-white placeholder-[#5A5F7A] outline-none text-sm mb-5"
              />

              <button
                onClick={addCustomTarget}
                disabled={
                  adding ||
                  !customWallet.startsWith("0x") ||
                  customWallet.length < 10
                }
                className={`w-full rounded-full py-3 font-medium text-sm transition-all ${
                  customWallet.startsWith("0x") && customWallet.length >= 10
                    ? "bg-white text-[#0B0E1C]"
                    : "bg-[#1E2235] text-[#5A5F7A]"
                }`}
              >
                {adding ? "Adding..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
