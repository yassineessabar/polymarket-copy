'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import AuthGuard from '@/components/shared/AuthGuard';
import StatCard from '@/components/shared/StatCard';
import type { ReferralStats } from '@/types';
import { Link2, Copy, Check, Users, DollarSign, Gift, ArrowRight } from 'lucide-react';

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    api
      .get<ReferralStats>('/api/referrals/stats')
      .then(setStats)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  function copyLink() {
    if (!stats?.referral_link) return;
    navigator.clipboard.writeText(stats.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function withdraw() {
    if (!stats || stats.claimable < 5) return;
    setWithdrawing(true);
    try {
      await api.post('/api/referrals/withdraw');
      setStats((s) => (s ? { ...s, claimable: 0 } : s));
    } catch (e) {
      console.error('Withdraw failed:', e);
    } finally {
      setWithdrawing(false);
    }
  }

  const canWithdraw = (stats?.claimable ?? 0) >= 5;

  const TIERS = [
    {
      tier: 1,
      label: 'Direct Referrals',
      commission: '25%',
      desc: 'Earn 25% commission on fees from users you refer directly',
      count: stats?.tier1_count ?? 0,
      color: 'text-accent bg-accent/10',
    },
    {
      tier: 2,
      label: 'Referrals of Referrals',
      commission: '5%',
      desc: 'Earn 5% commission from second-level referrals',
      count: stats?.tier2_count ?? 0,
      color: 'text-purple-400 bg-purple-400/10',
    },
    {
      tier: 3,
      label: '3 Levels Deep',
      commission: '3%',
      desc: 'Earn 3% commission from third-level referrals',
      count: stats?.tier3_count ?? 0,
      color: 'text-amber-400 bg-amber-400/10',
    },
  ];

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Referrals</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Invite friends and earn commissions on their trading fees
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-xl border border-dark-border bg-dark-card" />
              <div className="grid gap-4 sm:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-xl border border-dark-border bg-dark-card"
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Referral Link */}
              <div className="rounded-xl border border-dark-border bg-dark-card p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  <Link2 size={14} />
                  Your Referral Link
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 overflow-hidden rounded-lg border border-dark-border bg-dark-bg px-4 py-2.5">
                    <p className="truncate font-mono text-sm text-text-primary">
                      {stats?.referral_link ?? '---'}
                    </p>
                  </div>
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent/90"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                {stats?.referral_code && (
                  <p className="mt-2 text-xs text-text-secondary">
                    Referral code:{' '}
                    <span className="font-mono text-text-primary">{stats.referral_code}</span>
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Total Referrals"
                  value={String(stats?.total_referrals ?? 0)}
                />
                <StatCard
                  label="Total Earned"
                  value={`$${(stats?.total_earned ?? 0).toFixed(2)}`}
                  mono
                />
                <StatCard
                  label="Claimable Amount"
                  value={`$${(stats?.claimable ?? 0).toFixed(2)}`}
                  mono
                />
              </div>

              {/* Withdraw Button */}
              <div className="flex items-center justify-between rounded-xl border border-dark-border bg-dark-card p-4">
                <div>
                  <p className="text-sm font-medium text-text-primary">Withdraw Earnings</p>
                  <p className="text-xs text-text-secondary">
                    Minimum withdrawal: $5.00
                  </p>
                </div>
                <button
                  onClick={withdraw}
                  disabled={!canWithdraw || withdrawing}
                  className="flex items-center gap-2 rounded-lg bg-profit/10 px-5 py-2.5 text-sm font-semibold text-profit transition-all hover:bg-profit/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <DollarSign size={16} />
                  {withdrawing ? 'Processing...' : 'Withdraw'}
                </button>
              </div>

              {/* Tier Breakdown */}
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
                  Commission Tiers
                </h2>
                <div className="space-y-3">
                  {TIERS.map((t) => (
                    <div
                      key={t.tier}
                      className="flex items-center justify-between rounded-xl border border-dark-border bg-dark-card p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${t.color}`}
                        >
                          T{t.tier}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{t.label}</p>
                          <p className="text-xs text-text-secondary">{t.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="font-mono text-sm font-semibold text-text-primary">
                            {t.commission}
                          </p>
                          <p className="text-xs text-text-secondary">commission</p>
                        </div>
                        <div className="border-l border-dark-border pl-4">
                          <p className="font-mono text-sm font-semibold text-text-primary">
                            {t.count}
                          </p>
                          <p className="text-xs text-text-secondary">referrals</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
