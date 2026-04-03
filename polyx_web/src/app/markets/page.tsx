'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import AuthGuard from '@/components/shared/AuthGuard';
import type { Market } from '@/types';
import { BarChart3, TrendingUp, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { key: 'politics', label: 'Politics', emoji: '\ud83c\udfe1' },
  { key: 'sports', label: 'Sports', emoji: '\u26bd' },
  { key: 'crypto', label: 'Crypto', emoji: '\ud83e\ude99' },
  { key: 'trump', label: 'Trump', emoji: '\ud83c\uddfa\ud83c\uddf8' },
  { key: 'finance', label: 'Finance', emoji: '\ud83d\udcc8' },
  { key: 'geopolitics', label: 'Geopolitics', emoji: '\ud83c\udf0d' },
  { key: 'volume', label: 'Volume', emoji: '\ud83d\udcca' },
  { key: 'trending', label: 'Trending', emoji: '\ud83d\udd25' },
];

export default function MarketsPage() {
  const [selectedCategory, setSelectedCategory] = useState('trending');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<Market[]>(`/api/markets?category=${selectedCategory}`)
      .then((data) => setMarkets(Array.isArray(data) ? data : []))
      .catch(() => setMarkets([]))
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  function formatVolume(vol: number): string {
    if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
    if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
    return `$${vol.toFixed(0)}`;
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Markets</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Browse trending Polymarket events by category
            </p>
          </div>

          {/* Category Grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  selectedCategory === cat.key
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-dark-border bg-dark-card text-text-secondary hover:border-text-secondary/30 hover:text-text-primary'
                }`}
              >
                <span className="text-lg">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-accent" />
            </div>
          ) : markets.length === 0 ? (
            <div className="rounded-xl border border-dark-border bg-dark-card py-16 text-center">
              <BarChart3 size={36} className="mx-auto mb-3 text-text-secondary/40" />
              <p className="text-sm text-text-secondary">
                No markets found for this category. Try another one.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {markets.map((market, i) => (
                <div
                  key={`${market.slug}-${i}`}
                  className="group flex items-center justify-between rounded-xl border border-dark-border bg-dark-card p-4 transition-colors hover:border-accent/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary group-hover:text-accent">
                      {market.title}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-text-secondary">
                      {market.markets_count > 0 && (
                        <span>{market.markets_count} market{market.markets_count !== 1 ? 's' : ''}</span>
                      )}
                      {market.volume > 0 && (
                        <span className="flex items-center gap-1">
                          <TrendingUp size={12} />
                          {formatVolume(market.volume)} vol
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {market.volume > 0 && (
                      <span className="font-mono text-sm font-semibold text-text-primary">
                        {formatVolume(market.volume)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
