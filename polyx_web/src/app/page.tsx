"use client";

import Link from "next/link";
import { useState } from "react";
import { STRATEGY_LIST, FEATURED_STRATEGIES } from "@/lib/strategies";

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-bg-primary text-white overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[rgba(14,15,17,0.8)] border-b border-border">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between h-[60px] sm:h-[70px] px-4 sm:px-7">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-sm text-white">X</div>
            <span className="font-display text-lg sm:text-xl font-semibold">PolyX</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#strategies" className="text-sm text-text-secondary hover:text-white transition-colors">Strategies</a>
            <a href="#how-it-works" className="text-sm text-text-secondary hover:text-white transition-colors">How It Works</a>
            <Link href="/auth" className="text-sm text-text-secondary hover:text-white transition-colors">Sign In</Link>
            <Link href="#strategies" className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all">
              Explore Strategies
            </Link>
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden text-text-secondary p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {mobileMenu ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden bg-bg-primary border-b border-border px-4 py-4 space-y-3">
            <a href="#strategies" onClick={() => setMobileMenu(false)} className="block text-sm text-text-secondary py-2">Strategies</a>
            <a href="#how-it-works" onClick={() => setMobileMenu(false)} className="block text-sm text-text-secondary py-2">How It Works</a>
            <Link href="/auth" onClick={() => setMobileMenu(false)} className="block text-sm text-text-secondary py-2">Sign In</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-[120px] sm:pt-[160px] pb-16 sm:pb-24 relative">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] sm:w-[800px] h-[500px] sm:h-[800px] bg-[radial-gradient(circle,rgba(40,80,238,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto px-4 sm:px-7 text-center relative z-10">
          <h1 className="font-display text-[2.2rem] sm:text-[clamp(3rem,6vw,4.5rem)] font-medium leading-[1.08] tracking-tight mb-5 sm:mb-6 px-2">
            Investing in Polymarket<br />
            <span className="gradient-text">Made Easy</span>
          </h1>
          <p className="text-text-secondary text-base sm:text-xl max-w-[540px] mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
            Choose a Strategy. Connect. That&apos;s it.<br className="hidden sm:block" />
            Auto-copy top traders with intelligent risk management.
          </p>
          <div className="flex gap-3 sm:gap-4 justify-center flex-wrap px-4">
            <a href="#strategies" className="bg-accent hover:bg-accent-hover text-white font-medium px-7 sm:px-8 py-3.5 rounded-xl transition-all hover:-translate-y-0.5 flex items-center gap-2 text-sm sm:text-base">
              Explore Strategies
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </section>

      {/* Featured Strategies — horizontal scroll */}
      <section className="pb-8 sm:pb-12">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-7">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-lg sm:text-xl font-semibold">Featured Strategies</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            {FEATURED_STRATEGIES.map((s) => (
              <Link
                key={s.slug}
                href={`/strategy/${s.slug}`}
                className="flex-shrink-0 w-[280px] sm:w-[320px] bg-bg-card border border-border rounded-2xl overflow-hidden hover:border-border-hover transition-all group"
              >
                <div className={`h-32 sm:h-36 bg-gradient-to-br ${s.gradient} relative`}>
                  <div className="absolute top-3 left-3 bg-black/30 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Featured
                  </div>
                  <div className="absolute bottom-4 left-4 text-4xl">{s.emoji}</div>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm sm:text-base">{s.name}</h3>
                    <span className="text-green font-semibold font-mono text-sm">+{s.returnPct}%</span>
                  </div>
                  <p className="text-xs text-text-muted mb-3">by {s.manager}</p>
                  <div className="flex gap-3 text-xs text-text-secondary">
                    <span>{s.winRate}% win</span>
                    <span>{s.copiers} copiers</span>
                    <span>{s.profit} profit</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* All Strategies Grid */}
      <section id="strategies" className="py-12 sm:py-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-7">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="font-display text-[1.5rem] sm:text-[clamp(2rem,4vw,3rem)] font-medium gradient-text mb-3">
              All Strategies
            </h2>
            <p className="text-text-secondary text-sm sm:text-base max-w-[500px] mx-auto">
              Pick a strategy, invest, and let the pros trade for you.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {STRATEGY_LIST.map((s) => (
              <Link
                key={s.slug}
                href={`/strategy/${s.slug}`}
                className="bg-bg-card border border-border rounded-2xl overflow-hidden hover:border-border-hover hover:-translate-y-1 transition-all group"
              >
                <div className={`h-28 sm:h-32 bg-gradient-to-br ${s.gradient} relative`}>
                  {s.featured && (
                    <div className="absolute top-3 left-3 bg-black/30 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Featured
                    </div>
                  )}
                  <div className="absolute bottom-3 left-4 text-3xl">{s.emoji}</div>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm sm:text-base">{s.name}</h3>
                    <span className="text-green font-semibold font-mono text-sm">+{s.returnPct}%</span>
                  </div>
                  <p className="text-xs text-text-muted mb-3">by {s.manager}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-bg-secondary rounded-lg p-2 text-center">
                      <div className="text-green font-semibold font-mono text-xs">{s.winRate}%</div>
                      <div className="text-[9px] text-text-muted uppercase">Win Rate</div>
                    </div>
                    <div className="bg-bg-secondary rounded-lg p-2 text-center">
                      <div className="font-semibold font-mono text-xs">{s.copiers}</div>
                      <div className="text-[9px] text-text-muted uppercase">Copiers</div>
                    </div>
                    <div className="bg-bg-secondary rounded-lg p-2 text-center">
                      <div className="font-semibold font-mono text-xs">{s.profit}</div>
                      <div className="text-[9px] text-text-muted uppercase">Profit</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 sm:py-24 border-t border-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-7">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="font-display text-[1.5rem] sm:text-[clamp(2rem,4vw,3rem)] font-medium gradient-text mb-4">
              How It Works
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
            {[
              { n: "1", title: "Choose a Strategy", desc: "Browse curated strategies from top Polymarket traders. Each one has a track record, stats, and risk profile." },
              { n: "2", title: "Connect & Invest", desc: "Sign in with your wallet or email. Choose how much to invest. Start with demo funds or go live." },
              { n: "3", title: "Auto-Pilot", desc: "The bot copies every trade in real-time with smart position sizing and 6-layer risk protection. You just watch." },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-5 text-accent font-display font-bold text-xl">{s.n}</div>
                <h3 className="font-semibold text-base mb-2">{s.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 text-center relative">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-[radial-gradient(circle,rgba(40,80,238,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto px-4 sm:px-7 relative z-10">
          <h2 className="font-display text-[1.5rem] sm:text-[clamp(2rem,4.5vw,3.5rem)] font-medium mb-3 sm:mb-4 leading-tight">
            Start Investing Today
          </h2>
          <p className="text-text-secondary text-sm sm:text-lg mb-8 sm:mb-10 max-w-[460px] mx-auto">
            Pick a strategy and let the best traders on Polymarket work for you.
          </p>
          <a href="#strategies" className="bg-accent hover:bg-accent-hover text-white font-medium px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-2 text-base sm:text-lg">
            Explore Strategies
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 sm:py-12">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-7">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-4 sm:gap-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center font-bold text-xs text-white">X</div>
                <span className="font-display font-semibold">PolyX</span>
              </Link>
              <span className="text-xs sm:text-sm text-text-muted">&copy; 2025 PolyX</span>
            </div>
            <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm text-text-secondary">
              <a href="#strategies" className="hover:text-white transition-colors">Strategies</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <Link href="/auth" className="hover:text-white transition-colors">Sign In</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
