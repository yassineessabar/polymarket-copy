'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import AuthGuard from '@/components/shared/AuthGuard';
import type { CopyTarget, Settings } from '@/types';
import {
  Plus,
  Trash2,
  Play,
  Square,
  UserCheck,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';

const SMART_WALLETS = [
  {
    name: 'Theo4',
    address: '0x36B4728d1b0E09E2b6E2d0830a7B14fE301c12',
    description: '$3M+ volume, multi-strategy',
    tag: 'Top Trader',
  },
  {
    name: 'Sports-Whale',
    address: '0xe1A9D741c8A93E4F3C5cD1b22F8910aC3b5cDC',
    description: 'Sports specialist, NBA/NFL focused',
    tag: 'Sports',
  },
  {
    name: 'Spread-Master',
    address: '0xA0B93c7E41d2bF8AC5a9F7cD1E3b2460c78a3C',
    description: 'Spread arbitrage specialist',
    tag: 'Arbitrage',
  },
  {
    name: 'Geopolitics-Pro',
    address: '0x4D8bC1f2A3E7D9c0B6F5a8E2d1C7b4A3F09e2F',
    description: 'Geopolitics & elections expert',
    tag: 'Politics',
  },
];

export default function CopyTradePage() {
  const [targets, setTargets] = useState<CopyTarget[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [customWallet, setCustomWallet] = useState('');
  const [customName, setCustomName] = useState('');
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<CopyTarget[]>('/api/copy/targets').catch(() => []),
      api.get<Settings>('/api/settings').catch(() => null),
    ])
      .then(([t, s]) => {
        setTargets(Array.isArray(t) ? t : []);
        setSettings(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const isCopyActive = settings?.copy_trading_active ?? false;

  async function addTarget(address: string, name?: string) {
    setAdding(true);
    try {
      const t = await api.post<CopyTarget>('/api/copy/targets', {
        wallet_addr: address,
        display_name: name || undefined,
      });
      setTargets((prev) => [...prev, t]);
      setCustomWallet('');
      setCustomName('');
    } catch (e) {
      console.error('Failed to add target:', e);
    } finally {
      setAdding(false);
    }
  }

  async function removeTarget(address: string) {
    try {
      await api.delete(`/api/copy/targets/${address}`);
      setTargets((prev) => prev.filter((t) => t.wallet_addr !== address));
    } catch (e) {
      console.error('Failed to remove target:', e);
    }
  }

  async function toggleCopyTrading() {
    setToggling(true);
    try {
      const updated = await api.patch<Settings>('/api/settings', {
        copy_trading_active: !isCopyActive,
      });
      setSettings(updated);
    } catch (e) {
      console.error('Failed to toggle:', e);
    } finally {
      setToggling(false);
    }
  }

  function copyAddress(addr: string) {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  }

  const isAlreadyAdded = (addr: string) =>
    targets.some(
      (t) => t.wallet_addr.toLowerCase() === addr.toLowerCase()
    );

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          {/* Header + Toggle */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Copy Trade</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Follow top traders and mirror their positions automatically
              </p>
            </div>
            <button
              onClick={toggleCopyTrading}
              disabled={toggling}
              className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                isCopyActive
                  ? 'bg-loss/20 text-loss hover:bg-loss/30'
                  : 'bg-profit/20 text-profit hover:bg-profit/30'
              } disabled:opacity-50`}
            >
              {isCopyActive ? <Square size={18} /> : <Play size={18} />}
              {toggling
                ? 'Updating...'
                : isCopyActive
                ? 'Stop Copy Trading'
                : 'Start Copy Trading'}
            </button>
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-3 rounded-xl border border-dark-border bg-dark-card px-4 py-3">
            <span
              className={`h-3 w-3 rounded-full ${
                isCopyActive ? 'bg-profit animate-pulse' : 'bg-text-secondary'
              }`}
            />
            <span className="text-sm text-text-primary">
              {isCopyActive
                ? `Copy engine running -- tracking ${targets.length} target${targets.length !== 1 ? 's' : ''}`
                : 'Copy engine stopped'}
            </span>
          </div>

          {/* Active Targets */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Active Targets ({targets.length})
            </h2>
            {loading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-xl border border-dark-border bg-dark-card"
                  />
                ))}
              </div>
            ) : targets.length === 0 ? (
              <div className="rounded-xl border border-dark-border bg-dark-card py-8 text-center">
                <UserCheck size={32} className="mx-auto mb-2 text-text-secondary/50" />
                <p className="text-sm text-text-secondary">
                  No targets added yet. Add a wallet below or pick from Smart Wallets.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {targets.map((t) => (
                  <div
                    key={t.wallet_addr}
                    className="flex items-center justify-between rounded-xl border border-dark-border bg-dark-card px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary">
                          {t.display_name || 'Unknown Trader'}
                        </p>
                        {t.is_active && (
                          <span className="rounded-full bg-profit/10 px-2 py-0.5 text-[10px] font-medium text-profit">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="font-mono text-xs text-text-secondary">
                          {t.wallet_addr.slice(0, 10)}...{t.wallet_addr.slice(-6)}
                        </p>
                        <button
                          onClick={() => copyAddress(t.wallet_addr)}
                          className="text-text-secondary hover:text-accent"
                        >
                          {copiedAddr === t.wallet_addr ? (
                            <Check size={12} />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeTarget(t.wallet_addr)}
                      className="ml-4 rounded-lg p-2 text-text-secondary transition-colors hover:bg-loss/10 hover:text-loss"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Smart Wallets */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-text-secondary">
              <Sparkles size={14} className="text-accent" />
              Smart Wallets
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {SMART_WALLETS.map((w) => {
                const added = isAlreadyAdded(w.address);
                return (
                  <div
                    key={w.address}
                    className="flex items-center justify-between rounded-xl border border-dark-border bg-dark-card p-4 transition-colors hover:border-accent/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary">{w.name}</p>
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                          {w.tag}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-text-secondary">{w.description}</p>
                      <p className="mt-1 font-mono text-[11px] text-text-secondary/60">
                        {w.address.slice(0, 10)}...{w.address.slice(-4)}
                      </p>
                    </div>
                    <button
                      disabled={added || adding}
                      onClick={() => addTarget(w.address, w.name)}
                      className={`ml-4 flex-shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                        added
                          ? 'bg-profit/10 text-profit cursor-default'
                          : 'bg-accent/10 text-accent hover:bg-accent/20'
                      } disabled:opacity-50`}
                    >
                      {added ? 'Added' : 'Copy'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Custom Wallet */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Add Custom Wallet
            </h2>
            <div className="rounded-xl border border-dark-border bg-dark-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  placeholder="0x... wallet address"
                  value={customWallet}
                  onChange={(e) => setCustomWallet(e.target.value)}
                  className="flex-1 rounded-lg border border-dark-border bg-dark-bg px-4 py-2.5 font-mono text-sm text-text-primary placeholder-text-secondary/40 outline-none transition-colors focus:border-accent"
                />
                <input
                  type="text"
                  placeholder="Display name (optional)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="rounded-lg border border-dark-border bg-dark-bg px-4 py-2.5 text-sm text-text-primary placeholder-text-secondary/40 outline-none transition-colors focus:border-accent sm:w-48"
                />
                <button
                  disabled={!customWallet.startsWith('0x') || customWallet.length < 10 || adding}
                  onClick={() => addTarget(customWallet, customName)}
                  className="flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
