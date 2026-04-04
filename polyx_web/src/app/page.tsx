"use client";

import Link from "next/link";
import { useState } from "react";

const FEATURES = [
  { title: "Browse Markets", desc: "Browse Polymarket markets directly from the dashboard instantly.", emoji: "\u{1F4CA}" },
  { title: "Buy and Sell", desc: "Execute buy and sell orders quickly without leaving the platform.", emoji: "\u{1F4B0}" },
  { title: "Copy Trading", desc: "Automatically copy trades from profitable wallets in real time.", emoji: "\u{1F3AF}" },
  { title: "Portfolio Tracking", desc: "Track all your positions, P&L, and performance in one place.", emoji: "\u{1F4C8}" },
  { title: "Smart Wallets", desc: "Get a secure wallet instantly. Deposit USDC on Polygon to start.", emoji: "\u{1F48E}" },
  { title: "Risk Engine", desc: "6-layer risk protection: daily limits, exposure caps, drawdown scaling.", emoji: "\u{1F6E1}\uFE0F" },
  { title: "Referral Hub", desc: "Invite friends and earn rewards from their trading activity.", emoji: "\u{1F465}" },
  { title: "Non-Custodial", desc: "Your keys, your funds. Export your wallet anytime.", emoji: "\u{1F510}" },
];

const TRADERS = [
  { name: "Sharky6999", emoji: "\u{1F988}", desc: "High-freq crypto & BTC", winRate: 81, profit: "$890K", weekly: "+12.4%" },
  { name: "Theo4", emoji: "\u{1F40B}", desc: "Top whale, diverse bets", winRate: 67, profit: "$22.4M", weekly: "+8.2%" },
  { name: "Sports-Whale", emoji: "\u{1F3C0}", desc: "NBA, NHL, large bets", winRate: 72, profit: "$2.1M", weekly: "+15.7%" },
];

const FAQS = [
  { q: "What is PolyX?", a: "PolyX is a web-based platform that automatically copies trades from top-performing wallets on Polymarket. When a top trader buys or sells a prediction, PolyX mirrors the trade in your wallet with intelligent position sizing." },
  { q: "How does copy trading work?", a: "Our engine polls target wallets every 5 seconds. When a new trade is detected, it calculates a confidence score based on the trader\u2019s bet size vs their history, then executes a proportionally-sized trade in your wallet." },
  { q: "Do I keep control of my funds?", a: "Yes. You get a dedicated Polygon wallet. You can deposit and withdraw USDC at any time. Your private key is encrypted and can be exported." },
  { q: "What are the fees?", a: "$39/month subscription for live trading, plus a 25% performance fee on profits only. If a position closes at a loss, you pay nothing extra. Demo mode is completely free." },
  { q: "How do I get started?", a: "Connect your wallet or sign in with email. You\u2019ll get a free trading wallet instantly. Start in demo mode with $1,000 virtual funds, then go live when ready." },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-bg-primary text-white overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[rgba(27,27,27,0.26)] border-b border-border">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between h-[60px] sm:h-[70px] px-4 sm:px-7">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-sm text-white">X</div>
            <span className="font-display text-lg sm:text-xl font-semibold">PolyX</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-sm text-text-secondary hover:text-white transition-colors">Features</a>
            <a href="#traders" className="text-sm text-text-secondary hover:text-white transition-colors">Traders</a>
            <a href="#faq" className="text-sm text-text-secondary hover:text-white transition-colors">FAQ</a>
            <Link href="/auth" className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all hover:-translate-y-0.5">
              Get Started
            </Link>
          </div>

          {/* Mobile nav */}
          <div className="flex md:hidden items-center gap-3">
            <Link href="/auth" className="bg-accent text-white text-xs font-medium px-4 py-2 rounded-full">
              Get Started
            </Link>
            <button onClick={() => setMobileMenu(!mobileMenu)} className="text-text-secondary p-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                {mobileMenu ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenu && (
          <div className="md:hidden bg-bg-primary border-b border-border px-4 py-4 space-y-3">
            <a href="#features" onClick={() => setMobileMenu(false)} className="block text-sm text-text-secondary py-2">Features</a>
            <a href="#traders" onClick={() => setMobileMenu(false)} className="block text-sm text-text-secondary py-2">Traders</a>
            <a href="#faq" onClick={() => setMobileMenu(false)} className="block text-sm text-text-secondary py-2">FAQ</a>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-[100px] sm:pt-[140px] pb-12 sm:pb-20 relative overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-[radial-gradient(circle,rgba(40,80,238,0.12)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto px-4 sm:px-7 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-bg-secondary border border-border rounded-full text-xs sm:text-sm text-text-secondary mb-6 sm:mb-8">
            <span className="w-2 h-2 bg-green rounded-full animate-pulse" />
            Live on Polymarket
          </div>
          <h1 className="font-display text-[2rem] sm:text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.1] tracking-tight mb-4 sm:mb-6 px-2">
            Copy Top Polymarket<br />
            <span className="gradient-text">Traders. Automatically.</span>
          </h1>
          <p className="text-text-secondary text-sm sm:text-lg max-w-[520px] mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
            Auto-copy the sharpest minds on Polymarket with smart confidence scoring,
            6-layer risk protection, and real-time execution.
          </p>
          <div className="flex gap-3 sm:gap-4 justify-center flex-wrap px-4">
            <Link href="/auth" className="bg-accent hover:bg-accent-hover text-white font-medium px-6 sm:px-8 py-3 sm:py-3.5 rounded-full transition-all hover:-translate-y-0.5 flex items-center gap-2 text-sm sm:text-base">
              Start Copying
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <a href="#features" className="bg-bg-card border border-border hover:border-border-hover text-white font-medium px-6 sm:px-8 py-3 sm:py-3.5 rounded-full transition-all text-sm sm:text-base">
              How It Works
            </a>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:justify-center gap-6 sm:gap-12 mt-10 sm:mt-16 px-4">
            {[
              { val: "5", label: "Top Traders", accent: true },
              { val: "5s", label: "Detection" },
              { val: "24/7", label: "Autopilot" },
              { val: "$0", label: "Demo Mode", accent: true },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className={`text-2xl sm:text-3xl font-semibold font-mono ${s.accent ? "text-green" : "text-white"}`}>{s.val}</div>
                <div className="text-[10px] sm:text-xs text-text-muted uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24 relative">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-7">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="font-display text-[1.5rem] sm:text-[clamp(2rem,4vw,3rem)] font-medium gradient-text mb-3 sm:mb-4">
              Everything You Need to Trade Smarter
            </h2>
            <p className="text-text-secondary text-sm sm:text-base max-w-[500px] mx-auto px-2">
              Powerful tools built specifically for Polymarket prediction markets.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-7 hover:border-border-hover hover:-translate-y-1 transition-all group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[rgba(40,80,238,0.1)] border border-[rgba(40,80,238,0.2)] flex items-center justify-center text-lg sm:text-xl mb-3 sm:mb-5">
                  {f.emoji}
                </div>
                <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">{f.title}</h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Traders */}
      <section id="traders" className="py-16 sm:py-24">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-7">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="font-display text-[1.5rem] sm:text-[clamp(2rem,4vw,3rem)] font-medium gradient-text mb-3 sm:mb-4">
              Curated Smart Money
            </h2>
            <p className="text-text-secondary text-sm sm:text-base max-w-[500px] mx-auto px-2">
              Hand-picked traders with proven track records. Pick a portfolio, invest, and let them trade for you.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {TRADERS.map((t, i) => (
              <div key={i} className="bg-bg-card border border-border rounded-xl sm:rounded-2xl p-5 sm:p-7 hover:border-border-hover transition-all">
                <div className="flex items-center gap-3 mb-4 sm:mb-5">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-bg-secondary border border-border flex items-center justify-center text-xl sm:text-2xl">{t.emoji}</div>
                  <div>
                    <div className="font-semibold text-sm sm:text-base">{t.name}</div>
                    <div className="text-xs text-text-muted">{t.desc}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="bg-bg-secondary rounded-lg p-2.5 sm:p-3">
                    <div className="text-green font-semibold font-mono text-sm">{t.winRate}%</div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wide">Win Rate</div>
                  </div>
                  <div className="bg-bg-secondary rounded-lg p-2.5 sm:p-3">
                    <div className="font-semibold font-mono text-sm">{t.profit}</div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wide">Profit</div>
                  </div>
                  <div className="bg-bg-secondary rounded-lg p-2.5 sm:p-3">
                    <div className="text-green font-semibold font-mono text-sm">{t.weekly}</div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wide">Weekly</div>
                  </div>
                </div>
                <Link href="/auth" className="mt-4 sm:mt-5 w-full bg-accent hover:bg-accent-hover text-white text-sm font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2">
                  Invest in this Portfolio
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-24 border-t border-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-7">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="font-display text-[1.5rem] sm:text-[clamp(2rem,4vw,3rem)] font-medium gradient-text mb-4">
              Start Copying in 30 Seconds
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {[
              { n: "1", title: "Connect", desc: "Connect your wallet or sign in with email. Get a trading wallet instantly." },
              { n: "2", title: "Try Demo", desc: "Practice with $1,000 virtual funds. Same markets, same logic, zero risk." },
              { n: "3", title: "Pick Traders", desc: "Choose from curated top performers or paste any wallet address." },
              { n: "4", title: "Go Live", desc: "Subscribe, deposit USDC, and the engine copies every trade 24/7." },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-bg-card border border-border flex items-center justify-center mx-auto mb-3 sm:mb-5 text-accent font-mono font-semibold text-base sm:text-lg">{s.n}</div>
                <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">{s.title}</h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 sm:py-24">
        <div className="max-w-[780px] mx-auto px-4 sm:px-7">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="font-display text-[1.5rem] sm:text-[clamp(2rem,4vw,3rem)] font-medium gradient-text mb-3 sm:mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-text-secondary text-sm sm:text-base">You only pay more when you make more.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-bg-card border border-border rounded-xl sm:rounded-2xl p-6 sm:p-10">
              <div className="font-semibold text-base sm:text-lg mb-2">Demo</div>
              <div className="text-3xl sm:text-4xl font-bold mb-1">Free</div>
              <div className="text-xs sm:text-sm text-text-secondary mb-6 sm:mb-8">Practice with virtual funds</div>
              <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8 text-xs sm:text-sm text-text-secondary">
                {["Unlimited demo trading", "Real market data", "Full risk engine", "All curated traders", "Portfolio tracking"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 sm:gap-3"><span className="text-green">&#10003;</span>{f}</li>
                ))}
              </ul>
              <Link href="/auth" className="w-full bg-bg-secondary border border-border hover:border-border-hover text-white font-medium py-2.5 sm:py-3 rounded-xl transition-all flex items-center justify-center text-sm">
                Try Demo Free
              </Link>
            </div>
            <div className="bg-bg-card border-2 border-accent rounded-xl sm:rounded-2xl p-6 sm:p-10 relative mt-4 md:mt-0">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-1 rounded-full tracking-wider">MOST POPULAR</div>
              <div className="font-semibold text-base sm:text-lg mb-2">Live</div>
              <div className="text-3xl sm:text-4xl font-bold mb-1">$39<span className="text-base sm:text-lg font-normal text-text-secondary">/mo</span></div>
              <div className="text-xs sm:text-sm text-text-secondary mb-6 sm:mb-8">+ 25% performance fee on profits</div>
              <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8 text-xs sm:text-sm text-text-secondary">
                {["Everything in Demo", "Real trade execution", "Instant copy trading 24/7", "On-chain USDC settlement", "No fee on losing trades"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 sm:gap-3"><span className="text-green">&#10003;</span>{f}</li>
                ))}
              </ul>
              <Link href="/auth" className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-2.5 sm:py-3 rounded-xl transition-all flex items-center justify-center text-sm">
                Start Trading
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 sm:py-24">
        <div className="max-w-[720px] mx-auto px-4 sm:px-7">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="font-display text-[1.5rem] sm:text-[clamp(2rem,4vw,3rem)] font-medium gradient-text mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-bg-card border border-border rounded-xl sm:rounded-2xl overflow-hidden transition-colors hover:border-border-hover">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 sm:p-6 text-left font-semibold text-sm sm:text-base"
                >
                  <span className="pr-4">{faq.q}</span>
                  <span className={`text-text-muted transition-transform flex-shrink-0 text-lg ${openFaq === i ? "rotate-45" : ""}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 sm:px-6 sm:pb-6 text-xs sm:text-sm text-text-secondary leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 text-center relative">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[radial-gradient(circle,rgba(40,80,238,0.1)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto px-4 sm:px-7 relative z-10">
          <h2 className="font-display text-[1.5rem] sm:text-[clamp(2rem,4.5vw,3.5rem)] font-medium mb-3 sm:mb-4 leading-tight">
            Smart Money.<br /><span className="gradient-text">Copied Instantly.</span>
          </h2>
          <p className="text-text-secondary text-sm sm:text-lg mb-8 sm:mb-10 max-w-[460px] mx-auto px-2">
            Join the traders who let the best minds on Polymarket do the work.
          </p>
          <Link href="/auth" className="bg-accent hover:bg-accent-hover text-white font-medium px-8 sm:px-10 py-3.5 sm:py-4 rounded-full transition-all hover:-translate-y-0.5 inline-flex items-center gap-2 text-base sm:text-lg">
            Get Started
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
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
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#traders" className="hover:text-white transition-colors">Traders</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
