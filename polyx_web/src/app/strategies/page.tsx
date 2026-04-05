"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { copyApi, userApi } from "@/lib/api";
import { STRATEGY_LIST, STRATEGIES } from "@/lib/strategies";
import type { CopyTarget } from "@/lib/types";

export default function StrategiesPage() {
  const [targets, setTargets] = useState<CopyTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showCustomAdd, setShowCustomAdd] = useState(false);
  const [customWallet, setCustomWallet] = useState("");
  const [customName, setCustomName] = useState("");
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTargets();
  }, []);

  async function loadTargets() {
    try {
      const data = await copyApi.targets();
      setTargets(data.targets);
    } catch {}
    setLoading(false);
  }

  async function addCustomTarget() {
    if (!customWallet.startsWith("0x") || customWallet.length < 10) return;
    setAdding(true);
    try {
      await copyApi.addTarget(customWallet, customName || "Custom Trader");
      await loadTargets();
      setShowCustomAdd(false);
      setCustomWallet("");
      setCustomName("");
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

  async function removeTarget(wallet: string) {
    setToggling(wallet);
    try {
      await copyApi.removeTarget(wallet);
      await loadTargets();
    } catch {}
    setToggling(null);
  }

  const activeWallets = new Set(targets.map((t) => t.wallet_addr.toLowerCase()));

  const filtered = STRATEGY_LIST.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.manager.toLowerCase().includes(q) ||
      s.categories.some((c) => c.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-[600px] mx-auto px-4 pb-8">
      {/* Search bar */}
      <div className="relative mt-2 mb-6">
        <div
          className={`flex items-center bg-[#F4F4F5] rounded-full h-12 px-4 transition-all ${
            searchFocused ? "ring-2 ring-[#009D55]/30" : ""
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#737373"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search traders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            className="flex-1 bg-transparent outline-none text-[#121212] placeholder-[#737373] text-sm ml-3"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-[#737373] hover:text-[#121212]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Add custom wallet link */}
        {(searchFocused || showCustomAdd) && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowCustomAdd(true);
              setSearchFocused(false);
            }}
            className="mt-2 text-sm text-[#009D55] font-medium hover:underline"
          >
            + Add by wallet address
          </button>
        )}
      </div>

      {/* Inline custom wallet add */}
      {showCustomAdd && (
        <div className="bg-[#F4F4F5] rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[#121212]">Add Custom Wallet</span>
            <button
              onClick={() => setShowCustomAdd(false)}
              className="text-[#737373] hover:text-[#121212]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <input
            type="text"
            placeholder="0x..."
            value={customWallet}
            onChange={(e) => setCustomWallet(e.target.value)}
            className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-[#121212] placeholder-[#737373] outline-none border border-transparent focus:border-[#009D55] mb-2"
          />
          <input
            type="text"
            placeholder="Display name (optional)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-[#121212] placeholder-[#737373] outline-none border border-transparent focus:border-[#009D55] mb-3"
          />
          <button
            onClick={addCustomTarget}
            disabled={adding || !customWallet.startsWith("0x")}
            className="w-full bg-[#009D55] hover:bg-[#008548] text-white text-sm font-bold py-2.5 rounded-full transition-colors disabled:opacity-40"
          >
            {adding ? "Adding..." : "Add"}
          </button>
        </div>
      )}

      {/* Your Traders */}
      {targets.length > 0 && (
        <div className="mb-8">
          <p className="text-xs text-[#737373] uppercase tracking-wider font-medium mb-3">
            Your Traders
          </p>
          <div className="bg-white rounded-xl overflow-hidden">
            {targets.map((t, i) => {
              const strat = Object.values(STRATEGIES).find(
                (s) => s.wallet.toLowerCase() === t.wallet_addr.toLowerCase()
              );
              return (
                <div
                  key={t.id}
                  className={`flex items-center px-4 py-3.5 hover:bg-[#F4F4F5] transition-colors ${
                    i < targets.length - 1 ? "border-b border-[#F4F4F5]" : ""
                  }`}
                >
                  <Link
                    href={strat ? `/strategy/${strat.slug}` : "#"}
                    className="flex items-center flex-1 min-w-0"
                  >
                    {strat ? (
                      <img
                        src={strat.image}
                        alt={strat.name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#F4F4F5] flex items-center justify-center flex-shrink-0">
                        <span className="text-lg text-[#737373]">?</span>
                      </div>
                    )}
                    <div className="ml-3 min-w-0 flex-1">
                      <div className="text-base font-medium text-[#121212] truncate">
                        {t.display_name || t.wallet_addr.slice(0, 10)}
                      </div>
                      <div className="text-sm text-[#737373]">
                        {strat
                          ? `${strat.winRate}% win rate`
                          : `${t.wallet_addr.slice(0, 6)}...${t.wallet_addr.slice(-4)}`}
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-[#009D55] rounded-full animate-pulse" />
                      <span className="text-xs text-[#009D55] font-medium">Copying</span>
                    </div>
                    {strat && (
                      <Link
                        href={`/strategy/${strat.slug}`}
                        className="w-8 h-8 rounded-full hover:bg-[#F4F4F5] flex items-center justify-center"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </Link>
                    )}
                    <button
                      onClick={() => removeTarget(t.wallet_addr)}
                      disabled={toggling === t.wallet_addr}
                      className="text-xs text-[#DC2626] font-medium hover:underline disabled:opacity-50"
                    >
                      {toggling === t.wallet_addr ? "..." : "Stop"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Popular Traders */}
      <div>
        <p className="text-xs text-[#737373] uppercase tracking-wider font-medium mb-3">
          Popular
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-[#009D55] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-[#737373]">No traders found for "{search}"</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl overflow-hidden">
            {filtered.map((s, i) => {
              const isActive = activeWallets.has(s.wallet.toLowerCase());
              return (
                <Link
                  key={s.slug}
                  href={`/strategy/${s.slug}`}
                  className={`flex items-center px-4 py-3.5 hover:bg-[#F4F4F5] transition-colors ${
                    i < filtered.length - 1 ? "border-b border-[#F4F4F5]" : ""
                  }`}
                >
                  <img
                    src={s.image}
                    alt={s.name}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="ml-3 min-w-0 flex-1">
                    <div className="text-base font-medium text-[#121212] truncate">
                      {s.name}
                    </div>
                    <div className="text-sm text-[#737373]">
                      {s.winRate}% win rate &middot; {s.copiers} copiers
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 ml-3">
                    <span className="text-lg font-bold font-mono text-[#009D55]">
                      +{s.returnPct}%
                    </span>
                    {isActive ? (
                      <span className="flex items-center gap-1 text-xs text-[#009D55] font-medium">
                        <span className="w-1.5 h-1.5 bg-[#009D55] rounded-full animate-pulse" />
                        Copying
                      </span>
                    ) : (
                      <span className="text-xs text-[#009D55] font-medium">
                        Start Copying
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
