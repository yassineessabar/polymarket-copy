"use client";

import { useEffect, useState } from "react";
import { marketsApi } from "@/lib/api";

const CATEGORIES = ["Trending", "Crypto", "Politics", "Sports", "Science", "Culture"];

export default function MarketsPage() {
  const [category, setCategory] = useState("Trending");
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarkets();
  }, [category]);

  async function loadMarkets() {
    setLoading(true);
    try {
      const data = await marketsApi.browse(category === "Trending" ? "" : category, 20);
      setMarkets(data.markets);
    } catch {
      setMarkets([]);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-[900px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-semibold font-display mb-4 sm:mb-6">Markets</h1>

      {/* Category buttons */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              category === cat
                ? "bg-accent text-white"
                : "bg-bg-card border border-border text-text-secondary hover:text-white hover:border-border-hover"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : markets.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-2xl p-8 sm:p-12 text-center">
          <h3 className="font-semibold mb-2">No markets found</h3>
          <p className="text-sm text-text-secondary">
            Try a different category or check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {markets.map((market, i) => (
            <div key={market.id || i} className="bg-bg-card border border-border rounded-2xl p-4 sm:p-5 hover:border-border-hover transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm mb-1">{market.title || market.question}</div>
                  {market.category && (
                    <span className="inline-block bg-bg-secondary text-text-muted text-[10px] px-2 py-0.5 rounded-full">
                      {market.category}
                    </span>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {market.volume !== undefined && (
                    <div className="text-xs text-text-muted">
                      Vol: ${typeof market.volume === "number" ? market.volume.toLocaleString() : market.volume}
                    </div>
                  )}
                  {market.yes_price !== undefined && (
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs font-mono text-green">
                        Yes {(market.yes_price * 100).toFixed(0)}c
                      </span>
                      <span className="text-xs font-mono text-red">
                        No {((1 - market.yes_price) * 100).toFixed(0)}c
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
