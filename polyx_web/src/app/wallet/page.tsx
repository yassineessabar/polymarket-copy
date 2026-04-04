"use client";

import { useEffect, useState } from "react";
import { userApi } from "@/lib/api";
import { formatUsd, truncateAddress } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

export default function WalletPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    userApi.me().then(setProfile).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function copyAddress() {
    if (!profile?.wallet_address) return;
    navigator.clipboard.writeText(profile.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-semibold font-display mb-4 sm:mb-6">Wallet</h1>

      {/* Balance */}
      <div className="bg-bg-card border border-border rounded-2xl p-5 sm:p-8 mb-4 text-center">
        <div className="text-xs text-text-muted uppercase tracking-wider mb-2">USDC Balance</div>
        <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight">
          {formatUsd(profile?.balance_usdc || 0)}
        </div>
        <div className="text-xs text-text-muted mt-1">on Polygon Network</div>
      </div>

      {/* Wallet Address + QR */}
      <div className="bg-bg-card border border-border rounded-2xl p-5 sm:p-8 mb-4">
        <h3 className="font-semibold text-sm sm:text-base mb-4">Your Trading Wallet</h3>

        <div className="flex flex-col items-center gap-5">
          <div className="bg-white p-3 rounded-2xl">
            <QRCodeSVG value={profile?.wallet_address || ""} size={160} />
          </div>

          <div className="w-full">
            <div className="bg-bg-secondary border border-border rounded-xl px-4 py-3 font-mono text-[11px] sm:text-sm break-all text-center mb-4">
              {profile?.wallet_address}
            </div>

            <button
              onClick={copyAddress}
              className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                  Copy Address
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Send Instructions */}
      <div className="bg-bg-card border border-border rounded-2xl p-5 sm:p-6">
        <h3 className="font-semibold text-sm sm:text-base mb-3">How to Deposit</h3>
        <div className="space-y-3 text-sm text-text-secondary">
          <div className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">1</span>
            <p>Send <strong className="text-white">USDC</strong> on the <strong className="text-white">Polygon</strong> network to the address above.</p>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">2</span>
            <p>Make sure you are sending on <strong className="text-white">Polygon (MATIC)</strong>, not Ethereum mainnet.</p>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">3</span>
            <p>Your balance will update automatically within a few minutes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
