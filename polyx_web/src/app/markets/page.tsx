"use client";

import { useEffect, useState } from "react";
import { marketsApi } from "@/lib/api";
import { Card, Badge, Spinner } from "@/components/ui";
import { PageHeader, EmptyState } from "@/components";

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
      <PageHeader title="Markets" />

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5 sm:mx-0 sm:px-0 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              category === cat
                ? "bg-[#0F0F0F] text-white"
                : "bg-white text-[#6B7280] hover:text-[#0F0F0F] shadow-sm"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Spinner />
        </div>
      ) : markets.length === 0 ? (
        <EmptyState
          title="No markets found"
          subtitle="Try a different category or check back later."
        />
      ) : (
        <div className="space-y-2">
          {markets.map((market, i) => (
            <Card key={market.id || i} className="hover:shadow-md transition-all shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm mb-1 text-[#0F0F0F]">{market.title || market.question}</div>
                  {market.category && (
                    <Badge variant="neutral">{market.category}</Badge>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {market.volume !== undefined && (
                    <div className="text-xs text-[#6B7280] font-medium">
                      Vol: ${typeof market.volume === "number" ? market.volume.toLocaleString() : market.volume}
                    </div>
                  )}
                  {market.yes_price !== undefined && (
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs font-mono font-bold text-[#10B981]">
                        Yes {(market.yes_price * 100).toFixed(0)}c
                      </span>
                      <span className="text-xs font-mono font-bold text-[#EF4444]">
                        No {((1 - market.yes_price) * 100).toFixed(0)}c
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
