"use client";

import { useEffect, useState } from "react";
import { userApi, paymentsApi } from "@/lib/api";
import { truncateAddress } from "@/lib/utils";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

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
        <div className="w-8 h-8 border-2 border-[#121212] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[700px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-4 sm:mb-6 text-[#121212]">Settings</h1>

      {/* Demo Mode */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm sm:text-base text-[#121212]">Demo Mode</h3>
          <button
            onClick={() => updateSetting("demo_mode", settings.demo_mode ? 0 : 1)}
            className={`relative w-12 h-6 rounded-full transition-colors ${settings.demo_mode ? "bg-[#009D55]" : "bg-[#E5E5E5]"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.demo_mode ? "left-[26px]" : "left-0.5"}`} />
          </button>
        </div>
        <p className="text-sm text-[#9B9B9B] font-medium mb-4">
          Practice with virtual funds. No real money at risk.
        </p>
        {settings.demo_mode ? (
          <div>
            <label className="text-xs text-[#9B9B9B] mb-1 block font-medium">Demo Balance</label>
            <input
              type="number"
              value={settings.demo_balance || 1000}
              onChange={(e) => updateSetting("demo_balance", parseFloat(e.target.value) || 0)}
              className="bg-[#F7F7F7] border border-black/5 rounded-full px-5 py-2.5 text-[#121212] outline-none focus:border-[#121212] w-full max-w-[200px] text-sm"
            />
          </div>
        ) : null}
      </div>

      {/* Risk Settings */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 mb-4 shadow-sm">
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
          className="mt-6 bg-[#121212] hover:bg-[#333] text-white font-medium px-6 py-2.5 rounded-full transition-all disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>
      </div>

      {/* Subscription */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 mb-4 shadow-sm">
        <h3 className="font-bold text-sm sm:text-base mb-3 text-[#121212]">Subscription</h3>
        {subscription?.status === "active" || subscription?.status === "trialing" ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#009D55]/10 text-[#009D55] text-xs font-bold px-2.5 py-1 rounded-full">
                {subscription.status === "trialing" ? "Trial" : "Active"}
              </span>
              <span className="text-sm text-[#9B9B9B] font-medium">Live Trading Enabled</span>
            </div>
            <p className="text-sm text-[#656565] font-medium">
              $39/month + 25% performance fee on profits
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-[#9B9B9B] font-medium mb-4">
              Subscribe to enable live trading with real funds.
            </p>
            <button
              onClick={startCheckout}
              className="bg-[#009D55] hover:bg-[#008548] text-white font-medium px-6 py-2.5 rounded-full transition-all"
            >
              Subscribe -- $39/month
            </button>
          </div>
        )}
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
        <h3 className="font-bold text-sm sm:text-base mb-3 text-[#121212]">Account Info</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-black/5">
            <span className="text-[#9B9B9B] font-medium">Auth Provider</span>
            <span className="capitalize font-medium text-[#121212]">{profile?.auth_provider || "web"}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-black/5">
            <span className="text-[#9B9B9B] font-medium">Trading Wallet</span>
            <span className="font-mono text-xs font-medium text-[#121212]">{truncateAddress(profile?.wallet_address || "")}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-[#9B9B9B] font-medium">Member Since</span>
            <span className="font-medium text-[#121212]">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "--"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
