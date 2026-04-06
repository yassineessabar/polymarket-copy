"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { userApi, clearToken } from "@/lib/api";
import { truncateAddress } from "@/lib/utils";
import { Spinner } from "@/components/ui";
import { PageHeader } from "@/components";

const TRADE_MODES = [
  { value: "cautious", label: "Cautious", icon: "🐢", desc: "Smaller bets, skip low confidence" },
  { value: "standard", label: "Standard", icon: "⚖️", desc: "Balanced risk/reward" },
  { value: "expert", label: "Expert", icon: "🔥", desc: "Larger bets, max exposure" },
];

const COPY_FACTORS = [0.5, 1, 2, 3, 5];
const MAX_RISK_OPTIONS = [5, 10, 20, 40];
const MIN_BET_OPTIONS = [0.1, 1, 5, 10];
const MAX_POS_OPTIONS = [10, 20, 50, 100];
const MAX_EXP_OPTIONS = [25, 50, 75, 100];
const MAX_EVT_OPTIONS = [1, 2, 5, 10];
const DAILY_LOSS_OPTIONS = [10, 15, 25, 50];

function OptionRow({ label, desc, options, value, onChange, format }: {
  label: string;
  desc?: string;
  options: number[];
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const fmt = format || ((v: number) => String(v));
  return (
    <div className="py-4 border-b border-black/[0.04] last:border-0">
      <div className="mb-2">
        <p className="text-sm font-semibold text-[#0F0F0F]">{label}</p>
        {desc && <p className="text-xs text-[#6B7280] mt-0.5">{desc}</p>}
      </div>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              value === opt
                ? "bg-[#0F0F0F] text-white"
                : "bg-[#F5F5F5] text-[#6B7280] hover:bg-[#E5E5E5]"
            }`}
          >
            {fmt(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  useEffect(() => {
    userApi.me()
      .then((data) => {
        setProfile(data);
        setSettings(data.settings || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function updateSetting(key: string, value: any) {
    setSaving(true);
    try {
      const res = await userApi.updateSettings({ [key]: value });
      setSettings(res.settings);
    } catch (e) {
      console.error("Failed to update setting:", e);
    }
    setSaving(false);
  }

  function copyWallet() {
    if (!profile?.wallet_address) return;
    navigator.clipboard.writeText(profile.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyPrivateKey() {
    const key = profile?.private_key || profile?.auth_wallet || "";
    if (key) {
      navigator.clipboard.writeText(key);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  }

  function logout() {
    clearToken();
    router.push("/auth");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  const s = settings || {};
  const walletDisplay = profile?.wallet_address
    ? truncateAddress(profile.wallet_address)
    : "Not connected";

  return (
    <div className="max-w-[700px] mx-auto">
      <PageHeader title="Settings" />

      {/* Trade Mode */}
      <div className="bg-white rounded-2xl border border-black/[0.04] p-5 mb-4">
        <h3 className="text-sm font-bold text-[#0F0F0F] mb-3">Trade Mode</h3>
        <div className="grid grid-cols-3 gap-2">
          {TRADE_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => updateSetting("trade_mode", mode.value)}
              className={`p-3 rounded-xl text-center transition-all ${
                s.trade_mode === mode.value
                  ? "bg-[#0F0F0F] text-white"
                  : "bg-[#F5F5F5] text-[#6B7280] hover:bg-[#E5E5E5]"
              }`}
            >
              <div className="text-lg mb-1">{mode.icon}</div>
              <div className="text-xs font-semibold">{mode.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Risk & Sizing */}
      <div className="bg-white rounded-2xl border border-black/[0.04] p-5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-[#0F0F0F]">Risk & Position Sizing</h3>
          {saving && <span className="text-xs text-[#6B7280]">Saving...</span>}
        </div>

        <OptionRow
          label="Copy Factor"
          desc="Multiplier on proportional bet size"
          options={COPY_FACTORS}
          value={s.copy_factor ?? 1}
          onChange={(v) => updateSetting("copy_factor", v)}
          format={(v) => `${v}x`}
        />

        <OptionRow
          label="Max Risk Per Trade"
          desc="Max % of portfolio on a single trade"
          options={MAX_RISK_OPTIONS}
          value={s.max_risk_pct ?? 10}
          onChange={(v) => updateSetting("max_risk_pct", v)}
          format={(v) => `${v}%`}
        />

        <OptionRow
          label="Min Bet Size"
          desc="Trades below this are skipped"
          options={MIN_BET_OPTIONS}
          value={s.min_bet ?? 1}
          onChange={(v) => updateSetting("min_bet", v)}
          format={(v) => `$${v}`}
        />

        <OptionRow
          label="Max Positions"
          desc="Hard cap on simultaneous positions"
          options={MAX_POS_OPTIONS}
          value={s.max_open_positions ?? 20}
          onChange={(v) => updateSetting("max_open_positions", v)}
        />

        <OptionRow
          label="Max Exposure"
          desc="Total $ at risk as % of portfolio"
          options={MAX_EXP_OPTIONS}
          value={s.max_exposure_pct ?? 50}
          onChange={(v) => updateSetting("max_exposure_pct", v)}
          format={(v) => `${v}%`}
        />

        <OptionRow
          label="Max Per Event"
          desc="Max positions on the same event"
          options={MAX_EVT_OPTIONS}
          value={s.max_per_event ?? 2}
          onChange={(v) => updateSetting("max_per_event", v)}
        />

        <OptionRow
          label="Daily Loss Limit"
          desc="Halts trading if daily P&L drops below this"
          options={DAILY_LOSS_OPTIONS}
          value={s.daily_loss_limit_pct ?? 15}
          onChange={(v) => updateSetting("daily_loss_limit_pct", v)}
          format={(v) => `${v}%`}
        />
      </div>

      {/* Wallet */}
      <div className="bg-white rounded-2xl border border-black/[0.04] p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0F0F0F]">Wallet</p>
            <p className="text-xs text-[#6B7280] font-mono mt-0.5">{walletDisplay}</p>
          </div>
          <button
            onClick={copyWallet}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F5F5F5] text-[#6B7280] hover:bg-[#E5E5E5] transition-all"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Export Private Key */}
      <div className="bg-white rounded-2xl border border-black/[0.04] overflow-hidden mb-4">
        <button
          onClick={() => setShowKey(!showKey)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F5F5F5] transition-colors text-left"
        >
          <span className="text-sm font-semibold text-[#0F0F0F]">Export Private Key</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showKey ? "rotate-90" : ""}`}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        {showKey && (
          <div className="px-5 pb-5 border-t border-black/5">
            <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-xl p-3 mt-4 mb-3">
              <p className="text-xs text-[#856404] font-medium">
                <strong>Warning:</strong> Never share your private key. Anyone with this key has full access to your funds.
              </p>
            </div>
            <div className="bg-[#F5F5F5] rounded-xl px-4 py-3 font-mono text-xs break-all text-[#0F0F0F] mb-3">
              {profile?.private_key || profile?.auth_wallet || "Your private key is securely stored."}
            </div>
            <button
              onClick={copyPrivateKey}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0F0F0F] text-white hover:bg-[#333] transition-all"
            >
              {keyCopied ? "Copied!" : "Copy Key"}
            </button>
          </div>
        )}
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl border border-black/[0.04] p-5 mb-4">
        <h3 className="font-bold text-sm text-[#0F0F0F] mb-3">Account</h3>
        <div className="space-y-0 text-sm">
          {profile?.auth_wallet && profile.auth_wallet.includes("@") && (
            <div className="flex justify-between py-3 border-b border-black/5">
              <span className="text-[#6B7280] font-medium">Email</span>
              <span className="font-medium text-[#0F0F0F] text-xs">{profile.auth_wallet}</span>
            </div>
          )}
          <div className="flex justify-between py-3 border-b border-black/5">
            <span className="text-[#6B7280] font-medium">Mode</span>
            <span className="font-medium text-[#0F0F0F]">
              {s.demo_mode ? "Demo" : "Live"}
            </span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-[#6B7280] font-medium">Since</span>
            <span className="font-medium text-[#0F0F0F]">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "--"}
            </span>
          </div>
        </div>
      </div>

      {/* Log out */}
      <button
        onClick={logout}
        className="w-full py-3 rounded-xl text-sm font-semibold text-[#EF4444] bg-[#FEF2F2] hover:bg-[#FEE2E2] transition-all mb-8"
      >
        Log out
      </button>
    </div>
  );
}
