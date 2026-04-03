'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import AppShell from '@/components/layout/AppShell';
import AuthGuard from '@/components/shared/AuthGuard';
import type { WalletInfo } from '@/types';
import {
  Wallet,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  ArrowDownToLine,
} from 'lucide-react';

export default function WalletPage() {
  const { user } = useAuth();
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const walletAddress = walletInfo?.wallet_address ?? user?.wallet_address ?? '';

  useEffect(() => {
    api
      .get<WalletInfo>('/api/wallet')
      .then(setWalletInfo)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  function copyAddress() {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Wallet</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Manage your trading wallet and deposits
            </p>
          </div>

          {/* Wallet Address */}
          <div className="rounded-xl border border-dark-border bg-dark-card p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              <Wallet size={14} />
              Wallet Address
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 overflow-hidden rounded-lg border border-dark-border bg-dark-bg px-4 py-3">
                <p className="truncate font-mono text-sm text-text-primary">
                  {walletAddress || '---'}
                </p>
              </div>
              <button
                onClick={copyAddress}
                disabled={!walletAddress}
                className="flex-shrink-0 rounded-lg border border-dark-border p-3 text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-30"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
              {walletAddress && (
                <a
                  href={`https://polygonscan.com/address/${walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 rounded-lg border border-dark-border p-3 text-text-secondary transition-colors hover:border-accent hover:text-accent"
                >
                  <ExternalLink size={18} />
                </a>
              )}
            </div>
          </div>

          {/* Balances */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-dark-border bg-dark-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                USDC Balance
              </p>
              {loading ? (
                <div className="mt-2 h-10 w-32 animate-pulse rounded-lg bg-dark-border" />
              ) : (
                <p className="mt-2 font-mono text-3xl font-bold text-text-primary">
                  ${(walletInfo?.usdc_balance ?? 0).toFixed(2)}
                </p>
              )}
              <p className="mt-1 text-xs text-text-secondary">Polygon USDC</p>
            </div>
            <div className="rounded-xl border border-dark-border bg-dark-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                POL Balance
              </p>
              {loading ? (
                <div className="mt-2 h-10 w-32 animate-pulse rounded-lg bg-dark-border" />
              ) : (
                <p className="mt-2 font-mono text-3xl font-bold text-text-primary">
                  {(walletInfo?.matic_balance ?? 0).toFixed(4)}
                </p>
              )}
              <p className="mt-1 text-xs text-text-secondary">For gas fees</p>
            </div>
          </div>

          {/* Deposit Section */}
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-accent">
              <ArrowDownToLine size={16} />
              Deposit USDC
            </div>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Send USDC to this address on the <strong className="text-text-primary">Polygon</strong> network
              to fund your trading wallet.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 overflow-hidden rounded-lg border border-dark-border bg-dark-bg px-4 py-2.5">
                <p className="truncate font-mono text-xs text-text-primary">
                  {walletAddress || '---'}
                </p>
              </div>
              <button
                onClick={copyAddress}
                disabled={!walletAddress}
                className="rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-accent/90 disabled:opacity-30"
              >
                {copied ? 'Copied!' : 'Copy Address'}
              </button>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-dark-border bg-dark-card p-3">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-400" />
              <div className="text-xs leading-relaxed text-text-secondary">
                <p>
                  <strong className="text-text-primary">Important:</strong> Only send USDC on the
                  Polygon network. Sending other tokens or using the wrong network may result in
                  permanent loss of funds.
                </p>
                <p className="mt-1">
                  Ethereum and BNB Chain bridges are supported via third-party bridge services.
                </p>
              </div>
            </div>
          </div>

          {/* Info note */}
          <div className="rounded-xl border border-dark-border bg-dark-card p-4 text-center text-sm text-text-secondary">
            This is your trading wallet. Deposit USDC (Polygon) to start copy trading.
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
