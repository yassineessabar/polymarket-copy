"use client";

import { useEffect, useState } from "react";
import { paymentsApi, userApi } from "@/lib/api";

export default function SubscriptionPage() {
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentsApi.status().then(setSub).catch(() => {});
    setLoading(false);
  }, []);

  async function startCheckout() {
    try {
      const { checkout_url } = await paymentsApi.checkout();
      window.open(checkout_url, "_blank");
    } catch {}
  }

  const isActive = sub?.status === "active" || sub?.status === "trialing";

  return (
    <div className="max-w-[600px] mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-6 text-[#0F0F0F]">Subscription</h1>

      {/* Current Plan */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm mb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-3 h-3 rounded-full ${isActive ? "bg-[#10B981]" : "bg-[#6B7280]"}`} />
          <h2 className="text-lg font-bold text-[#0F0F0F]">{isActive ? "Live Trading Active" : "Demo Mode"}</h2>
        </div>

        {isActive ? (
          <div className="bg-[#F5F5F5] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-[#0F0F0F]">Live Plan</span>
              <span className="bg-[#10B981]/10 text-[#10B981] text-xs font-bold px-3 py-1 rounded-full">
                {sub.status === "trialing" ? "Trial" : "Active"}
              </span>
            </div>
            <p className="text-2xl font-bold text-[#0F0F0F] mb-1">$39<span className="text-sm font-normal text-[#6B7280]">/month</span></p>
            <p className="text-xs text-[#6B7280] font-medium">+ 25% performance fee on profits only</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-[#F5F5F5] rounded-2xl p-5 border-2 border-transparent">
                <p className="text-sm font-bold text-[#0F0F0F] mb-1">Demo</p>
                <p className="text-2xl font-bold text-[#0F0F0F]">Free</p>
                <p className="text-xs text-[#6B7280] font-medium mt-2">Virtual funds, zero risk</p>
                <ul className="mt-3 space-y-1.5 text-xs text-[#6B7280]">
                  <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span>Unlimited demo trading</li>
                  <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span>All strategies</li>
                  <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span>Real market data</li>
                </ul>
              </div>
              <div className="bg-[#F5F5F5] rounded-2xl p-5 border-2 border-[#0F0F0F]">
                <p className="text-sm font-bold text-[#0F0F0F] mb-1">Live</p>
                <p className="text-2xl font-bold text-[#0F0F0F]">$39<span className="text-sm font-normal text-[#6B7280]">/mo</span></p>
                <p className="text-xs text-[#6B7280] font-medium mt-2">+ 25% perf fee on profits</p>
                <ul className="mt-3 space-y-1.5 text-xs text-[#6B7280]">
                  <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span>Real trade execution</li>
                  <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span>On-chain settlement</li>
                  <li className="flex items-center gap-2"><span className="text-[#10B981]">&#10003;</span>No fee on losses</li>
                </ul>
              </div>
            </div>
            <button
              onClick={startCheckout}
              className="w-full bg-[#0F0F0F] hover:bg-[#333] text-white font-medium py-3 rounded-full transition-all text-sm"
            >
              Subscribe &mdash; $39/month
            </button>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-sm text-[#0F0F0F] mb-3">FAQ</h3>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-[#0F0F0F]">When am I charged the performance fee?</p>
            <p className="text-[#6B7280] text-xs mt-1">Only when a position closes in profit. If you lose, you pay nothing.</p>
          </div>
          <div>
            <p className="font-medium text-[#0F0F0F]">Can I cancel anytime?</p>
            <p className="text-[#6B7280] text-xs mt-1">Yes. Cancel your subscription anytime from your Stripe billing portal.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
