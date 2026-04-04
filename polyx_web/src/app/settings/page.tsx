"use client";

import { useEffect, useState } from "react";
import { userApi, paymentsApi } from "@/lib/api";
import { truncateAddress, formatUsd } from "@/lib/utils";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    try {
      const data = await userApi.me();
      setProfile(data);
      setSettings(data.settings || {});
      setSubscription(data.subscription);
    } catch {}
    setLoading(false);
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await userApi.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await loadProfile();
    } catch {}
    setSaving(false);
  }

  async function startCheckout() {
    try {
      const { checkout_url } = await paymentsApi.checkout();
      window.open(checkout_url, "_blank");
    } catch {}
  }

  function updateSetting(key: string, value: any) {
    setSettings((s: any) => ({ ...s, [key]: value }));
  }

  function switchToLive() {
    updateSetting("demo_mode", 0);
    setShowDeposit(true);
  }

  async function copyAddress() {
    await navigator.clipboard.writeText(profile?.wallet_address || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#121212] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[700px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-4 sm:mb-6 text-[#121212]">Settings</h1>

      {/* Trading Mode Toggle */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 mb-4 shadow-sm">
        <h3 className="font-bold text-sm sm:text-base text-[#121212] mb-4">Trading Mode</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { updateSetting("demo_mode", 1); setShowDeposit(false); }}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${
              settings.demo_mode
                ? "border-[#121212] bg-[#F7F7F7]"
                : "border-transparent bg-[#F7F7F7] hover:border-[#E0E0E0]"
            }`}
          >
            <div className="text-lg mb-1">&#x1F3AE;</div>
            <p className="text-sm font-bold text-[#121212]">Demo</p>
            <p className="text-xs text-[#9B9B9B] mt-1">Virtual funds, zero risk</p>
            {settings.demo_mode && (
              <p className="text-xs font-bold text-[#009D55] mt-2">Active</p>
            )}
          </button>
          <button
            onClick={switchToLive}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${
              !settings.demo_mode
                ? "border-[#121212] bg-[#F7F7F7]"
                : "border-transparent bg-[#F7F7F7] hover:border-[#E0E0E0]"
            }`}
          >
            <div className="text-lg mb-1">&#x1F680;</div>
            <p className="text-sm font-bold text-[#121212]">Live</p>
            <p className="text-xs text-[#9B9B9B] mt-1">Real USDC, real profits</p>
            {!settings.demo_mode && (
              <p className="text-xs font-bold text-[#009D55] mt-2">Active</p>
            )}
          </button>
        </div>

        {settings.demo_mode ? (
          <div className="mt-4 pt-4 border-t border-black/5">
            <label className="text-xs text-[#9B9B9B] mb-1.5 block font-medium">Demo Balance</label>
            <input
              type="number"
              value={settings.demo_balance || 1000}
              onChange={(e) => updateSetting("demo_balance", parseFloat(e.target.value) || 0)}
              className="bg-[#F7F7F7] border border-black/5 rounded-full px-5 py-2.5 text-[#121212] outline-none focus:border-[#121212] w-full max-w-[200px] text-sm"
            />
          </div>
        ) : null}
      </div>

      {/* Deposit Instructions — shown when switching to Live */}
      {(showDeposit || !settings.demo_mode) && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 mb-4 shadow-sm border-2 border-[#009D55]/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#009D55]/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#009D55" strokeWidth="2.5"><path d="M12 4v16m8-8H4"/></svg>
            </div>
            <h3 className="font-bold text-sm sm:text-base text-[#121212]">Fund Your Account</h3>
          </div>
          <p className="text-sm text-[#656565] mb-5">
            To start live trading, deposit USDC to your trading wallet on the <strong className="text-[#121212]">Polygon</strong> network.
          </p>

          {/* Option 1: Direct deposit */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-[#121212] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">1</span>
              <p className="text-sm font-bold text-[#121212]">Send USDC (Polygon)</p>
            </div>
            <p className="text-xs text-[#9B9B9B] mb-3">Send USDC on the Polygon network to your wallet address below. Funds appear automatically.</p>
            <div className="bg-white border border-black/5 rounded-xl px-4 py-3 font-mono text-[11px] sm:text-xs break-all text-[#121212] mb-2">
              {profile?.wallet_address}
            </div>
            <button
              onClick={copyAddress}
              className="rounded-full bg-[#121212] text-white text-xs font-medium px-4 py-2 transition-all hover:bg-[#333]"
            >
              {copied ? "Copied!" : "Copy Address"}
            </button>
            <p className="text-[10px] text-[#9B9B9B] mt-2">
              Current balance: <strong className="text-[#121212]">{formatUsd(profile?.balance_usdc || 0)}</strong>
            </p>
          </div>

          {/* Option 2: Buy with MoonPay */}
          <div className="bg-[#F7F7F7] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-[#121212] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">2</span>
              <p className="text-sm font-bold text-[#121212]">Buy USDC with Card</p>
            </div>
            <p className="text-xs text-[#9B9B9B] mb-3">
              Don&apos;t have USDC? Buy directly with credit/debit card via MoonPay. It will be sent to your wallet automatically.
            </p>
            <a
              href={`https://www.moonpay.com/buy/usdc_polygon?walletAddress=${profile?.wallet_address || ""}&currencyCode=usdc_polygon`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#7B3FE4] text-white text-xs font-medium px-5 py-2.5 hover:bg-[#6930C3] transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4"/></svg>
              Buy USDC with MoonPay
            </a>
          </div>

          <div className="mt-4 p-3 bg-[#FFF8E1] rounded-xl">
            <p className="text-xs text-[#856404]">
              <strong>Important:</strong> Only send USDC on the <strong>Polygon</strong> network. Sending tokens on other networks will result in loss of funds.
            </p>
          </div>
        </div>
      )}

      {/* Subscription */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 mb-4 shadow-sm">
        <h3 className="font-bold text-sm sm:text-base mb-3 text-[#121212]">Subscription</h3>
        {subscription?.status === "active" || subscription?.status === "trialing" ? (
          <div className="flex items-center gap-3 p-3 bg-[#F7F7F7] rounded-xl">
            <span className="bg-[#009D55]/10 text-[#009D55] text-xs font-bold px-2.5 py-1 rounded-full">
              {subscription.status === "trialing" ? "Trial" : "Active"}
            </span>
            <div>
              <p className="text-sm font-medium text-[#121212]">Live Trading Enabled</p>
              <p className="text-xs text-[#9B9B9B]">$39/month + 25% perf fee</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-[#9B9B9B] font-medium mb-4">
              Subscribe to enable live trading with real funds. $39/month + 25% performance fee on profits only.
            </p>
            <button
              onClick={startCheckout}
              className="bg-[#009D55] hover:bg-[#008548] text-white font-medium px-6 py-2.5 rounded-full transition-all text-sm"
            >
              Subscribe &mdash; $39/month
            </button>
          </div>
        )}
      </div>

      {/* Risk Settings */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 mb-4 shadow-sm">
        <h3 className="font-bold text-sm sm:text-base mb-4 text-[#121212]">Risk Settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: "trade_mode", label: "Trade Mode", type: "select", options: ["cautious", "standard", "expert"] },
            { key: "quickbuy_amount", label: "Default Bet Size ($)", type: "number" },
            { key: "max_risk_pct", label: "Max Risk per Position (%)", type: "number" },
            { key: "min_bet", label: "Minimum Bet ($)", type: "number" },
            { key: "max_open_positions", label: "Max Open Positions", type: "number" },
            { key: "max_per_event", label: "Max per Event", type: "number" },
            { key: "max_exposure_pct", label: "Max Exposure (%)", type: "number" },
            { key: "daily_loss_limit_pct", label: "Daily Loss Limit (%)", type: "number" },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-xs text-[#9B9B9B] mb-1.5 block font-medium">{field.label}</label>
              {field.type === "select" ? (
                <select
                  value={settings[field.key] || "standard"}
                  onChange={(e) => updateSetting(field.key, e.target.value)}
                  className="w-full bg-[#F7F7F7] border border-black/5 rounded-full px-5 py-2.5 text-[#121212] outline-none focus:border-[#121212] text-sm appearance-none"
                >
                  {field.options!.map((o) => (
                    <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={settings[field.key] ?? ""}
                  onChange={(e) => updateSetting(field.key, parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#F7F7F7] border border-black/5 rounded-full px-5 py-2.5 text-[#121212] outline-none focus:border-[#121212] text-sm"
                />
              )}
            </div>
          ))}
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="mt-6 bg-[#121212] hover:bg-[#333] text-white font-medium px-6 py-2.5 rounded-full transition-all disabled:opacity-50 text-sm"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm">
        <h3 className="font-bold text-sm sm:text-base mb-3 text-[#121212]">Account</h3>
        <div className="space-y-0 text-sm">
          {[
            { label: "Auth", value: (profile?.auth_provider || "web").charAt(0).toUpperCase() + (profile?.auth_provider || "web").slice(1) },
            { label: "Wallet", value: truncateAddress(profile?.wallet_address || ""), mono: true },
            { label: "Since", value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "--" },
          ].map((row, i) => (
            <div key={row.label} className={`flex justify-between py-3 ${i < 2 ? "border-b border-black/5" : ""}`}>
              <span className="text-[#9B9B9B] font-medium">{row.label}</span>
              <span className={`font-medium text-[#121212] ${row.mono ? "font-mono text-xs" : ""}`}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
