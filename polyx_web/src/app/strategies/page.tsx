"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { copyApi } from "@/lib/api";
import { STRATEGY_LIST, STRATEGIES } from "@/lib/strategies";
import type { CopyTarget } from "@/lib/types";

export default function StrategiesPage() {
  const [targets, setTargets] = useState<CopyTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customWallet, setCustomWallet] = useState("");
  const [customName, setCustomName] = useState("");
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

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
      setShowAddModal(false);
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

  return (
    <div className="max-w-[900px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-4 sm:mb-6 text-[#121212]">Strategies</h1>

      {/* Your Active Strategies */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm sm:text-base text-[#121212]">Your Active Strategies</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs text-[#121212] font-medium underline"
          >
            + Add Custom
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-6 h-6 border-2 border-[#121212] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : targets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[#9B9B9B] font-medium mb-3">No active strategies yet</p>
            <p className="text-xs text-[#9B9B9B] font-medium">Pick a strategy below to start copying</p>
          </div>
        ) : (
          <div className="space-y-0">
            {targets.map((t) => {
              const strat = Object.values(STRATEGIES).find(
                (s) => s.wallet.toLowerCase() === t.wallet_addr.toLowerCase()
              );
              return (
                <div key={t.id} className="flex items-center justify-between py-3 border-b border-black/5 last:border-0">
                  <div className="flex items-center gap-3">
                    {strat && (
                      <img src={strat.image} alt={strat.name} className="w-9 h-9 rounded-xl object-cover" />
                    )}
                    <div>
                      <div className="text-sm font-bold text-[#121212]">{t.display_name || t.wallet_addr.slice(0, 10)}</div>
                      <div className="text-[10px] text-[#9B9B9B] font-mono font-medium">
                        {t.wallet_addr.slice(0, 8)}...{t.wallet_addr.slice(-6)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeTarget(t.wallet_addr)}
                    disabled={toggling === t.wallet_addr}
                    className="text-xs text-[#DC2626] font-medium hover:underline disabled:opacity-50"
                  >
                    {toggling === t.wallet_addr ? "..." : "Stop"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Discover Strategies */}
      <div>
        <h2 className="font-bold text-sm sm:text-base mb-4 text-[#121212]">Discover Strategies</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STRATEGY_LIST.map((s) => {
            const isActive = activeWallets.has(s.wallet.toLowerCase());
            return (
              <div key={s.slug} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                <Link href={`/strategy/${s.slug}`} className="block h-36 sm:h-40 relative overflow-hidden">
                  <img
                    src={s.image}
                    alt={s.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {s.featured && (
                    <div className="absolute top-2.5 right-2.5 bg-white/90 text-[#121212] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Featured
                    </div>
                  )}
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <div className="flex items-center gap-2">
                      <img src={s.image} alt={s.manager} className="w-8 h-8 rounded-full object-cover border-2 border-white/30" />
                      <span className="text-white text-sm font-bold drop-shadow-sm">{s.name}</span>
                    </div>
                    <span className="text-white/90 font-bold font-mono text-xs bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5">+{s.returnPct}%</span>
                  </div>
                </Link>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <Link href={`/strategy/${s.slug}`} className="font-bold text-sm text-[#121212] hover:underline transition-colors">
                      {s.name}
                    </Link>
                    <span className="text-[#009D55] font-bold font-mono text-xs">+{s.returnPct}%</span>
                  </div>
                  <p className="text-[10px] text-[#9B9B9B] font-medium mb-3">
                    {s.winRate}% win &middot; {s.copiers} copiers &middot; {s.trades} trades
                  </p>
                  {isActive ? (
                    <div className="flex items-center gap-2 text-[#009D55] text-xs font-bold">
                      <span className="w-2 h-2 bg-[#009D55] rounded-full animate-pulse" />
                      Active
                    </div>
                  ) : (
                    <button
                      onClick={() => addStrategyTarget(s.wallet, s.name)}
                      disabled={toggling === s.wallet}
                      className="w-full bg-[#121212] hover:bg-[#333] text-white text-xs font-medium py-2.5 rounded-full transition-all disabled:opacity-50"
                    >
                      {toggling === s.wallet ? "Adding..." : "Start Copying"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Custom Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[420px] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-[#121212]">Add Custom Wallet</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#9B9B9B] hover:text-[#121212]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-sm text-[#9B9B9B] font-medium mb-4">
              Paste any Polymarket wallet address to start copying their trades.
            </p>
            <input
              type="text"
              placeholder="0x..."
              value={customWallet}
              onChange={(e) => setCustomWallet(e.target.value)}
              className="w-full bg-[#F7F7F7] border border-black/5 rounded-full px-5 py-3 text-[#121212] placeholder-[#BFBFBF] outline-none focus:border-[#121212] transition-colors mb-3"
            />
            <input
              type="text"
              placeholder="Display name (optional)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full bg-[#F7F7F7] border border-black/5 rounded-full px-5 py-3 text-[#121212] placeholder-[#BFBFBF] outline-none focus:border-[#121212] transition-colors mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 border border-[#121212] text-[#121212] font-medium py-2.5 rounded-full transition-all text-sm hover:bg-[#F7F7F7]"
              >
                Cancel
              </button>
              <button
                onClick={addCustomTarget}
                disabled={adding || !customWallet.startsWith("0x")}
                className="flex-1 bg-[#121212] hover:bg-[#333] text-white font-medium py-2.5 rounded-full transition-all disabled:opacity-50 text-sm"
              >
                {adding ? "Adding..." : "Add Target"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
