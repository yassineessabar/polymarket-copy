"use client";

import Link from "next/link";
import { STRATEGY_LIST, FEATURED_STRATEGIES } from "@/lib/strategies";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen w-full flex-col pt-[72px] lg:pt-24 bg-white text-[#121212]">
      {/* Nav — exact Autopilot style */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#F4F4F4]">
        <div className="flex items-center justify-between h-[72px] lg:h-24 px-4 lg:px-20">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-[#121212] flex items-center justify-center text-white font-bold text-sm">X</div>
            <span className="text-[20px] font-bold -tracking-[0.4px]">PolyX</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="hidden lg:block rounded-full px-5 py-2.5 text-sm font-medium text-[#121212] hover:bg-[#F7F7F7] transition-colors">Sign In</Link>
            <Link href="#strategies" className="rounded-full bg-[#121212] px-4 py-2 text-white lg:px-5 lg:py-2.5 text-sm font-medium">Explore Strategies</Link>
          </div>
        </div>
      </nav>

      {/* Hero — centered, clean, Autopilot-identical */}
      <div className="flex h-full min-h-[230px] w-full flex-col items-center md:min-h-[374px] justify-center py-12 lg:py-20 px-4">
        <div className="flex flex-col items-center gap-y-2 md:gap-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-[14px] bg-[#121212] flex items-center justify-center text-white font-bold text-lg">X</div>
            <p className="text-sm font-medium -tracking-[0.28px] text-[#9B9B9B]">PolyX</p>
          </div>
          <h1 className="text-center text-[32px] leading-[1.2] font-bold -tracking-[0.64px] text-black lg:text-[64px] lg:-tracking-[1.28px]">
            Investing in Polymarket<br />Made Easy
          </h1>
          <p className="text-sm font-medium -tracking-[0.28px] text-[#9B9B9B] text-center max-w-[400px] lg:text-base lg:-tracking-[0.32px]">
            Choose a Strategy. Connect your Wallet. That&apos;s it.
          </p>
          <Link href="#strategies" className="mt-4 flex items-center gap-2 rounded-full bg-[#121212] px-6 py-3 text-white text-sm font-medium hover:bg-[#333] transition-colors">
            Explore Strategies
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m0 0-7-7m7 7-7 7" /></svg>
          </Link>
        </div>
      </div>

      {/* Featured — horizontal scroll, square cards with overlay text */}
      <section className="flex flex-col">
        <h2 className="pl-4 text-[18px] font-bold -tracking-[0.36px] text-[#121212] lg:pl-20 lg:text-2xl lg:-tracking-[0.48px]">Featured</h2>
        <ul className="flex w-full items-center overflow-x-scroll no-scrollbar py-4 pl-4 lg:pl-20 gap-4">
          {FEATURED_STRATEGIES.map((s) => (
            <li key={s.slug} className="flex-shrink-0">
              <Link href={`/strategy/${s.slug}`}>
                <div className={`relative w-[280px] sm:w-[320px] h-[320px] sm:h-[360px] rounded-2xl overflow-hidden bg-gradient-to-br ${s.gradient}`}>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
                  <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-y-3 p-5">
                    <div className="w-min rounded-sm border border-white/10 bg-black/20 px-2 py-1 text-xs font-medium -tracking-[0.24px] text-white backdrop-blur-sm whitespace-nowrap">Featured</div>
                    <div>
                      <p className="text-2xl font-bold -tracking-[0.48px] text-white">{s.name}</p>
                      <div className="flex text-sm -tracking-[0.28px] items-center gap-1">
                        <p className="font-normal text-white/60">by</p>
                        <p className="font-medium text-white/80">{s.manager}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* All Strategies — grid with cover images */}
      <section id="strategies" className="flex flex-col gap-y-4 lg:gap-y-5 px-4 lg:px-20 py-10 lg:py-16">
        <header className="flex flex-col gap-y-2">
          <h2 className="text-[18px] font-bold -tracking-[0.36px] text-[#121212] lg:text-2xl lg:-tracking-[0.48px]">All Strategies</h2>
          <p className="text-xs font-medium -tracking-[0.24px] text-[#9B9B9B] lg:text-sm lg:-tracking-[0.28px]">Pick a strategy and start copying top Polymarket traders</p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {STRATEGY_LIST.map((s) => (
            <Link key={s.slug} href={`/strategy/${s.slug}`}>
              <div className="bg-white rounded-2xl overflow-hidden border border-[#F4F4F4] hover:shadow-md transition-all">
                <div className={`relative h-[160px] sm:h-[180px] bg-gradient-to-br ${s.gradient}`}>
                  {s.featured && (
                    <div className="absolute top-3 left-3 rounded-sm border border-white/10 bg-black/20 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">Featured</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
                  <div className="absolute bottom-3 left-4">
                    <p className="text-lg font-bold -tracking-[0.36px] text-white">{s.name}</p>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${s.gradient}`} />
                      <p className="text-sm font-medium -tracking-[0.28px] text-[#121212]">by {s.manager}</p>
                    </div>
                    <p className="text-sm font-bold -tracking-[0.28px] text-[#009D55]">+{s.returnPct}%</p>
                  </div>
                  <div className="flex items-center gap-x-4 text-xs font-medium -tracking-[0.24px] text-[#9B9B9B]">
                    <span>{s.winRate}% win rate</span>
                    <span>{s.copiers} copiers</span>
                    <span>{s.trades} trades</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works — 3 steps, centered, like Autopilot */}
      <section className="flex w-full flex-col items-center justify-center gap-12 border-y border-[#F4F4F4] px-4 py-16 lg:gap-y-20 lg:py-[120px]">
        <h2 className="text-center text-[32px] leading-[1.2] font-bold -tracking-[0.64px] text-black lg:text-[64px] lg:-tracking-[1.28px]">How it works.</h2>
        <div className="flex flex-col items-center justify-center gap-10 lg:gap-16 lg:flex-row">
          {[
            { title: "Pick your Strategy", desc: "Choose from any of our strategies to invest in.", card: (
              <div className="w-[280px] md:w-[320px] rounded-[22px] shadow-md shadow-black/10 overflow-hidden border border-[#F4F4F4]">
                <div className="flex items-center gap-x-4 p-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 flex-shrink-0" />
                  <div className="flex flex-col overflow-hidden">
                    <p className="text-lg font-bold truncate">Sharky6999</p>
                    <p className="text-sm font-medium text-black/40 truncate">by Sharky</p>
                  </div>
                </div>
              </div>
            )},
            { title: "Connect your Wallet", desc: "Link your wallet or sign in with email to get started.", card: (
              <div className="w-[280px] md:w-[320px] rounded-[22px] shadow-md shadow-black/10 border border-[#F4F4F4] p-6 flex flex-col items-center gap-3">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth="1.5"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" /></svg>
                <p className="text-sm font-medium text-[#9B9B9B]">MetaMask, Email, or WalletConnect</p>
              </div>
            )},
            { title: "That's it.", desc: "Your portfolio runs on autopilot. We copy every trade automatically.", card: (
              <div className="w-[280px] md:w-[320px] rounded-[22px] shadow-md shadow-black/10 border border-[#F4F4F4] p-6 flex flex-col items-center gap-3">
                <div className="text-[#009D55] text-4xl font-bold">+127%</div>
                <p className="text-sm font-medium text-[#9B9B9B]">All-time return</p>
              </div>
            )},
          ].map((step, i) => (
            <div key={i} className="flex flex-col gap-y-3 text-center items-center max-w-[360px]">
              {step.card}
              <h3 className="text-lg font-bold -tracking-[0.36px] text-black lg:text-[20px] lg:-tracking-[0.4px]">{step.title}</h3>
              <p className="text-sm font-normal -tracking-[0.28px] text-[#656565] lg:text-base lg:-tracking-[0.32px]">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer — Autopilot style */}
      <footer className="flex w-full flex-col bg-[#F7F7F7] px-4 py-10 lg:px-20 lg:py-[68px]">
        <h2 className="pb-8 text-2xl font-bold -tracking-[0.96px] text-black">PolyX</h2>
        <div className="flex flex-col gap-y-6 lg:flex-row lg:gap-x-20">
          <div className="flex flex-col gap-y-2">
            <p className="text-sm font-medium text-[#121212]">Product</p>
            <Link href="#strategies" className="text-sm font-normal text-[#9B9B9B] hover:text-[#121212] transition-colors">Strategies</Link>
            <Link href="/auth" className="text-sm font-normal text-[#9B9B9B] hover:text-[#121212] transition-colors">Sign In</Link>
          </div>
          <div className="flex flex-col gap-y-2">
            <p className="text-sm font-medium text-[#121212]">Company</p>
            <span className="text-sm font-normal text-[#9B9B9B]">About</span>
            <span className="text-sm font-normal text-[#9B9B9B]">Contact</span>
          </div>
          <div className="flex flex-col gap-y-2">
            <p className="text-sm font-medium text-[#121212]">Legal</p>
            <span className="text-sm font-normal text-[#9B9B9B]">Terms of Service</span>
            <span className="text-sm font-normal text-[#9B9B9B]">Privacy Policy</span>
          </div>
        </div>
        <div className="my-6 h-px w-full bg-black/[0.08]" />
        <p className="text-xs font-normal text-[#9B9B9B] max-w-[800px]">
          PolyX is not a registered investment adviser. The strategies you see are created and managed by independent traders.
          Past performance is not a guarantee of future results. Investing involves risk, including loss of all or a portion of your investment.
        </p>
      </footer>
    </div>
  );
}
