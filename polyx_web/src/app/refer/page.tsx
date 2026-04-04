"use client";

import { useEffect, useState } from "react";
import { userApi } from "@/lib/api";
import Link from "next/link";

export default function ReferPage() {
  const [profile, setProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [refInput, setRefInput] = useState("");

  useEffect(() => {
    userApi.me().then(setProfile).catch(() => {});
  }, []);

  const code = profile?.user_id
    ? profile.user_id.toString(36).toUpperCase().slice(0, 8).padEnd(8, "X")
    : "--------";

  const referralLink = typeof window !== "undefined"
    ? `${window.location.origin}/invest/sharky6999?ref=${code}`
    : "";

  async function copyLink() {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join Polycool", text: "Copy top Polymarket traders automatically", url: referralLink });
      } catch {}
    } else {
      copyLink();
    }
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
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white">Referral</h2>
        <p className="text-sm text-[#8B8FA3] mt-1">
          Friends save 15% on fees. You earn 35% + 7% + 2% across 3 referral tiers.
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-[#141728] rounded-xl p-3 text-center border border-white/[0.06]">
            <p className="text-2xl font-bold text-white">0</p>
            <p className="text-[10px] text-[#5A5F7A] uppercase tracking-wider mt-1">Referrals</p>
          </div>
          <div className="bg-[#141728] rounded-xl p-3 text-center border border-white/[0.06]">
            <p className="text-2xl font-bold text-[#FFB800]">$0.00</p>
            <p className="text-[10px] text-[#5A5F7A] uppercase tracking-wider mt-1">Earned</p>
          </div>
          <div className="bg-[#141728] rounded-xl p-3 text-center border border-white/[0.06]">
            <p className="text-2xl font-bold text-white">$0.00</p>
            <p className="text-[10px] text-[#5A5F7A] uppercase tracking-wider mt-1">Commission Pending</p>
          </div>
        </div>

        {/* Your Code */}
        <div className="bg-[#141728] rounded-xl p-4 mt-4 border border-white/[0.06]">
          <p className="text-[10px] text-[#5A5F7A] uppercase tracking-wider mb-2">Your Code</p>
          <p className="text-2xl font-bold font-mono text-white tracking-[0.2em] mb-4">{code}</p>
          <div className="flex gap-3">
            <button
              onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-2 bg-transparent border border-white/[0.06] rounded-full px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              {copied ? "Copied!" : "Copy link"}
            </button>
            <button
              onClick={shareLink}
              className="flex-1 flex items-center justify-center gap-2 bg-transparent border border-white/[0.06] rounded-full px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
              Share
            </button>
          </div>
        </div>

        {/* Have a referral code */}
        <div className="bg-[#141728] rounded-xl p-4 mt-4 border border-white/[0.06]">
          <p className="text-[10px] text-[#5A5F7A] uppercase tracking-wider mb-2">Have a referral code?</p>
          <div className="flex">
            <input
              type="text"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value.toUpperCase())}
              placeholder="ABCD1234"
              className="flex-1 bg-[#1E2235] rounded-xl px-4 py-2.5 text-white placeholder-[#5A5F7A] outline-none border border-transparent focus:border-[#3B5BFE]/50 text-sm font-mono"
            />
            <button className="text-[#FFB800] bg-[#FFB800]/10 rounded-xl px-4 py-2.5 font-medium text-sm hover:bg-[#FFB800]/20 transition-colors ml-2">
              Apply
            </button>
          </div>
        </div>

        {/* How does referral work */}
        <button className="text-[#3B5BFE] text-sm mt-4 flex items-center gap-1 hover:text-[#5B7BFF] transition-colors">
          How does referral work?
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        {/* Cool Coins Card */}
        <div className="bg-gradient-to-r from-[#6C5CE7] to-[#3B5BFE] rounded-2xl p-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="white" fillOpacity="0.2" />
                <circle cx="12" cy="12" r="6" fill="white" fillOpacity="0.4" />
                <path d="M12 8v8M9 11h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div>
                <p className="text-white font-bold">Cool Coins</p>
                <p className="text-white/70 text-sm">0</p>
              </div>
            </div>
            <button className="bg-[#00C853] text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-[#00B848] transition-colors">
              Claim +100
            </button>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full w-0 bg-white rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
