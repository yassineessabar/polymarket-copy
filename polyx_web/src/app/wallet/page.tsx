"use client";

import { useEffect, useState } from "react";
import { userApi, paymentsApi } from "@/lib/api";
import { formatUsd } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

const CHAINS = [
  {
    id: "solana",
    name: "Solana",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#000" />
        <path d="M7.5 15.2l1.2-1.2h7.8l-1.2 1.2H7.5zm0-3.6h9l-1.2 1.2H6.3l1.2-1.2zm0-2.4l1.2-1.2h7.8l-1.2 1.2H7.5z" fill="url(#sol)" />
        <defs><linearGradient id="sol" x1="7" y1="8" x2="17" y2="16" gradientUnits="userSpaceOnUse"><stop stopColor="#00FFA3" /><stop offset="1" stopColor="#DC1FFF" /></linearGradient></defs>
      </svg>
    ),
    minDeposit: "$1",
    description: "Fast and low fees",
  },
  {
    id: "ethereum",
    name: "Ethereum",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#627EEA" />
        <path d="M12 4l5 8.5-5 3-5-3L12 4z" fill="#fff" fillOpacity="0.6" />
        <path d="M12 4v7.5l5 1-5-8.5z" fill="#fff" />
        <path d="M12 16.5l5-3-5 6.5v-3.5z" fill="#fff" fillOpacity="0.6" />
        <path d="M12 20v-3.5l-5-3 5 6.5z" fill="#fff" />
      </svg>
    ),
    minDeposit: "$10",
    description: "Most widely supported",
  },
  {
    id: "polygon",
    name: "Polygon",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#8247E5" />
        <path d="M15.5 9.5l-2-1.2a1 1 0 00-1 0l-2 1.2a1 1 0 00-.5.9v2.3a1 1 0 00.5.9l2 1.2a1 1 0 001 0l2-1.2a1 1 0 00.5-.9V10.4a1 1 0 00-.5-.9z" fill="#fff" />
      </svg>
    ),
    minDeposit: "$1",
    description: "Native network - recommended",
  },
  {
    id: "base",
    name: "Base",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#0052FF" />
        <path d="M12 18a6 6 0 100-12 6 6 0 000 12zm0-2a4 4 0 110-8v8z" fill="#fff" />
      </svg>
    ),
    minDeposit: "$1",
    description: "Low fees, built on Ethereum",
  },
  {
    id: "bnb",
    name: "BNB Chain",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#F3BA2F" />
        <path d="M12 6l2 2-2 2-2-2 2-2zm-4 4l2 2-2 2-2-2 2-2zm8 0l2 2-2 2-2-2 2-2zm-4 4l2 2-2 2-2-2 2-2z" fill="#fff" />
      </svg>
    ),
    minDeposit: "$1",
    description: "Binance ecosystem",
  },
];

export default function WalletPage() {
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositTab, setDepositTab] = useState<"card" | "crypto">("card");
  const [selectedChain, setSelectedChain] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await userApi.me();
      setProfile(data);
      setSettings(data.settings || {});
    } catch {}
    setLoading(false);
  }

  function updateSetting(key: string, value: any) {
    setSettings((s: any) => ({ ...s, [key]: value }));
  }

  async function saveTradingMode(newSettings: Record<string, any>) {
    setSaving(true);
    try {
      await userApi.updateSettings(newSettings);
      await loadProfile();
    } catch {}
    setSaving(false);
  }

  function switchToDemo() {
    const updated = { ...settings, demo_mode: 1 };
    setSettings(updated);
    saveTradingMode({ demo_mode: 1 });
  }

  function switchToLive() {
    const updated = { ...settings, demo_mode: 0 };
    setSettings(updated);
    saveTradingMode({ demo_mode: 0 });
  }

  async function resetDemo() {
    setResetting(true);
    try {
      await userApi.updateSettings({ demo_balance: 1000, reset_demo: true });
      await loadProfile();
      setShowResetConfirm(false);
    } catch {}
    setResetting(false);
  }

  function copyAddress() {
    if (!profile?.wallet_address) return;
    navigator.clipboard.writeText(profile.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#121212] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isDemo = !!settings.demo_mode;
  const balance = profile?.balance_usdc || 0;
  const demoBalance = settings.demo_balance || 1000;
  const walletAddress = profile?.wallet_address || "";

  return (
    <div className="max-w-[600px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-4 sm:mb-6 text-[#121212]">
        Wallet
      </h1>

      {/* Trading Mode Toggle — always visible */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 mb-4 shadow-sm">
        <p className="text-xs text-[#9B9B9B] uppercase tracking-wider font-medium mb-3">Trading Mode</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={switchToDemo}
            disabled={saving}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              isDemo ? "border-[#121212] bg-[#F7F7F7]" : "border-transparent bg-[#F7F7F7] hover:border-[#E0E0E0]"
            }`}
          >
            <p className="text-sm font-bold text-[#121212]">Demo</p>
            <p className="text-xs text-[#9B9B9B] mt-0.5">Virtual funds, zero risk</p>
            {isDemo && <p className="text-xs font-bold text-[#009D55] mt-2">Active</p>}
          </button>
          <button
            onClick={switchToLive}
            disabled={saving}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              !isDemo ? "border-[#121212] bg-[#F7F7F7]" : "border-transparent bg-[#F7F7F7] hover:border-[#E0E0E0]"
            }`}
          >
            <p className="text-sm font-bold text-[#121212]">Live</p>
            <p className="text-xs text-[#9B9B9B] mt-0.5">Real USDC, real profits</p>
            {!isDemo && <p className="text-xs font-bold text-[#009D55] mt-2">Active</p>}
          </button>
        </div>
      </div>

      {/* ===== DEMO MODE ===== */}
      {isDemo && (
        <>
          {/* Demo Balance Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 mb-4 text-center shadow-sm">
            <div className="text-xs text-[#9B9B9B] uppercase tracking-wider mb-2 font-medium">
              Demo Balance
            </div>
            <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-[#121212]">
              {formatUsd(demoBalance)}
            </div>

            {/* Editable demo balance */}
            <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-center gap-3">
              <input
                type="number"
                value={Math.round(demoBalance * 100) / 100}
                step="0.01"
                onChange={(e) =>
                  updateSetting("demo_balance", Math.round((parseFloat(e.target.value) || 0) * 100) / 100)
                }
                className="bg-[#F7F7F7] border border-black/5 rounded-full px-5 py-2.5 text-[#121212] outline-none focus:border-[#121212] w-full max-w-[180px] text-sm text-center font-mono"
              />
              <button
                onClick={() => saveTradingMode({ demo_balance: settings.demo_balance || 1000 })}
                className="text-xs font-medium text-[#121212] bg-[#F7F7F7] border border-black/5 rounded-full px-4 py-2.5 hover:bg-[#EBEBEB] transition-colors"
              >
                Update
              </button>
            </div>
          </div>

          {/* Demo info */}
          <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F0F7FF] flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#121212] mb-1">You&apos;re in demo mode</p>
                <p className="text-xs text-[#9B9B9B] font-medium leading-relaxed">
                  Practice trading with virtual funds. No real money at risk. Use the toggle above to switch to live trading.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="mt-4 w-full border border-[#DC2626]/30 text-[#DC2626] font-medium py-2.5 rounded-full transition-all text-sm hover:bg-[#DC2626]/5"
            >
              Reset Demo Account
            </button>
          </div>
        </>
      )}

      {/* ===== LIVE MODE ===== */}
      {!isDemo && (
        <>
          {/* Live Balance Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 mb-4 text-center shadow-sm">
            <div className="text-xs text-[#9B9B9B] uppercase tracking-wider mb-2 font-medium">
              USDC Balance
            </div>
            <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-[#121212]">
              {formatUsd(balance)}
            </div>
            <div className="text-xs text-[#9B9B9B] mt-1 font-medium">on Polygon Network</div>
          </div>

          {/* Deposit button */}
          <button
            onClick={() => { setShowDeposit(true); }}
            className="w-full bg-[#009D55] hover:bg-[#008548] text-white rounded-2xl p-5 text-left transition-all shadow-sm mb-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold">Deposit Funds</p>
              <p className="text-xs text-white/70 mt-0.5">Add USDC to start trading</p>
            </div>
          </button>
        </>
      )}

      {/* ===== DEPOSIT MODAL ===== */}
      {showDeposit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowDeposit(false); setSelectedChain(null); }} />
          <div className="relative bg-white w-full max-w-[500px] rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto p-5 sm:p-6 shadow-xl">
            {/* Close button */}
            <button
              onClick={() => { setShowDeposit(false); setSelectedChain(null); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F7F7F7] hover:bg-[#EBEBEB] flex items-center justify-center transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#656565" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-lg font-bold text-[#121212] mb-5">Fund Your Wallet</h2>

            {/* Card / Crypto tabs */}
            <div className="flex bg-[#F7F7F7] rounded-full p-1 mb-5">
              {(["card", "crypto"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setDepositTab(tab); setSelectedChain(null); }}
                  className={`flex-1 text-sm font-medium py-2 rounded-full transition-all capitalize ${
                    depositTab === tab
                      ? "bg-[#121212] text-white shadow-sm"
                      : "text-[#656565] hover:text-[#121212]"
                  }`}
                >
                  {tab === "card" ? "Card" : "Crypto"}
                </button>
              ))}
            </div>

            {/* Card Tab — Embedded MoonPay Widget */}
            {depositTab === "card" && (
              <div>
                <div className="rounded-2xl overflow-hidden border border-black/5 bg-white" style={{ height: "560px" }}>
                  <iframe
                    src={`https://buy.moonpay.com?apiKey=pk_test_Yh1ao0Ys5snWHLqkeLQfbfFaYHnVjRP&currencyCode=usdc_polygon&walletAddress=${walletAddress}&colorCode=%237B3FE4&language=en&baseCurrencyCode=usd&theme=light`}
                    allow="accelerometer; autoplay; camera; gyroscope; payment; microphone"
                    width="100%"
                    height="100%"
                    style={{ border: "none" }}
                    title="Buy USDC with MoonPay"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
                  />
                </div>
                <p className="text-[10px] text-[#9B9B9B] text-center mt-3">
                  Powered by MoonPay. USDC will be sent directly to your wallet on Polygon.
                </p>
              </div>
            )}

            {/* Crypto Tab - Chain List */}
            {depositTab === "crypto" && !selectedChain && (
              <div>
                <p className="text-sm text-[#656565] mb-4 font-medium">
                  Select the blockchain you&apos;ll send from:
                </p>
                <div className="space-y-2">
                  {CHAINS.map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => setSelectedChain(chain.id)}
                      className="w-full flex items-center gap-4 p-4 bg-[#F7F7F7] hover:bg-[#EBEBEB] rounded-2xl transition-all text-left"
                    >
                      <div className="flex-shrink-0">{chain.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-[#121212]">{chain.name}</p>
                          <p className="text-xs text-[#9B9B9B]">Min: {chain.minDeposit}</p>
                        </div>
                        <p className="text-xs text-[#9B9B9B] mt-0.5">{chain.description}</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9B9B9B" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Crypto Tab - Chain Selected - QR + Address */}
            {depositTab === "crypto" && selectedChain && (
              <div>
                <button
                  onClick={() => setSelectedChain(null)}
                  className="flex items-center gap-1 text-sm text-[#656565] hover:text-[#121212] mb-4 transition-colors font-medium"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Back to networks
                </button>

                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-2 bg-[#F7F7F7] rounded-full px-4 py-2 mb-4">
                    {CHAINS.find((c) => c.id === selectedChain)?.icon}
                    <span className="text-sm font-bold text-[#121212]">
                      {CHAINS.find((c) => c.id === selectedChain)?.name}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="bg-[#F7F7F7] p-4 rounded-2xl">
                    <QRCodeSVG value={walletAddress} size={160} />
                  </div>
                  <div className="w-full">
                    <label className="text-xs text-[#9B9B9B] mb-1.5 block font-medium">
                      Your deposit address
                    </label>
                    <div className="bg-[#F7F7F7] border border-black/5 rounded-2xl px-4 py-3 font-mono text-[11px] sm:text-xs break-all text-[#121212] mb-3">
                      {walletAddress}
                    </div>
                    <button
                      onClick={copyAddress}
                      className="w-full bg-[#121212] hover:bg-[#333] text-white font-medium py-3 rounded-full transition-all text-sm flex items-center justify-center gap-2"
                    >
                      {copied ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                          Copy Address
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {selectedChain !== "polygon" && (
                  <div className="mt-4 p-3 bg-[#FFF8E1] rounded-xl">
                    <p className="text-xs text-[#856404]">
                      <strong>Note:</strong> Funds sent on {CHAINS.find((c) => c.id === selectedChain)?.name} will be automatically bridged to Polygon. This may take a few minutes.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== WITHDRAW MODAL ===== */}
      {/* ===== YOUR WALLET (live mode only) ===== */}
      {!isDemo && <div className="bg-white rounded-2xl p-5 sm:p-8 mb-4 shadow-sm">
        <h3 className="font-bold text-sm sm:text-base mb-4 text-[#121212]">Your Wallet</h3>

        <div className="flex flex-col items-center gap-5">
          <div className="bg-[#F7F7F7] p-4 rounded-2xl">
            <QRCodeSVG value={walletAddress} size={160} />
          </div>

          <div className="w-full">
            <div className="bg-[#F7F7F7] rounded-2xl px-4 py-3 font-mono text-[11px] sm:text-sm break-all text-center mb-4 text-[#121212]">
              {walletAddress}
            </div>

            <button
              onClick={copyAddress}
              className="w-full bg-[#121212] hover:bg-[#333] text-white font-medium py-3 rounded-full transition-all text-sm flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Copy Address
                </>
              )}
            </button>
          </div>
        </div>
      </div>}

      {/* Reset Demo Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[380px] shadow-lg">
            <h3 className="font-bold text-base text-[#121212] mb-2">Reset Demo Account?</h3>
            <p className="text-sm text-[#9B9B9B] mb-6">
              This will close all open positions, clear all trades and transaction history, and reset your demo balance to $1,000.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 border border-[#121212] text-[#121212] font-medium py-2.5 rounded-full text-sm hover:bg-[#F7F7F7]"
              >
                Cancel
              </button>
              <button
                onClick={resetDemo}
                disabled={resetting}
                className="flex-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-medium py-2.5 rounded-full text-sm disabled:opacity-50"
              >
                {resetting ? "Resetting..." : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Mode toggle link (always visible) ===== */}
      <div className="text-center pb-6">
        <button
          onClick={isDemo ? switchToLive : switchToDemo}
          disabled={saving}
          className="text-xs text-[#9B9B9B] hover:text-[#121212] font-medium transition-colors disabled:opacity-50"
        >
          {isDemo ? "Switch to Live Trading" : "Switch to Demo Mode"}
        </button>
      </div>
    </div>
  );
}
