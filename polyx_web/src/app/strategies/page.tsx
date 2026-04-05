"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { copyApi } from "@/lib/api";
import { STRATEGY_LIST, STRATEGIES } from "@/lib/strategies";
import type { CopyTarget } from "@/lib/types";
import { Button, Card, Input, Badge, Spinner } from "@/components/ui";
import { IconSearch, IconClose, IconSettings } from "@/components/ui";
import { TraderRow } from "@/components";

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
          className={`flex items-center bg-[#F4F4F5] rounded-xl h-12 px-4 transition-all ${
            searchFocused ? "ring-2 ring-[#009D55]/30" : ""
          }`}
        >
          <IconSearch size={18} className="text-[#737373] flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search traders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            className="flex-1 bg-transparent outline-none text-[#0F0F0F] placeholder-[#737373] text-sm ml-3"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-[#737373] hover:text-[#0F0F0F]">
              <IconClose size={16} />
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
        <Card className="mb-6 bg-[#F4F4F5]" noBorder>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[#0F0F0F]">Add Custom Wallet</span>
            <button onClick={() => setShowCustomAdd(false)} className="text-[#737373] hover:text-[#0F0F0F]">
              <IconClose size={16} />
            </button>
          </div>
          <Input
            placeholder="0x..."
            value={customWallet}
            onChange={(e) => setCustomWallet(e.target.value)}
            className="mb-2"
          />
          <Input
            placeholder="Display name (optional)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="mb-3"
          />
          <Button
            onClick={addCustomTarget}
            disabled={adding || !customWallet.startsWith("0x")}
            loading={adding}
            fullWidth
            className="bg-[#009D55] hover:bg-[#008548]"
          >
            Add
          </Button>
        </Card>
      )}

      {/* Your Traders */}
      {targets.length > 0 && (
        <div className="mb-8">
          <p className="text-xs text-[#737373] uppercase tracking-wider font-medium mb-3">
            Your Traders
          </p>
          <Card padding="none" className="overflow-hidden">
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
                      <img src={strat.image} alt={strat.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#F4F4F5] flex items-center justify-center flex-shrink-0">
                        <span className="text-lg text-[#737373]">?</span>
                      </div>
                    )}
                    <div className="ml-3 min-w-0 flex-1">
                      <div className="text-base font-medium text-[#0F0F0F] truncate">
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
                    <Badge variant="active">Following</Badge>
                    {strat && (
                      <Link
                        href={`/strategy/${strat.slug}`}
                        className="w-8 h-8 rounded-xl hover:bg-[#F4F4F5] flex items-center justify-center"
                      >
                        <IconSettings size={16} className="text-[#737373]" />
                      </Link>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeTarget(t.wallet_addr)}
                      disabled={toggling === t.wallet_addr}
                      loading={toggling === t.wallet_addr}
                    >
                      Stop
                    </Button>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* Popular Traders */}
      <div>
        <p className="text-xs text-[#737373] uppercase tracking-wider font-medium mb-3">
          Popular
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-[#737373]">No traders found for &quot;{search}&quot;</p>
          </div>
        ) : (
          <Card padding="none" className="overflow-hidden">
            {filtered.map((s) => {
              const isActive = activeWallets.has(s.wallet.toLowerCase());
              return (
                <TraderRow
                  key={s.slug}
                  name={s.name}
                  image={s.image}
                  subtitle={`${s.winRate}% win rate \u00b7 ${s.copiers} followers`}
                  returnPct={s.returnPct}
                  status={isActive ? "following" : "available"}
                  href={`/strategy/${s.slug}`}
                />
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}
