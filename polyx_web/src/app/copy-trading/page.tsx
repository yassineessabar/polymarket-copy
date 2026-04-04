"use client";

import { useEffect, useState } from "react";
import { copyApi } from "@/lib/api";
import { truncateAddress } from "@/lib/utils";
import type { CopyTarget, SuggestedTrader, CopyStatus } from "@/lib/types";

export default function CopyTradingPage() {
  const [targets, setTargets] = useState<CopyTarget[]>([]);
  const [suggested, setSuggested] = useState<SuggestedTrader[]>([]);
  const [status, setStatus] = useState<CopyStatus | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newAddr, setNewAddr] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [t, s, st] = await Promise.all([
        copyApi.targets(),
        copyApi.status(),
        copyApi.suggested(),
      ]);
      setTargets(t.targets);
      setStatus(s);
      setSuggested(st.traders);
    } catch {}
    setLoading(false);
  }

  async function addTarget(wallet: string, name: string) {
    setError("");
    setActionLoading(true);
    try {
      await copyApi.addTarget(wallet, name);
      setShowAdd(false);
      setNewAddr("");
      setNewName("");
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(false);
  }

  async function removeTarget(addr: string) {
    await copyApi.removeTarget(addr);
    await loadData();
  }

  async function toggleCopy() {
    setActionLoading(true);
    try {
      if (status?.active) {
        await copyApi.stop();
      } else {
        await copyApi.start();
      }
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[1100px]">
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold font-display">Copy Trading</h1>
        <button
          onClick={toggleCopy}
          disabled={actionLoading}
          className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex-shrink-0 ${
            status?.active
              ? "bg-red/10 text-red border border-red/20 hover:bg-red/20"
              : "bg-green/10 text-green border border-green/20 hover:bg-green/20"
          }`}
        >
          {actionLoading ? "..." : status?.active ? "Stop Copying" : "Start Copying"}
        </button>
      </div>

      {error && (
        <div className="bg-red/10 border border-red/20 text-red text-sm p-3 rounded-xl mb-4">{error}</div>
      )}

      {/* Status bar */}
      <div className="bg-bg-card border border-border rounded-xl sm:rounded-2xl p-3.5 sm:p-5 mb-4 sm:mb-6 flex flex-wrap items-center gap-3 sm:gap-6">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${status?.active ? "bg-green animate-pulse" : "bg-red"}`} />
          <span className="text-sm font-medium">{status?.active ? "Engine Running" : "Engine Stopped"}</span>
        </div>
        <div className="text-sm text-text-secondary">
          {status?.target_count || 0} targets &middot; {status?.open_positions || 0} open positions
          {status?.demo_mode && <span className="ml-2 text-accent">(Demo)</span>}
        </div>
      </div>

      {/* Active targets */}
      <div className="bg-bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Active Targets</h3>
          <button
            onClick={() => setShowAdd(true)}
            className="text-sm text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
          >
            <span className="text-lg">+</span> Add Target
          </button>
        </div>

        {targets.length === 0 ? (
          <div className="text-center py-8 text-text-secondary text-sm">
            No targets yet. Add a wallet to start copying.
          </div>
        ) : (
          <div className="space-y-3">
            {targets.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4 bg-bg-secondary rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-bg-card border border-border flex items-center justify-center text-lg">
                    {t.display_name?.charAt(0) === "\u{1F988}" || t.display_name?.charAt(0) === "\u{1F40B}" ? t.display_name?.charAt(0) : "🎯"}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{t.display_name || "Unknown"}</div>
                    <div className="text-xs text-text-muted font-mono">{truncateAddress(t.wallet_addr)}</div>
                  </div>
                </div>
                <button
                  onClick={() => removeTarget(t.wallet_addr)}
                  className="text-text-muted hover:text-red text-sm transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Target Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-bg-card border border-border rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-[420px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">Add Copy Target</h3>
            <input
              type="text"
              placeholder="Wallet address (0x...)"
              value={newAddr}
              onChange={(e) => setNewAddr(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-white placeholder-text-muted outline-none focus:border-accent transition-colors mb-3 text-sm font-mono"
            />
            <input
              type="text"
              placeholder="Display name (optional)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-white placeholder-text-muted outline-none focus:border-accent transition-colors mb-4 text-sm"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-bg-secondary border border-border text-white py-2.5 rounded-xl text-sm">Cancel</button>
              <button
                onClick={() => addTarget(newAddr, newName)}
                disabled={actionLoading || !newAddr}
                className="flex-1 bg-accent hover:bg-accent-hover text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {actionLoading ? "Adding..." : "Add Target"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggested Traders */}
      <div className="bg-bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Suggested Traders</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {suggested.map((t) => {
            const isAdded = targets.some((tgt) => tgt.wallet_addr.toLowerCase() === t.wallet.toLowerCase());
            return (
              <div key={t.wallet} className="bg-bg-secondary border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-2xl">{t.emoji}</div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-text-muted">{t.description}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center">
                    <div className="text-green font-semibold font-mono text-sm">{t.win_rate}%</div>
                    <div className="text-[10px] text-text-muted">Win Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold font-mono text-sm">{t.profit}</div>
                    <div className="text-[10px] text-text-muted">Profit</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold font-mono text-sm">{t.copiers}</div>
                    <div className="text-[10px] text-text-muted">Copiers</div>
                  </div>
                </div>
                <button
                  onClick={() => !isAdded && addTarget(t.wallet, `${t.emoji} ${t.name}`)}
                  disabled={isAdded}
                  className={`w-full py-2 rounded-xl text-sm font-medium transition-all ${
                    isAdded
                      ? "bg-green/10 text-green border border-green/20 cursor-default"
                      : "bg-accent hover:bg-accent-hover text-white"
                  }`}
                >
                  {isAdded ? "Added" : "Copy This Trader"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
