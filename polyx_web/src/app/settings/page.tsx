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
  const [showExportKey, setShowExportKey] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  useEffect(() => {
    userApi.me().then(setProfile).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function copyWallet() {
    if (!profile?.wallet_address) return;
    navigator.clipboard.writeText(profile.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function exportKey() {
    setShowExportKey(true);
  }

  function copyPrivateKey() {
    // In production this would fetch the encrypted key from the backend
    const key = profile?.private_key || profile?.auth_wallet || "Contact support to export your private key";
    navigator.clipboard.writeText(key);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  }

  function logout() {
    clearToken();
    router.push("/auth");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-2 border-[#121212] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const walletDisplay = profile?.wallet_address
    ? truncateAddress(profile.wallet_address)
    : "Not connected";

  return (
    <div className="max-w-[700px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-6 text-[#121212]">Settings</h1>

      {/* Menu Card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Wallet */}
        <button onClick={copyWallet} className="w-full flex items-center gap-4 px-5 py-4 border-b border-black/5 hover:bg-[#F7F7F7] transition-colors text-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9B9B9B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4M4 6v12c0 1.1.9 2 2 2h14v-4M18 12a2 2 0 000 4h4v-4h-4z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#121212]">Wallet</p>
            <p className="text-xs text-[#9B9B9B] font-mono">{copied ? "Copied!" : walletDisplay}</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9B9B9B" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
        </button>

        {/* Export Private Key */}
        <button onClick={exportKey} className="w-full flex items-center gap-4 px-5 py-4 border-b border-black/5 hover:bg-[#F7F7F7] transition-colors text-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9B9B9B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          <span className="flex-1 text-sm font-medium text-[#121212]">Export Private Key</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BFBFBF" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
        </button>

        {/* Help & Resources */}
        <button onClick={() => setShowHelp(true)} className="w-full flex items-center gap-4 px-5 py-4 border-b border-black/5 hover:bg-[#F7F7F7] transition-colors text-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9B9B9B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
          </svg>
          <span className="flex-1 text-sm font-medium text-[#121212]">Help & Resources</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BFBFBF" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
        </button>

        {/* Join the Community */}
        <a href="https://t.me/polycoolapp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-5 py-4 hover:bg-[#F7F7F7] transition-colors text-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9B9B9B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          <span className="flex-1 text-sm font-medium text-[#121212]">Join the Community</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BFBFBF" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
        </a>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mt-4">
        <h3 className="font-bold text-sm text-[#121212] mb-3">Account</h3>
        <div className="space-y-0 text-sm">
          <div className="flex justify-between py-3 border-b border-black/5">
            <span className="text-[#9B9B9B] font-medium">Auth</span>
            <span className="font-medium text-[#121212]">
              {(profile?.auth_provider || "web").charAt(0).toUpperCase() + (profile?.auth_provider || "web").slice(1)}
            </span>
          </div>
          <div className="flex justify-between py-3 border-b border-black/5">
            <span className="text-[#9B9B9B] font-medium">Wallet</span>
            <span className="font-medium text-[#121212] font-mono text-xs">{walletDisplay}</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-[#9B9B9B] font-medium">Since</span>
            <span className="font-medium text-[#121212]">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "--"}
            </span>
          </div>
        </div>
      </div>

      {/* Log out */}
      <button
        onClick={logout}
        className="flex items-center gap-3 mt-6 px-5 py-3 text-[#DC2626] text-sm font-medium hover:underline transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
        Log out
      </button>

      {/* Export Private Key Modal */}
      {showExportKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[420px] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-[#121212]">Export Private Key</h3>
              <button onClick={() => setShowExportKey(false)} className="text-[#9B9B9B] hover:text-[#121212]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-2xl p-3 mb-4">
              <p className="text-xs text-[#856404] font-medium">
                <strong>Warning:</strong> Never share your private key. Anyone with this key has full access to your funds.
              </p>
            </div>

            <div className="bg-[#F7F7F7] rounded-2xl px-4 py-3 font-mono text-xs break-all text-[#121212] mb-4">
              {profile?.private_key || profile?.auth_wallet || "Your private key is securely stored. Contact support to export."}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExportKey(false)}
                className="flex-1 border border-[#121212] text-[#121212] font-medium py-2.5 rounded-full transition-all text-sm hover:bg-[#F7F7F7]"
              >
                Close
              </button>
              <button
                onClick={copyPrivateKey}
                className="flex-1 bg-[#121212] hover:bg-[#333] text-white font-medium py-2.5 rounded-full transition-all text-sm"
              >
                {keyCopied ? "Copied!" : "Copy Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help & Resources Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[420px] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-[#121212]">Help & Resources</h3>
              <button onClick={() => setShowHelp(false)} className="text-[#9B9B9B] hover:text-[#121212]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-3">
              <a href="https://t.me/polycoolapp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F7F7F7] transition-colors">
                <div className="w-9 h-9 rounded-full bg-[#F7F7F7] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#121212]">FAQ & Support</p>
                  <p className="text-xs text-[#9B9B9B]">Get help from our team on Telegram</p>
                </div>
              </a>

              <a href="mailto:support@polycool.app" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F7F7F7] transition-colors">
                <div className="w-9 h-9 rounded-full bg-[#F7F7F7] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth="1.5"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#121212]">Email Support</p>
                  <p className="text-xs text-[#9B9B9B]">support@polycool.app</p>
                </div>
              </a>

              <div className="flex items-center gap-3 p-3 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-[#F7F7F7] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#121212]">Security</p>
                  <p className="text-xs text-[#9B9B9B]">Your funds are secured on Polygon</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-[#F7F7F7] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#121212]">Terms of Service</p>
                  <p className="text-xs text-[#9B9B9B]">Legal terms and conditions</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full mt-4 border border-[#121212] text-[#121212] font-medium py-2.5 rounded-full transition-all text-sm hover:bg-[#F7F7F7]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
