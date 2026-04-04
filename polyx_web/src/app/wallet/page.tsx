"use client";

import { useEffect, useState } from "react";
import { userApi } from "@/lib/api";
import { formatUsd } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";

type Tab = "card" | "crypto" | "withdraw";

const CHAINS = [
  {
    name: "Solana",
    min: "$3",
    desc: "Send USDC or SOL",
    color: "#9945FF",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#9945FF" />
        <path d="M7 15.5l2-2h8l-2 2H7zm0-3.5l2 2h8l-2-2H7zm0-3l2-2h8l-2 2H7z" fill="white" />
      </svg>
    ),
  },
  {
    name: "Ethereum",
    min: "$8",
    desc: "Send USDC, ETH, or USDT",
    color: "#627EEA",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#627EEA" />
        <path d="M12 4l5 8.5-5 3-5-3L12 4z" fill="white" fillOpacity="0.9" />
        <path d="M12 16.5l5-3.5-5 7.5-5-7.5 5 3.5z" fill="white" fillOpacity="0.6" />
      </svg>
    ),
  },
  {
    name: "Polygon",
    min: "$3",
    desc: "Send USDC, USDC.e, or MATIC",
    color: "#8247E5",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#8247E5" />
        <path d="M15 9l-3-2-3 2v4l3 2 3-2V9z" fill="white" />
      </svg>
    ),
  },
  {
    name: "Base",
    min: "$3",
    desc: "Send USDC or ETH",
    color: "#0052FF",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#0052FF" />
        <circle cx="12" cy="12" r="5" fill="white" />
      </svg>
    ),
  },
  {
    name: "BNB Chain",
    min: "$3",
    desc: "Send USDC, BNB, or USDT",
    color: "#F3BA2F",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#F3BA2F" />
        <path d="M12 6l2 2-2 2-2-2 2-2zm-4 4l2 2-2 2-2-2 2-2zm8 0l2 2-2 2-2-2 2-2zm-4 4l2 2-2 2-2-2 2-2z" fill="white" />
      </svg>
    ),
  },
];

export default function WalletPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("card");
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [withdrawAddr, setWithdrawAddr] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");

  useEffect(() => {
    userApi.me().then(setProfile).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function copyAddress() {
    if (!profile?.wallet_address) return;
    navigator.clipboard.writeText(profile.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#3B5BFE] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080B16]">
      <div className="max-w-[600px] mx-auto px-4 pb-8">
        {/* Header */}
        <div className="flex items-center py-4 relative">
          <Link href="/dashboard" className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-white mx-auto">Fund Wallet</h1>
        </div>

        {/* Title */}
        <div className="mt-2">
          <h2 className="text-2xl font-bold text-white">Fund your wallet</h2>
          <p className="text-sm text-[#8B8FA3] mt-1">Add funds or withdraw USDC.e</p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-[#1E2235] rounded-full p-1 flex mt-4">
          {([
            { key: "card" as Tab, label: "Card", icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            )},
            { key: "crypto" as Tab, label: "Crypto", icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 3l-4 4-4-4" />
              </svg>
            )},
            { key: "withdraw" as Tab, label: "Withdraw", icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            )},
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelectedChain(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-[#3B5BFE] text-white"
                  : "text-[#5A5F7A] hover:text-[#8B8FA3]"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "card" && (
          <div>
            {/* MoonPay Banner */}
            <div className="bg-[#7B3FE4] rounded-2xl h-40 flex items-center justify-center mt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-white" />
                </div>
                <span className="text-2xl font-bold text-white">MoonPay</span>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-[#141728] rounded-xl p-4 mt-4">
              <p className="font-bold text-white mb-3">Pay with MoonPay</p>
              <div className="space-y-3">
                {[
                  "Open secure checkout",
                  "Pay by card / Apple Pay / Google Pay",
                  "Funds arrive in your wallet",
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#1E2235] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm text-[#8B8FA3]">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <a
              href={`https://www.moonpay.com/buy/usdc_polygon?walletAddress=${profile?.wallet_address || ""}&currencyCode=usdc_polygon`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-[#3B5BFE] hover:bg-[#2D4AE0] text-white text-center rounded-full py-3.5 font-medium mt-4 transition-colors"
            >
              Continue to MoonPay
            </a>
          </div>
        )}

        {tab === "crypto" && (
          <div className="mt-4">
            {!selectedChain ? (
              <>
                <p className="text-sm text-[#5A5F7A] mb-4">Choose which blockchain you&apos;ll send from</p>
                <div className="space-y-2">
                  {CHAINS.map((chain) => (
                    <button
                      key={chain.name}
                      onClick={() => setSelectedChain(chain.name)}
                      className="w-full bg-[#141728] hover:bg-[#1A1F35] rounded-xl p-4 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: chain.color }}>
                        {chain.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{chain.name}</span>
                          <span className="bg-[#1E2235] rounded-full px-2 py-0.5 text-[11px] text-[#5A5F7A]">min {chain.min}</span>
                        </div>
                        <p className="text-xs text-[#5A5F7A] mt-0.5">{chain.desc}</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A5F7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div>
                <button
                  onClick={() => setSelectedChain(null)}
                  className="flex items-center gap-2 text-[#8B8FA3] text-sm mb-4 hover:text-white transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back to chains
                </button>
                <div className="bg-[#141728] rounded-xl p-6 text-center">
                  <p className="text-sm text-[#8B8FA3] mb-4">Send to this address on <span className="text-white font-medium">{selectedChain}</span></p>
                  <div className="bg-white p-4 rounded-2xl inline-block mb-4">
                    <QRCodeSVG value={profile?.wallet_address || ""} size={160} />
                  </div>
                  <div className="bg-[#1E2235] rounded-xl px-4 py-3 font-mono text-xs break-all text-[#8B8FA3] mb-4">
                    {profile?.wallet_address}
                  </div>
                  <button
                    onClick={copyAddress}
                    className="bg-[#3B5BFE] hover:bg-[#2D4AE0] text-white rounded-full px-6 py-2.5 text-sm font-medium transition-colors"
                  >
                    {copied ? "Copied!" : "Copy Address"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "withdraw" && (
          <div className="mt-4">
            {/* Balance */}
            <div className="bg-[#141728] rounded-xl p-4 flex items-center gap-3">
              <div className="bg-[#3B5BFE] w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#8B8FA3]">Available Balance</p>
                <p className="text-xl font-bold text-white">{formatUsd(profile?.balance_usdc || 0)}</p>
              </div>
              <span className="bg-[#1E2235] rounded-full px-2 py-1 text-xs text-[#8B8FA3]">USDC.e</span>
            </div>

            {/* Recipient Address */}
            <p className="text-sm text-[#8B8FA3] mt-4 mb-2">Recipient Address</p>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A5F7A]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12V7H5a2 2 0 010-4h14v4" />
                  <path d="M3 5v14a2 2 0 002 2h16v-5" />
                  <path d="M18 12a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
              </div>
              <input
                type="text"
                value={withdrawAddr}
                onChange={(e) => setWithdrawAddr(e.target.value)}
                placeholder="0x..."
                className="w-full bg-[#1E2235] rounded-xl pl-11 pr-4 py-3 text-white placeholder-[#5A5F7A] outline-none border border-transparent focus:border-[#3B5BFE]/50 text-sm"
              />
            </div>

            {/* Warning */}
            <div className="bg-[#FFB800]/10 border border-[#FFB800]/20 rounded-xl p-3 mt-3 flex gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p className="text-xs text-[#FFB800]/90">
                If you send to a CEX deposit address (Binance, Kraken, etc.), verify it supports <strong className="text-[#FFB800]">USDC.e on Polygon</strong> (not USDC on another network).
              </p>
            </div>

            {/* Amount */}
            <p className="text-sm text-[#8B8FA3] mt-4 mb-2">Amount</p>
            <div className="relative">
              <input
                type="text"
                value={withdrawAmt}
                onChange={(e) => setWithdrawAmt(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#1E2235] rounded-xl px-4 py-3 text-white placeholder-[#5A5F7A] outline-none border border-transparent focus:border-[#3B5BFE]/50 text-sm pr-16"
              />
              <button
                onClick={() => setWithdrawAmt(String(profile?.balance_usdc || 0))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3B5BFE] text-sm font-medium hover:text-[#5B7BFF] transition-colors"
              >
                MAX
              </button>
            </div>

            {/* Withdraw Button */}
            <button className="w-full bg-[#3B5BFE] hover:bg-[#2D4AE0] text-white rounded-full py-3.5 font-medium mt-4 transition-colors">
              Withdraw
            </button>

            {/* Info text */}
            <p className="text-xs text-[#5A5F7A] mt-3 text-center">
              Withdrawals are sent on the <strong className="text-[#8B8FA3]">Polygon network</strong>. Gas fees are covered by Polycool.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
