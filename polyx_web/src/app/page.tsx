'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import {
  Copy,
  ShieldCheck,
  TrendingUp,
  Zap,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';

const FEATURES = [
  {
    icon: Copy,
    title: 'Copy Trading',
    desc: 'Mirror top Polymarket traders in real-time with intelligent position sizing.',
  },
  {
    icon: ShieldCheck,
    title: 'Risk Management',
    desc: '6-layer risk engine with drawdown scaling, exposure caps, and daily loss limits.',
  },
  {
    icon: Zap,
    title: 'Demo Mode',
    desc: 'Paper trade with virtual funds to test strategies before going live.',
  },
  {
    icon: TrendingUp,
    title: 'Portfolio Tracking',
    desc: 'Real-time P&L, position values, and performance analytics at a glance.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAuth();
  const { isConnected } = useAccount();
  const { connect } = useConnect();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  async function handleCTA() {
    if (isConnected) {
      await login();
    } else {
      connect({ connector: injected() });
    }
  }

  async function handleDemo() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/demo`, {
        method: 'POST',
      });
      const data = await res.json();
      localStorage.setItem('polyx_token', data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Demo login failed:', err);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            PX
          </div>
          <span className="text-xl font-bold text-text-primary">PolyX</span>
        </div>
        <button
          onClick={handleCTA}
          className="flex items-center gap-2 rounded-lg border border-dark-border px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-accent hover:text-accent"
        >
          <Wallet size={16} />
          {isConnected ? 'Sign In' : 'Connect Wallet'}
        </button>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-4xl flex-col items-center px-6 pt-20 text-center lg:pt-32">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-dark-border bg-dark-card px-4 py-1.5 text-xs font-medium text-text-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-profit" />
          Powered by Polymarket CLOB
        </div>

        <h1 className="text-4xl font-bold leading-tight tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
          Copy Trade
          <br />
          <span className="text-accent">Polymarket</span> Like a Pro
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
          Follow top prediction market traders automatically. Intelligent
          position sizing, 6-layer risk management, and real-time portfolio
          tracking -- all from your browser.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <button
            onClick={handleCTA}
            className="flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent/90 hover:shadow-accent/30"
          >
            <Wallet size={18} />
            {isConnected ? 'Sign In to Dashboard' : 'Connect Wallet'}
          </button>
          <button
            onClick={handleDemo}
            className="flex items-center gap-2 rounded-xl border border-dark-border px-8 py-3.5 text-base font-medium text-text-secondary transition-all hover:border-accent hover:text-accent"
          >
            Try Demo
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto mt-28 grid max-w-5xl gap-5 px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-0">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group rounded-xl border border-dark-border bg-dark-card p-5 transition-colors hover:border-accent/40"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent/20">
              <f.icon size={20} />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">
              {f.title}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
              {f.desc}
            </p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="mt-32 border-t border-dark-border px-6 py-8 text-center text-xs text-text-secondary">
        PolyX -- Copy trading for Polymarket. Use at your own risk.
      </footer>
    </div>
  );
}
