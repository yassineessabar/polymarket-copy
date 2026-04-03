'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import AuthGuard from '@/components/shared/AuthGuard';
import PnLBadge from '@/components/shared/PnLBadge';
import type { Position, PortfolioStats } from '@/types';
import { TrendingUp, TrendingDown, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

type Tab = 'open' | 'closed';
type SortKey = 'bet_amount' | 'pnl';
type SortDir = 'asc' | 'desc';

const PER_PAGE = 20;

export default function PortfolioPage() {
  const [tab, setTab] = useState<Tab>('open');
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('bet_amount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [closedPage, setClosedPage] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get<PortfolioStats>('/api/portfolio/stats').catch(() => null),
      api.get<Position[]>('/api/portfolio/positions?status=open').catch(() => []),
      api.get<Position[]>('/api/portfolio/positions?status=closed').catch(() => []),
    ])
      .then(([s, open, closed]) => {
        setStats(s);
        setOpenPositions(Array.isArray(open) ? open : []);
        setClosedPositions(Array.isArray(closed) ? closed : []);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sortedOpen = useMemo(() => {
    const arr = [...openPositions];
    arr.sort((a, b) => {
      const va = sortKey === 'pnl' ? (a.unrealized_pnl ?? 0) : a.bet_amount;
      const vb = sortKey === 'pnl' ? (b.unrealized_pnl ?? 0) : b.bet_amount;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return arr;
  }, [openPositions, sortKey, sortDir]);

  const sortedClosed = useMemo(() => {
    const arr = [...closedPositions];
    arr.sort((a, b) => {
      const va = sortKey === 'pnl' ? (a.pnl_usd ?? 0) : a.bet_amount;
      const vb = sortKey === 'pnl' ? (b.pnl_usd ?? 0) : b.bet_amount;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return arr;
  }, [closedPositions, sortKey, sortDir]);

  const closedPageCount = Math.max(1, Math.ceil(sortedClosed.length / PER_PAGE));
  const paginatedClosed = sortedClosed.slice(
    closedPage * PER_PAGE,
    (closedPage + 1) * PER_PAGE
  );

  const totalUnrealized = openPositions.reduce((s, p) => s + (p.unrealized_pnl ?? 0), 0);
  const totalRealized = closedPositions.reduce((s, p) => s + (p.pnl_usd ?? 0), 0);
  const totalValue = stats?.positions_value ?? openPositions.reduce((s, p) => s + p.bet_amount, 0);

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Portfolio</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Track your positions and performance
            </p>
          </div>

          {/* Summary bar */}
          {loading ? (
            <div className="h-16 animate-pulse rounded-xl border border-dark-border bg-dark-card" />
          ) : (
            <div className="grid grid-cols-3 gap-4 rounded-xl border border-dark-border bg-dark-card p-4">
              <div className="text-center">
                <p className="text-xs text-text-secondary">Total Value</p>
                <p className="mt-1 font-mono text-lg font-semibold text-text-primary">
                  ${totalValue.toFixed(2)}
                </p>
              </div>
              <div className="border-x border-dark-border text-center">
                <p className="text-xs text-text-secondary">Unrealized P&L</p>
                <p
                  className={`mt-1 font-mono text-lg font-semibold ${
                    totalUnrealized >= 0 ? 'text-profit' : 'text-loss'
                  }`}
                >
                  {totalUnrealized >= 0 ? '+' : ''}${totalUnrealized.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-secondary">Realized P&L</p>
                <p
                  className={`mt-1 font-mono text-lg font-semibold ${
                    totalRealized >= 0 ? 'text-profit' : 'text-loss'
                  }`}
                >
                  {totalRealized >= 0 ? '+' : ''}${totalRealized.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg border border-dark-border bg-dark-card p-1">
            <button
              onClick={() => setTab('open')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'open'
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Open Positions ({openPositions.length})
            </button>
            <button
              onClick={() => { setTab('closed'); setClosedPage(0); }}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'closed'
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Closed Positions ({closedPositions.length})
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl border border-dark-border bg-dark-card"
                />
              ))}
            </div>
          ) : tab === 'open' ? (
            /* Open Positions Table */
            <div className="overflow-x-auto rounded-xl border border-dark-border bg-dark-card">
              {sortedOpen.length === 0 ? (
                <div className="py-12 text-center">
                  <TrendingUp size={32} className="mx-auto mb-2 text-text-secondary/50" />
                  <p className="text-sm text-text-secondary">No open positions</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-dark-border text-xs uppercase text-text-secondary">
                      <th className="px-4 py-3">Market</th>
                      <th className="px-4 py-3">Outcome</th>
                      <th className="px-4 py-3 font-mono">Entry</th>
                      <th className="px-4 py-3 font-mono">Current</th>
                      <th
                        className="cursor-pointer px-4 py-3 font-mono"
                        onClick={() => toggleSort('bet_amount')}
                      >
                        <span className="inline-flex items-center gap-1">
                          Bet <ArrowUpDown size={12} />
                        </span>
                      </th>
                      <th
                        className="cursor-pointer px-4 py-3 font-mono"
                        onClick={() => toggleSort('pnl')}
                      >
                        <span className="inline-flex items-center gap-1">
                          P&L <ArrowUpDown size={12} />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {sortedOpen.map((pos) => (
                      <tr key={pos.id} className="transition-colors hover:bg-dark-hover">
                        <td className="max-w-[200px] truncate px-4 py-3 text-text-primary">
                          {pos.title}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{pos.outcome}</td>
                        <td className="px-4 py-3 font-mono text-text-primary">
                          ${pos.entry_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-mono text-text-primary">
                          ${(pos.current_price ?? pos.entry_price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-mono text-text-primary">
                          ${pos.bet_amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <PnLBadge amount={pos.unrealized_pnl ?? 0} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            /* Closed Positions Table */
            <>
              <div className="overflow-x-auto rounded-xl border border-dark-border bg-dark-card">
                {paginatedClosed.length === 0 ? (
                  <div className="py-12 text-center">
                    <TrendingDown size={32} className="mx-auto mb-2 text-text-secondary/50" />
                    <p className="text-sm text-text-secondary">No closed positions</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-dark-border text-xs uppercase text-text-secondary">
                        <th className="px-4 py-3">Market</th>
                        <th className="px-4 py-3">Outcome</th>
                        <th className="px-4 py-3 font-mono">Entry</th>
                        <th className="px-4 py-3 font-mono">Exit</th>
                        <th
                          className="cursor-pointer px-4 py-3 font-mono"
                          onClick={() => toggleSort('bet_amount')}
                        >
                          <span className="inline-flex items-center gap-1">
                            Bet <ArrowUpDown size={12} />
                          </span>
                        </th>
                        <th
                          className="cursor-pointer px-4 py-3 font-mono"
                          onClick={() => toggleSort('pnl')}
                        >
                          <span className="inline-flex items-center gap-1">
                            P&L <ArrowUpDown size={12} />
                          </span>
                        </th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border">
                      {paginatedClosed.map((pos) => (
                        <tr key={pos.id} className="transition-colors hover:bg-dark-hover">
                          <td className="max-w-[180px] truncate px-4 py-3 text-text-primary">
                            {pos.title}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">{pos.outcome}</td>
                          <td className="px-4 py-3 font-mono text-text-primary">
                            ${pos.entry_price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 font-mono text-text-primary">
                            ${(pos.exit_price ?? 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 font-mono text-text-primary">
                            ${pos.bet_amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <PnLBadge amount={pos.pnl_usd ?? 0} />
                          </td>
                          <td className="px-4 py-3 text-xs text-text-secondary">
                            {pos.close_reason ?? '-'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-text-secondary">
                            {pos.closed_at
                              ? new Date(pos.closed_at).toLocaleDateString()
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {closedPageCount > 1 && (
                <div className="flex items-center justify-center gap-4">
                  <button
                    disabled={closedPage === 0}
                    onClick={() => setClosedPage((p) => p - 1)}
                    className="rounded-lg border border-dark-border p-2 text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-text-secondary">
                    Page {closedPage + 1} of {closedPageCount}
                  </span>
                  <button
                    disabled={closedPage >= closedPageCount - 1}
                    onClick={() => setClosedPage((p) => p + 1)}
                    className="rounded-lg border border-dark-border p-2 text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
