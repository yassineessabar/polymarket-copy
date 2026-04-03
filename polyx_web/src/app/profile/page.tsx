'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import AppShell from '@/components/layout/AppShell';
import AuthGuard from '@/components/shared/AuthGuard';
import StatCard from '@/components/shared/StatCard';
import type { Settings, PortfolioStats, CopyTarget } from '@/types';
import { User, Wallet, CalendarDays, Shield, Copy, Check } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [targets, setTargets] = useState<CopyTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Settings>('/api/user/settings').catch(() => null),
      api.get<PortfolioStats>('/api/portfolio/stats').catch(() => null),
      api.get<CopyTarget[]>('/api/copy/targets').catch(() => []),
    ])
      .then(([s, st, t]) => {
        setSettings(s);
        setStats(st);
        setTargets(Array.isArray(t) ? t : []);
      })
      .finally(() => setLoading(false));
  }, []);

  function copyAddress() {
    if (!user?.wallet_address) return;
    navigator.clipboard.writeText(user.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const walletAddr = user?.wallet_address ?? '';
  const truncated = walletAddr
    ? `${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)}`
    : '---';

  const isDemo = !!(settings?.demo_mode);
  const isDryRun = !!(settings?.dry_run);

  const mode = isDemo
    ? 'Demo'
    : isDryRun
    ? 'Dry Run'
    : 'Live';

  const modeColor = isDemo
    ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
    : isDryRun
    ? 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    : 'text-profit bg-profit/10 border-profit/20';

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '---';

  const totalPnl = stats?.total_pnl ?? 0;
  const positionCount = stats?.position_count ?? 0;

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Profile</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Your account details and trading statistics
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-xl border border-dark-border bg-dark-card"
                />
              ))}
            </div>
          ) : (
            <>
              {/* User Info Card */}
              <div className="rounded-xl border border-dark-border bg-dark-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <User size={28} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-text-primary">
                        {user?.username || truncated}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-xs text-text-secondary">
                          {truncated}
                        </span>
                        {walletAddr && (
                          <button
                            onClick={copyAddress}
                            className="text-text-secondary hover:text-accent"
                          >
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${modeColor}`}
                  >
                    {mode}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-dark-border pt-5 sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={14} className="text-text-secondary" />
                    <div>
                      <p className="text-[10px] uppercase text-text-secondary">Joined</p>
                      <p className="text-xs font-medium text-text-primary">{joinedDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet size={14} className="text-text-secondary" />
                    <div>
                      <p className="text-[10px] uppercase text-text-secondary">Auth</p>
                      <p className="text-xs font-medium capitalize text-text-primary">
                        {user?.auth_provider ?? '---'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-text-secondary" />
                    <div>
                      <p className="text-[10px] uppercase text-text-secondary">Copy Targets</p>
                      <p className="text-xs font-medium text-text-primary">
                        {targets.length} active
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trading Stats */}
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
                  Trading Statistics
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Open Positions" value={String(positionCount)} />
                  <StatCard
                    label="Win Rate"
                    value={`${(stats?.win_rate ?? 0).toFixed(1)}%`}
                    mono
                  />
                  <StatCard
                    label="Portfolio Value"
                    value={`$${(stats?.positions_value ?? 0).toFixed(2)}`}
                    mono
                  />
                  <StatCard
                    label="Total P&L"
                    value={`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`}
                    change={
                      (stats?.positions_value ?? 0) > 0
                        ? (totalPnl / (stats?.positions_value ?? 1)) * 100
                        : 0
                    }
                    mono
                  />
                </div>
              </div>

              {/* Copy Targets Summary */}
              <div className="rounded-xl border border-dark-border bg-dark-card p-5">
                <h2 className="mb-3 text-sm font-semibold text-text-primary">
                  Active Copy Targets
                </h2>
                {targets.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    No copy targets configured. Visit the Copy Trade page to get started.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {targets.map((t) => {
                      const addr = t.wallet_addr ?? '';
                      return (
                        <div
                          key={addr || t.id}
                          className="flex items-center gap-3 rounded-lg border border-dark-border bg-dark-bg px-3 py-2"
                        >
                          <span className="h-2 w-2 rounded-full bg-profit" />
                          <span className="text-sm font-medium text-text-primary">
                            {t.display_name || 'Unknown'}
                          </span>
                          <span className="font-mono text-xs text-text-secondary">
                            {addr ? `${addr.slice(0, 8)}...${addr.slice(-4)}` : '---'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
