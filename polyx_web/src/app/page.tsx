"use client";

import Link from "next/link";
import { useState } from "react";
import { STRATEGY_LIST, FEATURED_STRATEGIES } from "@/lib/strategies";

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#F7F7F7] text-[#121212] overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between h-[60px] sm:h-[70px] px-5 sm:px-7 lg:px-20">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#121212] flex items-center justify-center font-bold text-sm text-white">P</div>
            <span className="text-lg sm:text-xl font-bold tracking-tight">PolyX</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#strategies" className="text-sm font-medium text-[#9B9B9B] hover:text-[#121212] transition-colors">Strategies</a>
            <a href="#how-it-works" className="text-sm font-medium text-[#9B9B9B] hover:text-[#121212] transition-colors">How It Works</a>
            <Link href="/auth" className="text-sm font-medium text-[#9B9B9B] hover:text-[#121212] transition-colors">Sign In</Link>
            <Link href="#strategies" className="bg-[#121212] hover:bg-[#333] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all">
              Explore Portfolios
            </Link>
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden text-[#656565] p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {mobileMenu ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden bg-white border-b border-black/5 px-5 py-4 space-y-3">
            <a href="#strategies" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-[#656565] py-2">Strategies</a>
            <a href="#how-it-works" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-[#656565] py-2">How It Works</a>
            <Link href="/auth" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-[#656565] py-2">Sign In</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-[130px] sm:pt-[170px] pb-16 sm:pb-24">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-7 lg:px-20 text-center">
          <h1 className="text-[32px] sm:text-[48px] lg:text-[64px] font-bold leading-[1.05] tracking-tight mb-5 sm:mb-6 text-[#121212]">
            Investing in Polymarket<br />
            Made Easy
          </h1>
          <p className="text-[#9B9B9B] text-base sm:text-xl font-medium -tracking-[0.28px] max-w-[540px] mx-auto mb-8 sm:mb-10 leading-relaxed">
            Choose a Strategy. Connect. That&apos;s it.<br className="hidden sm:block" />
            Auto-copy top traders with intelligent risk management.
          </p>
          <div className="flex gap-3 sm:gap-4 justify-center flex-wrap px-4">
            <a href="#strategies" className="bg-[#121212] hover:bg-[#333] text-white font-medium px-7 sm:px-8 py-3.5 rounded-full transition-all hover:-translate-y-0.5 flex items-center gap-2 text-sm sm:text-base">
              Explore Strategies
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </section>

      {/* Featured Strategies -- horizontal scroll */}
      <section className="pb-8 sm:pb-12">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-7 lg:px-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#121212]">Featured Strategies</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5 sm:mx-0 sm:px-0">
            {FEATURED_STRATEGIES.map((s) => (
              <Link
                key={s.slug}
                href={`/strategy/${s.slug}`}
                className="flex-shrink-0 w-[280px] sm:w-[320px] bg-white rounded-2xl overflow-hidden hover:-translate-y-1 transition-all group shadow-sm"
              >
                <div className={`h-32 sm:h-36 bg-gradient-to-br ${s.gradient} relative`}>
                  <div className="absolute top-3 left-3 bg-white/90 text-[#121212] text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Featured
                  </div>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm sm:text-base text-[#121212]">{s.name}</h3>
                    <span className="text-[#009D55] font-semibold font-mono text-sm">+{s.returnPct}%</span>
                  </div>
                  <p className="text-xs text-[#9B9B9B] font-medium mb-3">by {s.manager}</p>
                  <div className="flex gap-3 text-xs text-[#656565] font-medium">
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
        <div className="max-w-[1200px] mx-auto px-5 sm:px-7 lg:px-20">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight text-[#121212] mb-3">
              All Strategies
            </h2>
            <p className="text-[#9B9B9B] text-sm sm:text-base font-medium max-w-[500px] mx-auto">
              Pick a strategy, invest, and let the pros trade for you.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {STRATEGY_LIST.map((s) => (
              <Link
                key={s.slug}
                href={`/strategy/${s.slug}`}
                className="bg-white rounded-2xl overflow-hidden hover:-translate-y-1 transition-all group shadow-sm"
              >
                <div className={`h-28 sm:h-32 bg-gradient-to-br ${s.gradient} relative`}>
                  {s.featured && (
                    <div className="absolute top-3 left-3 bg-white/90 text-[#121212] text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Featured
                    </div>
                  )}
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm sm:text-base text-[#121212]">{s.name}</h3>
                    <span className="text-[#009D55] font-semibold font-mono text-sm">+{s.returnPct}%</span>
                  </div>
                  <p className="text-xs text-[#9B9B9B] font-medium mb-3">by {s.manager}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#F7F7F7] rounded-lg p-2 text-center">
                      <div className="text-[#009D55] font-semibold font-mono text-xs">{s.winRate}%</div>
                      <div className="text-[9px] text-[#9B9B9B] uppercase font-medium">Win Rate</div>
                    </div>
                    <div className="bg-[#F7F7F7] rounded-lg p-2 text-center">
                      <div className="font-semibold font-mono text-xs text-[#121212]">{s.copiers}</div>
                      <div className="text-[9px] text-[#9B9B9B] uppercase font-medium">Copiers</div>
                    </div>
                    <div className="bg-[#F7F7F7] rounded-lg p-2 text-center">
                      <div className="font-semibold font-mono text-xs text-[#121212]">{s.profit}</div>
                      <div className="text-[9px] text-[#9B9B9B] uppercase font-medium">Profit</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 sm:py-24 border-t border-black/5">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-7 lg:px-20">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight text-[#121212] mb-4">
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
                <div className="w-14 h-14 rounded-full bg-[#121212] flex items-center justify-center mx-auto mb-5 text-white font-bold text-xl">{s.n}</div>
                <h3 className="font-bold text-base mb-2 text-[#121212]">{s.title}</h3>
                <p className="text-sm text-[#9B9B9B] font-medium leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 text-center">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-7 lg:px-20">
          <h2 className="text-2xl sm:text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-tight text-[#121212] mb-3 sm:mb-4 leading-tight">
            Start Investing Today
          </h2>
          <p className="text-[#9B9B9B] text-sm sm:text-lg font-medium mb-8 sm:mb-10 max-w-[460px] mx-auto">
            Pick a strategy and let the best traders on Polymarket work for you.
          </p>
          <a href="#strategies" className="bg-[#121212] hover:bg-[#333] text-white font-medium px-8 sm:px-10 py-3.5 sm:py-4 rounded-full transition-all hover:-translate-y-0.5 inline-flex items-center gap-2 text-base sm:text-lg">
            Explore Strategies
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/5 py-8 sm:py-12 bg-white">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-7 lg:px-20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-4 sm:gap-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#121212] flex items-center justify-center font-bold text-xs text-white">P</div>
                <span className="font-bold text-[#121212]">PolyX</span>
              </Link>
              <span className="text-xs sm:text-sm text-[#9B9B9B]">2025 PolyX</span>
            </div>
            <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm text-[#9B9B9B] font-medium">
              <a href="#strategies" className="hover:text-[#121212] transition-colors">Strategies</a>
              <a href="#how-it-works" className="hover:text-[#121212] transition-colors">How It Works</a>
              <Link href="/auth" className="hover:text-[#121212] transition-colors">Sign In</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
