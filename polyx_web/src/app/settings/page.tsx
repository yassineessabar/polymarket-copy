"use client";

import { useEffect, useState } from "react";
import { userApi, clearToken } from "@/lib/api";
import { truncateAddress } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    userApi.me().then(setProfile).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function copyWallet() {
    if (!profile?.wallet_address) return;
    navigator.clipboard.writeText(profile.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function logout() {
    clearToken();
    router.push("/auth");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#3B5BFE] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const walletDisplay = profile?.wallet_address
    ? truncateAddress(profile.wallet_address)
    : "Not connected";

  return (
    <div className="min-h-screen bg-[#080B16]">
      <div className="max-w-[600px] mx-auto px-4 pb-8">
        {/* Header */}
        <div className="flex items-center py-4">
          <Link href="/dashboard" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
        </div>

        {/* Menu List */}
        <div className="bg-[#141728] rounded-2xl overflow-hidden mt-4 border border-white/[0.06]">
          {/* Wallet */}
          <button
            onClick={copyWallet}
            className="w-full flex items-center gap-3 p-4 border-b border-white/[0.06] hover:bg-[#1A1F35] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B8FA3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 010-4h14v4" />
              <path d="M3 5v14a2 2 0 002 2h16v-5" />
              <path d="M18 12a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <span className="text-white font-medium">Wallet</span>
            <span className="text-[#5A5F7A] text-sm ml-auto mr-2">
              {copied ? "Copied!" : walletDisplay}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A5F7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>

          {/* Export Private Key */}
          <button className="w-full flex items-center gap-3 p-4 border-b border-white/[0.06] hover:bg-[#1A1F35] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B8FA3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            <span className="text-white font-medium">Export Private Key</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A5F7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          {/* Help & Resources */}
          <button className="w-full flex items-center gap-3 p-4 border-b border-white/[0.06] hover:bg-[#1A1F35] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B8FA3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
            <span className="text-white font-medium">Help & Resources</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A5F7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          {/* Join the Community */}
          <button className="w-full flex items-center gap-3 p-4 hover:bg-[#1A1F35] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B8FA3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            <span className="text-white font-medium">Join the Community</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A5F7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Log out */}
        <button
          onClick={logout}
          className="flex items-center gap-3 p-4 mt-4 hover:bg-white/5 rounded-2xl transition-colors w-full"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="text-[#DC2626] font-medium">Log out</span>
        </button>
      </div>
    </div>
  );
}
