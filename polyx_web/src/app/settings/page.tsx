"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { userApi, clearToken } from "@/lib/api";
import { truncateAddress } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    userApi.me().then(setProfile).catch(() => {}).finally(() => setLoading(false));
  }, []);

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
        <div className="w-8 h-8 border-2 border-[#0F0F0F] border-t-transparent rounded-xl animate-spin" />
      </div>
    );
  }

  const walletDisplay = profile?.wallet_address
    ? truncateAddress(profile.wallet_address)
    : "Not connected";

  return (
    <div className="max-w-[700px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-6 text-[#0F0F0F]">Settings</h1>

      {/* Wallet */}
      <div className="bg-white rounded-2xl border border-black/[0.04] p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4M4 6v12c0 1.1.9 2 2 2h14v-4M18 12a2 2 0 000 4h4v-4h-4z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-[#0F0F0F]">Wallet</p>
              <p className="text-xs text-[#6B7280] font-mono">{walletDisplay}</p>
            </div>
          </div>
          <button
            onClick={copyWallet}
            className="text-xs font-medium text-[#0F0F0F] bg-[#F5F5F5] border border-black/5 rounded-xl px-4 py-2 hover:bg-[#EBEBEB] transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Export Private Key — inline expandable */}
      <div className="bg-white rounded-2xl border border-black/[0.04] mb-4 overflow-hidden">
        <button
          onClick={() => setShowKey(!showKey)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#F5F5F5] transition-colors text-left"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          <span className="flex-1 text-sm font-medium text-[#0F0F0F]">Export Private Key</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" className={`transition-transform ${showKey ? "rotate-90" : ""}`}><path d="m9 18 6-6-6-6"/></svg>
        </button>
        {showKey && (
          <div className="px-5 pb-5 border-t border-black/5">
            <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-xl p-3 mt-4 mb-3">
              <p className="text-xs text-[#856404] font-medium">
                <strong>Warning:</strong> Never share your private key. Anyone with this key has full access to your funds.
              </p>
            </div>
            <div className="bg-[#F5F5F5] rounded-xl px-4 py-3 font-mono text-xs break-all text-[#0F0F0F] mb-3">
              {profile?.private_key || profile?.auth_wallet || "Your private key is securely stored. Contact support to export."}
            </div>
            <button
              onClick={copyPrivateKey}
              className="bg-[#0F0F0F] hover:bg-[#333] text-white text-xs font-medium px-5 py-2 rounded-xl transition-colors"
            >
              {keyCopied ? "Copied!" : "Copy Key"}
            </button>
          </div>
        )}
      </div>

      {/* Help & Resources — inline expandable */}
      <div className="bg-white rounded-2xl border border-black/[0.04] mb-4 overflow-hidden">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#F5F5F5] transition-colors text-left"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
          </svg>
          <span className="flex-1 text-sm font-medium text-[#0F0F0F]">Help & Resources</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" className={`transition-transform ${showHelp ? "rotate-90" : ""}`}><path d="m9 18 6-6-6-6"/></svg>
        </button>
        {showHelp && (
          <div className="px-5 pb-5 border-t border-black/5 pt-3">
            <div className="space-y-1">
              <a href="https://t.me/polycoolapp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F5F5F5] transition-colors">
                <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F0F0F" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0F0F0F]">FAQ & Support</p>
                  <p className="text-xs text-[#6B7280]">Get help from our team on Telegram</p>
                </div>
              </a>
              <a href="mailto:support@polycool.app" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F5F5F5] transition-colors">
                <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F0F0F" strokeWidth="1.5"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0F0F0F]">Email Support</p>
                  <p className="text-xs text-[#6B7280]">support@polycool.app</p>
                </div>
              </a>
              <div className="flex items-center gap-3 p-3 rounded-xl">
                <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F0F0F" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0F0F0F]">Security</p>
                  <p className="text-xs text-[#6B7280]">Your funds are secured on Polygon</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl">
                <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F0F0F" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0F0F0F]">Terms of Service</p>
                  <p className="text-xs text-[#6B7280]">Legal terms and conditions</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Join the Community */}
      <a href="https://t.me/polycoolapp" target="_blank" rel="noopener noreferrer" className="bg-white rounded-2xl border border-black/[0.04] flex items-center gap-3 px-5 py-4 mb-4 hover:bg-[#F5F5F5] transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
        <span className="flex-1 text-sm font-medium text-[#0F0F0F]">Join the Community</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
      </a>

      {/* Account Info */}
      <div className="bg-white rounded-2xl border border-black/[0.04] p-5 mb-4">
        <h3 className="font-bold text-sm text-[#0F0F0F] mb-3">Account</h3>
        <div className="space-y-0 text-sm">
          <div className="flex justify-between py-3 border-b border-black/5">
            <span className="text-[#6B7280] font-medium">Auth</span>
            <span className="font-medium text-[#0F0F0F]">
              {(profile?.auth_provider || "web").charAt(0).toUpperCase() + (profile?.auth_provider || "web").slice(1)}
            </span>
          </div>
          <div className="flex justify-between py-3 border-b border-black/5">
            <span className="text-[#6B7280] font-medium">Wallet</span>
            <span className="font-medium text-[#0F0F0F] font-mono text-xs">{walletDisplay}</span>
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
        className="flex items-center gap-3 px-5 py-3 text-[#DC2626] text-sm font-medium hover:underline transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
        Log out
      </button>
    </div>
  );
}
