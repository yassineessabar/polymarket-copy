"use client";

import { useEffect, useState } from "react";
import { userApi, paymentsApi } from "@/lib/api";
import { truncateAddress, formatUsd } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[800px]">
      <h1 className="text-xl sm:text-2xl font-semibold font-display mb-4 sm:mb-6">Settings</h1>

      {/* Deposit / Wallet */}
      <div className="bg-bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Deposit USDC</h3>
        <p className="text-xs sm:text-sm text-text-secondary mb-3 sm:mb-4">
          Send USDC on <strong className="text-white">Polygon</strong> to your trading wallet. Funds appear automatically.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
          <div className="bg-white p-2.5 sm:p-3 rounded-xl flex-shrink-0">
            <QRCodeSVG value={profile?.wallet_address || ""} size={120} />
          </div>
          <div className="flex-1 w-full">
            <div className="text-[10px] sm:text-xs text-text-muted mb-1">Your Trading Wallet</div>
            <div className="bg-bg-secondary border border-border rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 font-mono text-[11px] sm:text-sm break-all mb-3">
              {profile?.wallet_address}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(profile?.wallet_address || "")}
              className="bg-bg-secondary border border-border hover:border-border-hover text-white text-sm px-4 py-2 rounded-xl transition-all"
            >
              Copy Address
            </button>
            <div className="mt-4">
              <div className="text-xs text-text-muted mb-1">Current Balance</div>
              <div className="text-xl font-semibold font-mono">{formatUsd(profile?.balance_usdc || 0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Mode */}
      <div className="bg-bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="font-semibold text-sm sm:text-base">Demo Mode</h3>
          <button
            onClick={() => updateSetting("demo_mode", settings.demo_mode ? 0 : 1)}
            className={`relative w-12 h-6 rounded-full transition-colors ${settings.demo_mode ? "bg-accent" : "bg-bg-secondary border border-border"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.demo_mode ? "left-[26px]" : "left-0.5"}`} />
          </button>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Practice with virtual funds. No real money at risk.
        </p>
        {settings.demo_mode ? (
          <div>
            <label className="text-xs text-text-muted mb-1 block">Demo Balance</label>
            <input
              type="number"
              value={settings.demo_balance || 1000}
              onChange={(e) => updateSetting("demo_balance", parseFloat(e.target.value) || 0)}
              className="bg-bg-secondary border border-border rounded-xl px-4 py-2.5 text-white outline-none focus:border-accent w-full max-w-[200px] text-sm"
            />
          </div>
        ) : null}
      </div>

      {/* Risk Settings */}
      <div className="bg-bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Risk Settings</h3>
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
              <label className="text-xs text-text-muted mb-1 block">{field.label}</label>
              {field.type === "select" ? (
                <select
                  value={settings[field.key] || "standard"}
                  onChange={(e) => updateSetting(field.key, e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2.5 text-white outline-none focus:border-accent text-sm appearance-none"
                >
                  {field.options!.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                </select>
              ) : (
                <input
                  type="number"
                  value={settings[field.key] ?? ""}
                  onChange={(e) => updateSetting(field.key, parseFloat(e.target.value) || 0)}
                  className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2.5 text-white outline-none focus:border-accent text-sm"
                />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="mt-6 bg-accent hover:bg-accent-hover text-white font-medium px-6 py-2.5 rounded-xl transition-all disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>
      </div>

      {/* Subscription */}
      <div className="bg-bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Subscription</h3>
        {subscription?.status === "active" || subscription?.status === "trialing" ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-green/10 text-green text-xs font-medium px-2.5 py-1 rounded-full border border-green/20">
                {subscription.status === "trialing" ? "Trial" : "Active"}
              </span>
              <span className="text-sm text-text-secondary">Live Trading Enabled</span>
            </div>
            <p className="text-sm text-text-secondary">
              $39/month + 25% performance fee on profits
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-text-secondary mb-4">
              Subscribe to enable live trading with real funds. $39/month + 25% performance fee on profits only.
            </p>
            <button
              onClick={startCheckout}
              className="bg-accent hover:bg-accent-hover text-white font-medium px-6 py-2.5 rounded-xl transition-all"
            >
              Subscribe — $39/month
            </button>
          </div>
        )}
      </div>

      {/* Wallet Info */}
      <div className="bg-bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <h3 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Account Info</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Auth Provider</span>
            <span className="capitalize">{profile?.auth_provider || "web"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Trading Wallet</span>
            <span className="font-mono text-xs">{truncateAddress(profile?.wallet_address || "")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Member Since</span>
            <span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
