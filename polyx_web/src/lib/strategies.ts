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

export const STRATEGIES: Record<string, Strategy> = {
  "sharky6999": {
    name: "Sharky6999",
    slug: "sharky6999",
    emoji: "\u{1F988}",
    manager: "Sharky",
    desc: "High-frequency crypto & BTC trader with 81% win rate. Specializes in short-term Bitcoin and altcoin prediction markets with rapid entry and exit strategies. Uses quantitative signals and on-chain data to identify high-probability setups.",
    wallet: "0x751a2b86cab503496efd325c8344e10159349ea1",
    winRate: 81,
    profit: "$890K",
    trades: "5,600+",
    copiers: 150,
    returnPct: 127.4,
    gradient: "from-blue-600 to-cyan-400",
    image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=800&fit=crop",
    aum: "$2.4M",
    avgTradeSize: "$420",
    featured: true,
    categories: ["Crypto", "BTC"],
  },
  "theo4": {
    name: "Theo4",
    slug: "theo4",
    emoji: "\u{1F40B}",
    manager: "Theo",
    desc: "Top whale with diverse bets across all markets. Known for massive conviction plays on politics, crypto, and cultural events. Consistently profitable across market cycles with disciplined risk management.",
    wallet: "0x56687bf447db6ffa42ffe2204a05edaa20f55839",
    winRate: 67,
    profit: "$22.4M",
    trades: "4,200+",
    copiers: 1240,
    returnPct: 89.2,
    gradient: "from-purple-600 to-pink-400",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=800&fit=crop",
    aum: "$18.5M",
    avgTradeSize: "$5,300",
    featured: true,
    categories: ["Diverse", "Politics", "Crypto"],
  },
  "sports-whale": {
    name: "Sports-Whale",
    slug: "sports-whale",
    emoji: "\u{1F3C0}",
    manager: "SportsBet",
    desc: "NBA, NHL specialist with large conviction bets. Deep knowledge of team dynamics, player stats, and line movements. Focuses on high-value spots where the market misprices outcomes.",
    wallet: "0x0c154c190e293b7e5f8d453b5f690c4dc9599a45",
    winRate: 72,
    profit: "$2.1M",
    trades: "1,850+",
    copiers: 336,
    returnPct: 156.8,
    gradient: "from-orange-500 to-yellow-400",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=800&fit=crop",
    aum: "$4.2M",
    avgTradeSize: "$1,100",
    featured: true,
    categories: ["Sports", "NBA", "NHL"],
  },
  "geopolitics-pro": {
    name: "Geopolitics-Pro",
    slug: "geopolitics-pro",
    emoji: "\u{1F30D}",
    manager: "GeoPol",
    desc: "Politics & geopolitics specialist with deep research. Tracks global political developments, election cycles, and policy shifts. Builds positions early based on fundamental analysis of political landscapes.",
    wallet: "0xfd22b8843ae03a33a8a4c5e39ef1e5ff33ebad91",
    winRate: 69,
    profit: "$1.5M",
    trades: "920+",
    copiers: 280,
    returnPct: 94.1,
    gradient: "from-emerald-500 to-teal-400",
    image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&h=800&fit=crop",
    aum: "$3.1M",
    avgTradeSize: "$1,650",
    featured: false,
    categories: ["Politics", "Geopolitics"],
  },
  "secondwindcapital": {
    name: "SecondWindCapital",
    slug: "secondwindcapital",
    emoji: "\u{1F30A}",
    manager: "SecondWind",
    desc: "Macro & crypto plays with risk-adjusted returns. Combines macroeconomic analysis with crypto market expertise. Focuses on asymmetric bets where downside is limited and upside is substantial.",
    wallet: "0x8c80d213c0cbad777d06ee3f58f6ca4bc03102c3",
    winRate: 71,
    profit: "$1.2M",
    trades: "2,400+",
    copiers: 200,
    returnPct: 108.5,
    gradient: "from-indigo-500 to-blue-400",
    image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=800&fit=crop",
    aum: "$2.8M",
    avgTradeSize: "$500",
    featured: false,
    categories: ["Macro", "Crypto"],
  },
};

export const STRATEGY_LIST = Object.values(STRATEGIES);
export const FEATURED_STRATEGIES = STRATEGY_LIST.filter((s) => s.featured);

export function generateEquityData(returnPct: number, points: number = 180): { day: number; value: number }[] {
  const data: { day: number; value: number }[] = [];
  let value = 1000;
  const dailyBias = (returnPct / 100) / points;
  const volatility = 0.015;

  // Use deterministic seed based on returnPct for consistency
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

  // Ensure final value matches returnPct roughly
  const targetFinal = 1000 * (1 + returnPct / 100);
  const scaleFactor = targetFinal / data[data.length - 1].value;
  return data.map((d, i) => ({
    day: d.day,
    value: Math.round((1000 + (d.value - 1000) * scaleFactor) * 100) / 100,
  }));
}

export function generateRecentTrades(strategy: Strategy): { date: string; action: string; market: string; amount: string; outcome: string }[] {
  const markets = [
    "BTC above $100K by June",
    "ETH flips BTC market cap",
    "Fed cuts rates in Q2",
    "Lakers win NBA Championship",
    "Trump wins 2028 primary",
    "SpaceX Mars landing 2027",
    "Apple stock above $250",
    "US GDP growth > 3%",
    "Bitcoin halving pump",
    "Next pandemic by 2027",
  ];

  const trades: { date: string; action: string; market: string; amount: string; outcome: string }[] = [];
  let seed = strategy.returnPct * 100;
  function seededRandom() {
    seed = (seed * 16807 + 0) % 2147483647;
    return seed / 2147483647;
  }

  for (let i = 0; i < 8; i++) {
    const daysAgo = Math.floor(seededRandom() * 14);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const action = seededRandom() > 0.3 ? "BUY" : "SELL";
    const market = markets[Math.floor(seededRandom() * markets.length)];
    const amount = `$${(50 + Math.floor(seededRandom() * 2000)).toLocaleString()}`;
    const outcome = seededRandom() > 0.5 ? "Yes" : "No";
    trades.push({
      date: date.toISOString().split("T")[0],
      action,
      market,
      amount,
      outcome,
    });
  }

  return trades.sort((a, b) => b.date.localeCompare(a.date));
}

export function generateHoldings(strategy: Strategy): { market: string; outcome: string; entry: number; current: number; size: string }[] {
  const markets = [
    "BTC above $100K by June",
    "Fed cuts rates in Q2",
    "Lakers win NBA Championship",
    "Trump approval above 50%",
    "ETH above $5K by EOY",
    "US enters recession 2026",
  ];

  const holdings: { market: string; outcome: string; entry: number; current: number; size: string }[] = [];
  let seed = strategy.copiers * 7;
  function seededRandom() {
    seed = (seed * 16807 + 0) % 2147483647;
    return seed / 2147483647;
  }

  const count = 3 + Math.floor(seededRandom() * 3);
  for (let i = 0; i < count; i++) {
    const market = markets[i % markets.length];
    const outcome = seededRandom() > 0.4 ? "Yes" : "No";
    const entry = 0.3 + seededRandom() * 0.4;
    const current = entry + (seededRandom() - 0.3) * 0.2;
    const size = `$${(100 + Math.floor(seededRandom() * 3000)).toLocaleString()}`;
    holdings.push({
      market,
      outcome,
      entry: Math.round(entry * 100) / 100,
      current: Math.min(0.99, Math.max(0.01, Math.round(current * 100) / 100)),
      size,
    });
  }
  return holdings;
}
