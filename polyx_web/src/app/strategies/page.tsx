"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { copyApi, traderApi } from "@/lib/api";
import { STRATEGY_LIST, STRATEGIES, mergeWithLiveData } from "@/lib/strategies";
import type { CopyTarget } from "@/lib/types";
import { Button, Card, Input, Badge, Spinner } from "@/components/ui";
import { IconSearch, IconClose, IconSettings, IconExternalLink } from "@/components/ui";

export default function StrategiesPage() {
  const [targets, setTargets] = useState<CopyTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [liveStrategies, setLiveStrategies] = useState(STRATEGY_LIST);

  useEffect(() => {
    traderApi.all().then((data) => {
      const liveMap: Record<string, any> = {};
      for (const t of data.traders) {
        liveMap[t.wallet?.toLowerCase()] = t;
      }
      const updated = STRATEGY_LIST.map((s) => {
        const live = liveMap[s.wallet.toLowerCase()];
        return live ? mergeWithLiveData(s, live) : s;
      });
      setLiveStrategies(updated);
    }).catch(() => {});
  }, []);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showCustomAdd, setShowCustomAdd] = useState(false);
  const [customWallet, setCustomWallet] = useState("");
  const [customName, setCustomName] = useState("");
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadTargets(); }, []);

  async function loadTargets() {
    try { const data = await copyApi.targets(); setTargets(data.targets); } catch {}
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
    try { await copyApi.addTarget(wallet, name); await copyApi.start(); await loadTargets(); } catch {}
    setToggling(null);
  }

  async function removeTarget(wallet: string) {
    setToggling(wallet);
    try { await copyApi.removeTarget(wallet); await loadTargets(); } catch {}
    setToggling(null);
  }

  const activeWallets = new Set(targets.map((t) => t.wallet_addr.toLowerCase()));

  const filtered = liveStrategies.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.manager.toLowerCase().includes(q) || s.categories.some((c) => c.toLowerCase().includes(q));
  });

  return (
    <div className="max-w-[700px] mx-auto">
      {/* Hero */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-primary)] -tracking-[0.02em]">Discover Traders</h1>
        <p className="text-sm text-[var(--color-secondary)] mt-1">Follow top-performing traders and let your capital work on autopilot.</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <div className={`flex items-center bg-[var(--color-surface)] rounded-xl h-12 px-4 transition-all duration-150 ${searchFocused ? "ring-2 ring-black/10" : ""}`}>
          <IconSearch size={18} className="text-[var(--color-muted)] flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search by name, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            className="flex-1 bg-transparent outline-none text-[var(--color-primary)] placeholder-[var(--color-muted)] text-sm ml-3"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-[var(--color-muted)] hover:text-[var(--color-primary)]">
              <IconClose size={16} />
            </button>
          )}
        </div>
        {(searchFocused || showCustomAdd) && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setShowCustomAdd(true); setSearchFocused(false); }}
            className="mt-2 text-sm text-[var(--color-primary)] font-medium hover:underline"
          >
            + Add by wallet address
          </button>
        )}
      </div>

      {/* Custom wallet add */}
      {showCustomAdd && (
        <Card className="mb-6 bg-[var(--color-surface)]" noBorder>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--color-primary)]">Add Custom Wallet</span>
            <button onClick={() => setShowCustomAdd(false)} className="text-[var(--color-muted)] hover:text-[var(--color-primary)]">
              <IconClose size={16} />
            </button>
          </div>
          <Input placeholder="0x..." value={customWallet} onChange={(e) => setCustomWallet(e.target.value)} className="mb-2" />
          <Input placeholder="Display name (optional)" value={customName} onChange={(e) => setCustomName(e.target.value)} className="mb-3" />
          <Button onClick={addCustomTarget} disabled={adding || !customWallet.startsWith("0x")} loading={adding} fullWidth>Add Trader</Button>
        </Card>
      )}

      {/* Your Active Traders */}
      {targets.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-[0.08em] font-medium">Following ({targets.length})</p>
          </div>
          <div className="space-y-2">
            {targets.map((t) => {
              const strat = Object.values(STRATEGIES).find((s) => s.wallet.toLowerCase() === t.wallet_addr.toLowerCase());
              return (
                <Card key={t.id} padding="none" className="overflow-hidden">
                  <div className="flex items-center p-3 gap-3">
                    <Link href={strat ? `/strategy/${strat.slug}` : "#"} className="flex items-center gap-3 flex-1 min-w-0">
                      {strat ? (
                        <img src={strat.image} alt={strat.name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0 text-sm font-bold text-[var(--color-muted)]">
                          {(t.display_name || "?").charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-primary)] truncate">{t.display_name || t.wallet_addr.slice(0, 10)}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="active">Active</Badge>
                          {strat && <span className="text-xs text-[var(--color-secondary)]">{strat.winRate}% win rate</span>}
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Link href="/settings" className="w-8 h-8 rounded-lg hover:bg-[var(--color-surface)] flex items-center justify-center transition-colors">
                        <IconSettings size={15} className="text-[var(--color-muted)]" />
                      </Link>
                      <a href={`https://polymarketanalytics.com/traders/${t.wallet_addr}#trades`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg hover:bg-[var(--color-surface)] flex items-center justify-center transition-colors">
                        <IconExternalLink size={14} className="text-[var(--color-muted)]" />
                      </a>
                      <Button variant="ghost" size="sm" onClick={() => removeTarget(t.wallet_addr)} disabled={toggling === t.wallet_addr} loading={toggling === t.wallet_addr} className="text-[var(--color-negative)] hover:text-[var(--color-negative)] hover:bg-[var(--color-negative)]/5">
                        Stop
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Featured Traders — Card Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-[var(--color-muted)] uppercase tracking-[0.08em] font-medium">Top Traders</p>
          <span className="text-xs text-[var(--color-muted)]">{filtered.length} available</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-sm text-[var(--color-secondary)]">No traders found for &quot;{search}&quot;</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((s) => {
              const isActive = activeWallets.has(s.wallet.toLowerCase());
              return (
                <Card key={s.slug} padding="none" className="overflow-hidden hover:border-black/10 transition-all group">
                  {/* Hero image */}
                  <Link href={`/strategy/${s.slug}`} className="block relative h-44 sm:h-52 overflow-hidden">
                    <img src={s.image} alt={s.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    {s.featured && (
                      <span className="absolute top-3 left-3 bg-white/90 text-[var(--color-primary)] text-[10px] font-bold px-2.5 py-1 rounded-lg">Featured</span>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className="bg-white/90 text-[var(--color-positive)] font-bold font-mono text-sm px-2.5 py-1 rounded-lg">
                        +{s.returnPct}%
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center gap-3">
                        <img src={s.image} alt={s.manager} className="w-10 h-10 rounded-full object-cover border-2 border-white/40" />
                        <div>
                          <p className="text-white font-bold text-base drop-shadow-sm">{s.name}</p>
                          <p className="text-white/70 text-xs">{s.categories.slice(0, 3).join(" · ")}</p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Stats grid — 5 columns */}
                  <div className="grid grid-cols-5 border-t border-[var(--color-border)]">
                    <div className="p-3 text-center border-r border-[var(--color-border)]">
                      <p className="text-sm font-bold font-mono text-[var(--color-positive)]">{s.profit}</p>
                      <p className="text-[10px] text-[var(--color-muted)] mt-0.5">P&L</p>
                    </div>
                    <div className="p-3 text-center border-r border-[var(--color-border)]">
                      <p className="text-sm font-bold font-mono text-[var(--color-primary)]">{s.winRate}%</p>
                      <p className="text-[10px] text-[var(--color-muted)] mt-0.5">Win Rate</p>
                    </div>
                    <div className="p-3 text-center border-r border-[var(--color-border)]">
                      <p className="text-sm font-bold font-mono text-[var(--color-primary)]">{s.trades}</p>
                      <p className="text-[10px] text-[var(--color-muted)] mt-0.5">Positions</p>
                    </div>
                    <div className="p-3 text-center border-r border-[var(--color-border)]">
                      <p className="text-sm font-bold font-mono text-[var(--color-primary)]">{s.copiers}</p>
                      <p className="text-[10px] text-[var(--color-muted)] mt-0.5">Followers</p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-sm font-bold font-mono text-[var(--color-primary)]">{s.aum}</p>
                      <p className="text-[10px] text-[var(--color-muted)] mt-0.5">AUM</p>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center gap-2 p-3 border-t border-[var(--color-border)]">
                    {isActive ? (
                      <>
                        <Badge variant="active">Following</Badge>
                        <Link href={`/strategy/${s.slug}`} className="text-xs text-[var(--color-secondary)] font-medium hover:text-[var(--color-primary)] ml-auto">View Details</Link>
                        <a href={`https://polymarketanalytics.com/traders/${s.wallet}#trades`} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-primary)]">
                          <IconExternalLink size={14} />
                        </a>
                      </>
                    ) : (
                      <>
                        <Button onClick={() => addStrategyTarget(s.wallet, s.name)} disabled={toggling === s.wallet} loading={toggling === s.wallet} size="sm" className="flex-1">
                          Start Following
                        </Button>
                        <Link href={`/strategy/${s.slug}`} className="h-9 px-3 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] flex items-center transition-colors">
                          Details
                        </Link>
                        <a href={`https://polymarketanalytics.com/traders/${s.wallet}#trades`} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-xl border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-surface)] transition-colors">
                          <IconExternalLink size={14} className="text-[var(--color-muted)]" />
                        </a>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
