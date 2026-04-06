export interface Strategy {
  name: string;
  slug: string;
  emoji: string;
  manager: string;
  desc: string;
  wallet: string;
  winRate: number;
  profit: string;
  trades: string;
  copiers: number;
  returnPct: number;
  gradient: string;
  image: string;
  aum: string;
  avgTradeSize: string;
  featured: boolean;
  categories: string[];
}

// Static metadata — stats will be overridden by live API data
export const STRATEGIES: Record<string, Strategy> = {
  "sharky6999": {
    name: "Sharky6999",
    slug: "sharky6999",
    emoji: "\u{1F988}",
    manager: "Sharky",
    desc: "High-frequency crypto & BTC trader. Specializes in short-term Bitcoin and altcoin prediction markets with rapid entry and exit strategies.",
    wallet: "0x751a2b86cab503496efd325c8344e10159349ea1",
    winRate: 0, profit: "$0", trades: "0", copiers: 0, returnPct: 0,
    gradient: "from-blue-600 to-cyan-400",
    image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=800&fit=crop",
    aum: "$0", avgTradeSize: "$0",
    featured: true,
    categories: ["Crypto", "BTC"],
  },
  "theo4": {
    name: "Theo4",
    slug: "theo4",
    emoji: "\u{1F40B}",
    manager: "Theo",
    desc: "Top whale with diverse bets across all markets. Known for massive conviction plays on politics, crypto, and cultural events.",
    wallet: "0x56687bf447db6ffa42ffe2204a05edaa20f55839",
    winRate: 0, profit: "$0", trades: "0", copiers: 0, returnPct: 0,
    gradient: "from-purple-600 to-pink-400",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=800&fit=crop",
    aum: "$0", avgTradeSize: "$0",
    featured: true,
    categories: ["Diverse", "Politics", "Crypto"],
  },
  "sports-whale": {
    name: "Sports-Whale",
    slug: "sports-whale",
    emoji: "\u{1F3C0}",
    manager: "SportsBet",
    desc: "NBA, NHL specialist with large conviction bets. Deep knowledge of team dynamics, player stats, and line movements.",
    wallet: "0x0c154c190e293b7e5f8d453b5f690c4dc9599a45",
    winRate: 0, profit: "$0", trades: "0", copiers: 0, returnPct: 0,
    gradient: "from-orange-500 to-yellow-400",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=800&fit=crop",
    aum: "$0", avgTradeSize: "$0",
    featured: true,
    categories: ["Sports", "NBA", "NHL"],
  },
  "geopolitics-pro": {
    name: "Geopolitics-Pro",
    slug: "geopolitics-pro",
    emoji: "\u{1F30D}",
    manager: "GeoPol",
    desc: "Politics & geopolitics specialist with deep research. Tracks global political developments, election cycles, and policy shifts.",
    wallet: "0xfd22b8843ae03a33a8a4c5e39ef1e5ff33ebad91",
    winRate: 0, profit: "$0", trades: "0", copiers: 0, returnPct: 0,
    gradient: "from-emerald-500 to-teal-400",
    image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&h=800&fit=crop",
    aum: "$0", avgTradeSize: "$0",
    featured: false,
    categories: ["Politics", "Geopolitics"],
  },
  "secondwindcapital": {
    name: "SecondWindCapital",
    slug: "secondwindcapital",
    emoji: "\u{1F30A}",
    manager: "SecondWind",
    desc: "Macro & crypto plays with risk-adjusted returns. Combines macroeconomic analysis with crypto market expertise.",
    wallet: "0x8c80d213c0cbad777d06ee3f58f6ca4bc03102c3",
    winRate: 0, profit: "$0", trades: "0", copiers: 0, returnPct: 0,
    gradient: "from-indigo-500 to-blue-400",
    image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=800&fit=crop",
    aum: "$0", avgTradeSize: "$0",
    featured: false,
    categories: ["Macro", "Crypto"],
  },
};

export const STRATEGY_LIST = Object.values(STRATEGIES);
export const FEATURED_STRATEGIES = STRATEGY_LIST.filter((s) => s.featured);

/** Merge live API data into a strategy object */
export function mergeWithLiveData(strategy: Strategy, liveData: any): Strategy {
  if (!liveData) return strategy;
  const pnl = liveData.total_pnl || 0;
  const val = liveData.total_value || 0;
  return {
    ...strategy,
    name: liveData.name || strategy.name,
    image: liveData.image || strategy.image,
    winRate: liveData.win_rate || 0,
    profit: formatCompact(pnl),
    trades: `${liveData.position_count || 0}`,
    returnPct: liveData.roi || 0,
    aum: formatCompact(val),
    avgTradeSize: liveData.total_volume && liveData.position_count
      ? formatCompact(liveData.total_volume / liveData.position_count)
      : "$0",
  };
}

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function generateEquityData(returnPct: number, points: number = 180): { day: number; value: number }[] {
  const data: { day: number; value: number }[] = [];
  let value = 1000;
  const dailyBias = (returnPct / 100) / points;
  const volatility = 0.015;
  let seed = Math.round(returnPct * 1000);
  function seededRandom() {
    seed = (seed * 16807 + 0) % 2147483647;
    return seed / 2147483647;
  }
  for (let i = 0; i < points; i++) {
    const change = dailyBias + (seededRandom() - 0.48) * volatility;
    value = value * (1 + change);
    if (value < 800) value = 800 + seededRandom() * 20;
    data.push({ day: i, value: Math.round(value * 100) / 100 });
  }
  const targetFinal = 1000 * (1 + returnPct / 100);
  const scaleFactor = targetFinal / data[data.length - 1].value;
  return data.map((d) => ({
    day: d.day,
    value: Math.round((1000 + (d.value - 1000) * scaleFactor) * 100) / 100,
  }));
}

export function generateRecentTrades(strategy: Strategy): { date: string; action: string; market: string; amount: string; outcome: string }[] {
  return [];
}

export function generateHoldings(strategy: Strategy): { market: string; outcome: string; entry: number; current: number; size: string }[] {
  return [];
}
