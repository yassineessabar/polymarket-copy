'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import AppShell from '@/components/layout/AppShell';
import AuthGuard from '@/components/shared/AuthGuard';
import StatCard from '@/components/shared/StatCard';
import PnLBadge from '@/components/shared/PnLBadge';
import type { Settings, Position, PortfolioStats, WalletInfo } from '@/types';
import {
  Copy,
  TrendingUp,
  BarChart3,
  Settings as SettingsIcon,
  Activity,
  Zap,
  StopCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [recentClosed, setRecentClosed] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<PortfolioStats>('/api/portfolio/stats').catch(() => null),
      api.get<Settings>('/api/user/settings').catch(() => null),
      api.get<WalletInfo>('/api/wallet').catch(() => null),
      api.get<{ positions: Position[] }>('/api/portfolio/closed?limit=5').catch(() => ({ positions: [] })),
    ])
      .then(([s, set, w, closedResp]) => {
        setStats(s);
        setSettings(set);
        setWallet(w);
        const closedList = closedResp?.positions ?? [];
        setRecentClosed(Array.isArray(closedList) ? closedList : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const portfolioValue = stats?.positions_value ?? 0;
  const availableBalance = wallet?.usdc_balance ?? 0;
  const dailyPnl = stats?.daily_pnl ?? 0;
  const totalNetWorth = portfolioValue + availableBalance;
  const isDemo = !!(settings?.demo_mode);
  const isCopyActive = !!(settings?.copy_trading_active);

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Overview of your trading activity
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isDemo && (
                <span className="rounded-full bg-amber-600/20 px-3 py-1 text-xs font-medium text-amber-400">
                  Demo Mode
                </span>
              )}
              <div className="flex items-center gap-2 rounded-lg border border-dark-border bg-dark-card px-3 py-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isCopyActive ? 'bg-profit animate-pulse' : 'bg-text-secondary'
                  }`}
                />
                <span className="text-xs font-medium text-text-secondary">
                  Copy Trading {isCopyActive ? 'Running' : 'Stopped'}
                </span>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-xl border border-dark-border bg-dark-card"
                />
              ))}
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Portfolio Value"
                  value={`$${portfolioValue.toFixed(2)}`}
                  mono
                />
                <StatCard
                  label="Available Balance"
                  value={`$${availableBalance.toFixed(2)}`}
                  mono
                />
                <StatCard
                  label="Daily P&L"
                  value={`${dailyPnl >= 0 ? '+' : ''}$${dailyPnl.toFixed(2)}`}
                  change={
                    totalNetWorth > 0
                      ? (dailyPnl / totalNetWorth) * 100
                      : 0
                  }
                  mono
                />
                <StatCard
                  label="Total Net Worth"
                  value={`$${totalNetWorth.toFixed(2)}`}
                  mono
                />
              </div>

              {/* Quick actions */}
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
                  Quick Actions
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Link
                    href="/copy"
                    className="group flex items-center gap-3 rounded-xl border border-dark-border bg-dark-card p-4 transition-colors hover:border-accent/40"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent/20">
                      <Copy size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">Copy Trade</p>
                      <p className="text-xs text-text-secondary">Manage targets</p>
                    </div>
                  </Link>
                  <Link
                    href="/portfolio"
                    className="group flex items-center gap-3 rounded-xl border border-dark-border bg-dark-card p-4 transition-colors hover:border-accent/40"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-profit/10 text-profit transition-colors group-hover:bg-profit/20">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">View Portfolio</p>
                      <p className="text-xs text-text-secondary">Positions & P&L</p>
                    </div>
                  </Link>
                  <Link
                    href="/markets"
                    className="group flex items-center gap-3 rounded-xl border border-dark-border bg-dark-card p-4 transition-colors hover:border-accent/40"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 transition-colors group-hover:bg-purple-500/20">
                      <BarChart3 size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">Browse Markets</p>
                      <p className="text-xs text-text-secondary">Explore events</p>
                    </div>
                  </Link>
                  <Link
                    href="/settings"
                    className="group flex items-center gap-3 rounded-xl border border-dark-border bg-dark-card p-4 transition-colors hover:border-accent/40"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 transition-colors group-hover:bg-amber-500/20">
                      <SettingsIcon size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">Settings</p>
                      <p className="text-xs text-text-secondary">Risk & config</p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Recent activity */}
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
                  Recent Activity
                </h2>
                <div className="rounded-xl border border-dark-border bg-dark-card">
                  {recentClosed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Activity size={32} className="mb-3 text-text-secondary/50" />
                      <p className="text-sm text-text-secondary">
                        No recent activity yet. Start copying trades to see results here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-dark-border">
                      {recentClosed.map((pos) => (
                        <div
                          key={pos.id}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {pos.title ?? 'Untitled Market'}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {pos.outcome ?? '---'} &middot;{' '}
                              {pos.close_reason ?? 'closed'} &middot;{' '}
                              {pos.closed_at
                                ? new Date(pos.closed_at).toLocaleDateString()
                                : ''}
                            </p>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <PnLBadge amount={pos.pnl_usd ?? 0} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
