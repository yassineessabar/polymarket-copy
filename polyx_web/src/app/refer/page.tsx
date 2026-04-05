"use client";

import { useEffect, useState } from "react";
import { userApi } from "@/lib/api";

export default function ReferPage() {
  const [profile, setProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    userApi.me().then(setProfile).catch(() => {});
  }, []);

  const refCode = profile?.referral_code || profile?.user_id || "";
  const referralLink = typeof window !== "undefined" && refCode
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
        await navigator.share({ title: "Join Polycool", text: "Copy top Polymarket traders automatically", url: referralLink });
      } catch {}
    } else {
      await copyLink();
    }
  }

  return (
    <div className="max-w-[600px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-6 text-[#121212]">Refer Friends</h1>

      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm mb-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#F7F7F7] flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#121212] mb-2">Invite friends, earn together</h2>
          <p className="text-sm text-[#9B9B9B] font-medium max-w-[360px] mx-auto">
            Share your referral link with friends. When they sign up and start trading, you both benefit.
          </p>
        </div>

        <div className="bg-[#F7F7F7] rounded-2xl p-4 mb-4">
          <p className="text-[10px] text-[#9B9B9B] uppercase tracking-wider font-medium mb-2">Your Referral Link</p>
          <div className="bg-white border border-black/5 rounded-xl px-4 py-3 font-mono text-xs break-all text-[#121212] mb-3">
            {referralLink || "Loading..."}
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="flex-1 rounded-full bg-[#121212] text-white text-sm font-medium py-2.5 transition-all hover:bg-[#333]"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <button
              onClick={shareLink}
              className="flex-1 rounded-full border border-[#121212] text-[#121212] text-sm font-medium py-2.5 transition-all hover:bg-[#F7F7F7]"
            >
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-sm text-[#121212] mb-3">How it works</h3>
        <div className="space-y-3">
          {[
            { step: "1", title: "Share your link", desc: "Send your unique referral link to friends" },
            { step: "2", title: "Friend signs up", desc: "They create an account and pick a strategy" },
            { step: "3", title: "Both benefit", desc: "You earn rewards when they start trading" },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#F7F7F7] flex items-center justify-center text-xs font-bold text-[#121212] flex-shrink-0">{s.step}</div>
              <div>
                <p className="text-sm font-bold text-[#121212]">{s.title}</p>
                <p className="text-xs text-[#9B9B9B] font-medium">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
