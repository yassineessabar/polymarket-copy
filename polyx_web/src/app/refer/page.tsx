"use client";

import { useEffect, useState } from "react";
import { userApi } from "@/lib/api";

export default function ReferPage() {
  const [profile, setProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [refInput, setRefInput] = useState("");
  const [applyStatus, setApplyStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    userApi.me().then(setProfile).catch(() => {});
  }, []);

  const refCode = profile?.referral_code || profile?.user_id || "";
  const referralLink =
    typeof window !== "undefined" && refCode
      ? `${window.location.origin}/auth?ref=${refCode}`
      : "";

  async function copyLink() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for HTTP (non-HTTPS) contexts
      const textarea = document.createElement("textarea");
      textarea.value = referralLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function shareLink() {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Polycool",
          text: "Copy top Polymarket traders automatically",
          url: referralLink,
        });
      } catch {}
    } else {
      await copyLink();
    }
  }

  async function applyCode() {
    if (!refInput.trim()) return;
    setApplyStatus("loading");
    try {
      await userApi.updateSettings({ referred_by: refInput.trim() });
      setApplyStatus("success");
    } catch {
      setApplyStatus("error");
    }
  }

  // Placeholder stats -- replace with real data when available
  const stats = {
    referrals: profile?.referral_count || 0,
    earned: profile?.referral_earned || 0,
    pending: profile?.referral_pending || 0,
  };

  return (
    <div className="max-w-[600px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-4 sm:mb-6 text-[#121212]">
        Refer Friends
      </h1>

      {/* Hero Illustration */}
      <div className="bg-[#F0F0F0] rounded-2xl p-8 text-center mb-4">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-4 shadow-sm">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#121212"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#121212] mb-2">
          Invite friends, earn together
        </h2>
        <p className="text-sm text-[#9B9B9B] font-medium max-w-[380px] mx-auto leading-relaxed">
          Share your referral link. When they sign up and start trading, you both benefit.
        </p>
      </div>

      {/* Your Referral Link Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <p className="text-xs text-[#9B9B9B] uppercase tracking-wider font-medium mb-2">
          Your Referral Link
        </p>
        <div className="bg-[#F7F7F7] border border-black/5 rounded-xl px-4 py-3 font-mono text-xs break-all text-[#121212] mb-4">
          {referralLink || "Loading..."}
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex-1 rounded-full bg-[#121212] text-white text-sm font-medium py-2.5 transition-all hover:bg-[#333] flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy Link
              </>
            )}
          </button>
          <button
            onClick={shareLink}
            className="flex-1 rounded-full border border-[#121212] text-[#121212] text-sm font-medium py-2.5 transition-all hover:bg-[#F7F7F7] flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
            </svg>
            Share
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-[#121212] font-mono">{stats.referrals}</div>
          <div className="text-xs text-[#9B9B9B] font-medium mt-1">Referrals</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-[#009D55] font-mono">
            ${stats.earned.toFixed(2)}
          </div>
          <div className="text-xs text-[#9B9B9B] font-medium mt-1">Earned</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-[#121212] font-mono">
            ${stats.pending.toFixed(2)}
          </div>
          <div className="text-xs text-[#9B9B9B] font-medium mt-1">Pending</div>
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <h3 className="font-bold text-sm text-[#121212] mb-4">How it Works</h3>
        <div className="space-y-4">
          {[
            {
              step: "1",
              title: "Share your link",
              desc: "Send your unique referral link to friends",
            },
            {
              step: "2",
              title: "Friend signs up and picks a strategy",
              desc: "They create an account and choose a trader to copy",
            },
            {
              step: "3",
              title: "You earn rewards",
              desc: "When they start trading, you both benefit",
            },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#121212] flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {s.step}
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-bold text-[#121212]">{s.title}</p>
                <p className="text-xs text-[#9B9B9B] font-medium mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referral Code Input */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
        <h3 className="font-bold text-sm text-[#121212] mb-1">Have a referral code?</h3>
        <p className="text-xs text-[#9B9B9B] font-medium mb-4">
          Enter a code from a friend to connect your accounts.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={refInput}
            onChange={(e) => {
              setRefInput(e.target.value);
              setApplyStatus("idle");
            }}
            placeholder="Enter code"
            className="flex-1 bg-[#F7F7F7] border border-black/5 rounded-full px-5 py-2.5 text-[#121212] outline-none focus:border-[#121212] text-sm placeholder:text-[#9B9B9B]"
          />
          <button
            onClick={applyCode}
            disabled={!refInput.trim() || applyStatus === "loading"}
            className="bg-[#121212] hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-6 py-2.5 rounded-full transition-all"
          >
            {applyStatus === "loading" ? "..." : "Apply"}
          </button>
        </div>
        {applyStatus === "success" && (
          <p className="text-xs text-[#009D55] font-medium mt-2">
            Referral code applied successfully!
          </p>
        )}
        {applyStatus === "error" && (
          <p className="text-xs text-red-500 font-medium mt-2">
            Could not apply code. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
