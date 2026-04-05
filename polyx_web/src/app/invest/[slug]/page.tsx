"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { STRATEGIES } from "@/lib/strategies";
import { authApi, setToken, userApi, copyApi, isLoggedIn } from "@/lib/api";

type Step = "auth" | "wallet-connecting" | "magic-form" | "magic-sent" | "amount" | "confirm" | "success";

const PRESET_AMOUNTS = [100, 500, 1000, 5000];

export default function InvestPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const strategy = STRATEGIES[slug];
  const demoFromUrl = searchParams.get("demo") === "1";

  const refFromUrl = searchParams.get("ref") || "";
  const [step, setStep] = useState<Step>(isLoggedIn() ? "amount" : "auth");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState(refFromUrl);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState("");
  const [isDemo, setIsDemo] = useState(demoFromUrl);
  const [showDeposit, setShowDeposit] = useState(false);
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);

  if (!strategy) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 text-[#0F0F0F]">404</div>
          <h1 className="text-xl font-bold mb-2 text-[#0F0F0F]">Strategy Not Found</h1>
          <Link href="/" className="text-[#0F0F0F] underline text-sm font-medium">Back to Home</Link>
        </div>
      </div>
    );
  }

  async function connectWallet() {
    setError("");
    const eth = (window as any)?.ethereum;
    if (!eth) {
      setError("No wallet detected. Use email sign-in instead.");
      setHasWallet(null);
      return;
    }

    setStep("wallet-connecting");
    setLoading(true);

    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) throw new Error("No accounts returned");
      const address = accounts[0];

      const { nonce } = await authApi.nonce(address);
      const signature: string = await eth.request({
        method: "personal_sign",
        params: [nonce, address],
      });
      const { token } = await authApi.verify(address, signature);
      setToken(token);
      setStep("amount");
    } catch (err: any) {
      const code = err?.code || err?.data?.code || 0;
      const msg = err?.message || "";
      let userMsg = "Connection failed. Please try again.";

      if (code === 4001 || msg.includes("user-denied") || msg.includes("User rejected") || msg.includes("ACTION_REJECTED")) {
        userMsg = "Connection cancelled. Try again or use email instead.";
      } else if (code === -32002 || msg.includes("already pending") || msg.includes("coalesce")) {
        userMsg = "A wallet request is already pending. Open your wallet and approve or reject it first.";
      }

      setError(userMsg);
      setStep("auth");
      setHasWallet(null);
    } finally {
      setLoading(false);
    }
  }

  async function sendMagicLink() {
    setError("");
    if (!email.includes("@")) {
      setError("Enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.magicLink(email);
      if (res.dev_token) {
        const { token } = await authApi.magicVerify(res.dev_token);
        setToken(token);
        setStep("amount");
        return;
      }
      setStep("magic-sent");
    } catch (err: any) {
      setError(err.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  }

  async function confirmInvest() {
    setLoading(true);
    setError("");
    try {
      await userApi.updateSettings({
        demo_mode: isDemo ? 1 : 0,
        demo_balance: amount,
      });
      await copyApi.addTarget(strategy.wallet, strategy.name);
      await copyApi.start();
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Failed to set up investment");
    } finally {
      setLoading(false);
    }
  }

  const finalAmount = customAmount ? parseFloat(customAmount) : amount;

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#0F0F0F]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-[500px] mx-auto flex items-center justify-between h-[56px] px-5">
          <Link href={`/strategy/${slug}`} className="flex items-center gap-2 text-[#6B7280] hover:text-[#0F0F0F] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span className="text-sm font-medium">Back</span>
          </Link>
          <span className="text-sm font-bold">
            {isDemo ? "Demo" : "Invest"} in {strategy.name}
          </span>
          <div className="w-12" />
        </div>
      </nav>

      <div className="max-w-[500px] mx-auto px-5 py-8 sm:py-12">
        {/* Strategy header */}
        <div className="flex items-center gap-3 mb-8 bg-white rounded-2xl p-4 shadow-sm">
          <img alt={strategy.name} src={strategy.image} className="w-12 h-12 rounded-xl object-cover" />
          <div>
            <div className="font-bold text-sm text-[#0F0F0F]">{strategy.name}</div>
            <div className="text-xs text-[#6B7280] font-medium">+{strategy.returnPct}% all time &middot; {strategy.winRate}% win rate</div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["Auth", "Amount", "Confirm"].map((label, i) => {
            const authSteps: string[] = ["auth", "wallet-connecting", "magic-form", "magic-sent"];
            const stepIndex = authSteps.includes(step)
              ? 0
              : step === "amount"
              ? 1
              : 2;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i <= stepIndex ? "bg-[#0F0F0F] text-white" : "bg-[#F0F0F0] text-[#6B7280]"
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-medium ${i <= stepIndex ? "text-[#0F0F0F]" : "text-[#6B7280]"} hidden sm:block`}>{label}</span>
                {i < 2 && <div className="w-8 sm:w-12 h-px bg-black/8" />}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="bg-[#EF4444]/5 border border-[#EF4444]/10 text-[#EF4444] text-sm p-3 rounded-2xl mb-4 font-medium">
            {error}
          </div>
        )}

        {/* Step 1: Auth */}
        {step === "auth" && hasWallet === null && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg sm:text-xl font-bold text-center mb-2 text-[#0F0F0F]">Do you have a Crypto Wallet?</h2>
            <p className="text-sm text-[#6B7280] font-medium text-center mb-8">
              If you have MetaMask or another wallet, connect it. Otherwise, sign in with email.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setHasWallet(true);
                  connectWallet();
                }}
                className="w-full border border-[#0F0F0F] text-[#0F0F0F] font-medium py-3.5 rounded-full transition-all flex items-center justify-center gap-3 hover:bg-[#F5F5F5]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
                </svg>
                Yes, Connect Wallet
              </button>
              <button
                onClick={() => {
                  setHasWallet(false);
                  setStep("magic-form");
                }}
                className="w-full bg-[#0F0F0F] hover:bg-[#333] text-white font-medium py-3.5 rounded-full transition-all flex items-center justify-center gap-3"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                No, Use Email Instead
              </button>
            </div>
            <button onClick={() => router.push("/dashboard")} className="w-full text-center text-[#6B7280] text-sm mt-5 hover:text-[#6B7280] transition-colors">
              I&apos;ll do it later
            </button>
            <div className="mt-5 pt-4 border-t border-black/5">
              <label className="text-xs text-[#6B7280] font-medium mb-1.5 block">Referral Code (optional)</label>
              <input
                type="text"
                placeholder="Enter referral code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="w-full bg-[#F5F5F5] border border-black/5 rounded-full px-5 py-2.5 text-[#0F0F0F] outline-none focus:border-[#0F0F0F] text-sm placeholder-[#BFBFBF]"
              />
            </div>
          </div>
        )}

        {step === "wallet-connecting" && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="w-12 h-12 border-2 border-[#0F0F0F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="font-bold mb-2 text-[#0F0F0F]">Connecting Wallet</h2>
            <p className="text-sm text-[#6B7280] font-medium">
              Approve the connection and sign the message in your wallet...
            </p>
          </div>
        )}

        {step === "magic-form" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
            <button onClick={() => { setStep("auth"); setHasWallet(null); }} className="text-[#6B7280] hover:text-[#0F0F0F] text-sm mb-4 flex items-center gap-1 font-medium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
            <h2 className="text-lg font-bold mb-2 text-[#0F0F0F]">Sign in with Email</h2>
            <p className="text-sm text-[#6B7280] font-medium mb-6">
              We&apos;ll create a secure trading wallet for you automatically.
            </p>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
              className="w-full bg-[#F5F5F5] border border-black/5 rounded-full px-5 py-3 text-[#0F0F0F] placeholder-[#BFBFBF] outline-none focus:border-[#0F0F0F] transition-colors mb-4"
            />
            <button
              onClick={sendMagicLink}
              disabled={loading}
              className="w-full bg-[#0F0F0F] hover:bg-[#333] text-white font-medium py-3.5 rounded-full transition-all disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Continue"}
            </button>
          </div>
        )}

        {step === "magic-sent" && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 bg-[#F5F5F5] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F0F0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <h2 className="font-bold mb-2 text-[#0F0F0F]">Check Your Email</h2>
            <p className="text-sm text-[#6B7280] font-medium mb-6">
              We sent a sign-in link to <strong className="text-[#0F0F0F]">{email}</strong>
            </p>
            <button onClick={() => setStep("magic-form")} className="text-[#0F0F0F] text-sm font-medium underline">
              Didn&apos;t receive it? Try again
            </button>
          </div>
        )}

        {/* Step 2: Choose Amount */}
        {step === "amount" && !showDeposit && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg sm:text-xl font-bold text-center mb-2 text-[#0F0F0F]">Choose Amount</h2>
            <p className="text-sm text-[#6B7280] font-medium text-center mb-6">
              {isDemo
                ? "How much virtual funds do you want to start with?"
                : "How much USDC do you want to invest?"}
            </p>

            {/* Demo / Live Toggle */}
            <div className="flex bg-[#F5F5F5] rounded-full p-1 mb-6">
              <button
                onClick={() => setIsDemo(true)}
                className={`flex-1 py-2.5 rounded-full text-xs font-medium transition-all ${
                  isDemo ? "bg-[#0F0F0F] text-white shadow-sm" : "text-[#6B7280] hover:text-[#0F0F0F]"
                }`}
              >
                Demo (Virtual)
              </button>
              <button
                onClick={() => setIsDemo(false)}
                className={`flex-1 py-2.5 rounded-full text-xs font-medium transition-all ${
                  !isDemo ? "bg-[#0F0F0F] text-white shadow-sm" : "text-[#6B7280] hover:text-[#0F0F0F]"
                }`}
              >
                Live (Real USDC)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {PRESET_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => { setAmount(a); setCustomAmount(""); }}
                  className={`py-3 rounded-full text-sm font-bold font-mono transition-all ${
                    amount === a && !customAmount
                      ? "bg-[#0F0F0F] text-white"
                      : "bg-[#F5F5F5] text-[#0F0F0F] hover:bg-[#EBEBEB]"
                  }`}
                >
                  ${a.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="relative mb-6">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#6B7280]">$</span>
              <input
                type="number"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full bg-[#F5F5F5] border border-black/5 rounded-full pl-9 pr-5 py-3 text-[#0F0F0F] placeholder-[#BFBFBF] outline-none focus:border-[#0F0F0F] transition-colors"
              />
            </div>

            {/* Main CTA */}
            {isDemo ? (
              <button
                onClick={() => setStep("confirm")}
                disabled={!finalAmount || finalAmount < 1}
                className="w-full bg-[#0F0F0F] hover:bg-[#333] text-white font-medium py-3.5 rounded-full transition-all disabled:opacity-50"
              >
                Start Demo with ${(finalAmount || 0).toLocaleString()}
              </button>
            ) : (
              <button
                onClick={() => setShowDeposit(true)}
                disabled={!finalAmount || finalAmount < 1}
                className="w-full bg-[#10B981] hover:bg-[#008548] text-white font-medium py-3.5 rounded-full transition-all disabled:opacity-50"
              >
                Deposit ${(finalAmount || 0).toLocaleString()} USDC
              </button>
            )}

            {/* Secondary options */}
            <div className="flex items-center justify-center gap-4 mt-4">
              {!isDemo && (
                <button
                  onClick={() => { setIsDemo(true); }}
                  className="text-[#6B7280] text-sm hover:text-[#6B7280] transition-colors"
                >
                  Try Demo First
                </button>
              )}
              <button onClick={() => router.push("/dashboard")} className="text-[#6B7280] text-sm hover:text-[#6B7280] transition-colors">
                I&apos;ll do it later
              </button>
            </div>
          </div>
        )}

        {/* Step 2b: Deposit (Live mode) — embedded MoonPay */}
        {step === "amount" && showDeposit && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
              <div>
                <h2 className="text-base font-bold text-[#0F0F0F]">Deposit ${(finalAmount || 0).toLocaleString()} USDC</h2>
                <p className="text-xs text-[#6B7280] mt-0.5">Funds go directly to your trading wallet</p>
              </div>
              <button onClick={() => setShowDeposit(false)} className="w-8 h-8 rounded-full bg-[#F5F5F5] hover:bg-[#EBEBEB] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Embedded MoonPay */}
            <div style={{ height: "520px" }}>
              <iframe
                src={`https://buy.moonpay.com?apiKey=pk_test_Yh1ao0Ys5snWHLqkeLQfbfFaYHnVjRP&currencyCode=usdc_polygon&baseCurrencyAmount=${finalAmount || 500}&walletAddress=&colorCode=%237B3FE4&language=en&baseCurrencyCode=usd&theme=light`}
                allow="accelerometer; autoplay; camera; gyroscope; payment; microphone"
                width="100%"
                height="100%"
                style={{ border: "none" }}
                title="Buy USDC with MoonPay"
              />
            </div>

            <div className="px-5 py-4 border-t border-black/5">
              <p className="text-[10px] text-[#6B7280] text-center mb-3">
                After depositing, click below to continue
              </p>
              <button
                onClick={() => { setShowDeposit(false); setStep("confirm"); }}
                className="w-full bg-[#0F0F0F] hover:bg-[#333] text-white font-medium py-3 rounded-full transition-all text-sm"
              >
                I&apos;ve Deposited — Continue
              </button>
              <button
                onClick={() => { setShowDeposit(false); setIsDemo(true); }}
                className="w-full text-center text-[#6B7280] text-sm mt-3 hover:text-[#6B7280] transition-colors"
              >
                Switch to Demo Instead
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg sm:text-xl font-bold text-center mb-6 text-[#0F0F0F]">Confirm Investment</h2>

            <div className="space-y-0 mb-6">
              <div className="flex justify-between items-center py-3 border-b border-black/5">
                <span className="text-sm text-[#6B7280] font-medium">Strategy</span>
                <span className="text-sm font-bold text-[#0F0F0F]">{strategy.name}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-black/5">
                <span className="text-sm text-[#6B7280] font-medium">Amount</span>
                <span className="text-sm font-bold font-mono text-[#0F0F0F]">${(finalAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-black/5">
                <span className="text-sm text-[#6B7280] font-medium">Mode</span>
                <span className={`text-sm font-bold ${isDemo ? "text-[#6B7280]" : "text-[#10B981]"}`}>
                  {isDemo ? "Demo (Virtual)" : "Live Trading"}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-[#6B7280] font-medium">Win Rate</span>
                <span className="text-sm font-bold text-[#10B981]">{strategy.winRate}%</span>
              </div>
            </div>

            {isDemo && (
              <div className="bg-[#F5F5F5] rounded-2xl p-3 mb-6">
                <p className="text-xs text-[#6B7280] font-medium">
                  Demo mode uses virtual funds. No real money at risk. You can switch to live trading anytime.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("amount")}
                className="flex-1 border border-[#0F0F0F] text-[#0F0F0F] font-medium py-3 rounded-full transition-all text-sm hover:bg-[#F5F5F5]"
              >
                Back
              </button>
              <button
                onClick={confirmInvest}
                disabled={loading}
                className="flex-1 bg-[#0F0F0F] hover:bg-[#333] text-white font-medium py-3 rounded-full transition-all disabled:opacity-50 text-sm"
              >
                {loading ? "Setting up..." : "Confirm"}
              </button>
            </div>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2 text-[#0F0F0F]">You&apos;re All Set!</h2>
            <p className="text-sm text-[#6B7280] font-medium mb-6">
              You&apos;re now {isDemo ? "demo " : ""}investing in <strong className="text-[#0F0F0F]">{strategy.name}</strong> with{" "}
              <strong className="text-[#0F0F0F]">${(finalAmount || 0).toLocaleString()}</strong> {isDemo ? "virtual " : ""}funds.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-[#0F0F0F] hover:bg-[#333] text-white font-medium py-3.5 rounded-full transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
