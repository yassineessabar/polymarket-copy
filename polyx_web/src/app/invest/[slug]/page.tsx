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
  const isDemo = searchParams.get("demo") === "1";

  const refFromUrl = searchParams.get("ref") || "";
  const [step, setStep] = useState<Step>(isLoggedIn() ? "amount" : "auth");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState(refFromUrl);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState("");
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);

  if (!strategy) {
    return (
      <div className="min-h-screen bg-[#0B0E1C] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 text-white">404</div>
          <h1 className="text-xl font-bold mb-2 text-white">Strategy Not Found</h1>
          <Link href="/" className="text-white underline text-sm font-medium">Back to Home</Link>
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
    <div className="min-h-screen bg-[#0B0E1C] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0B0E1C]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[500px] mx-auto flex items-center justify-between h-[56px] px-5">
          <Link href={`/strategy/${slug}`} className="flex items-center gap-2 text-[#8B8FA3] hover:text-white transition-colors">
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
        <div className="flex items-center gap-3 mb-8 bg-[#141728] rounded-2xl p-4">
          <img alt={strategy.name} src={strategy.image} className="w-12 h-12 rounded-xl object-cover" />
          <div>
            <div className="font-bold text-sm text-white">{strategy.name}</div>
            <div className="text-xs text-[#8B8FA3] font-medium">+{strategy.returnPct}% all time &middot; {strategy.winRate}% win rate</div>
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
                  i <= stepIndex ? "bg-white text-[#0B0E1C]" : "bg-[#1A1F35] text-[#5A5F7A]"
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-medium ${i <= stepIndex ? "text-white" : "text-[#5A5F7A]"} hidden sm:block`}>{label}</span>
                {i < 2 && <div className="w-8 sm:w-12 h-px bg-white/[0.06]" />}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="bg-[#DC2626]/10 border border-[#DC2626]/20 text-[#DC2626] text-sm p-3 rounded-2xl mb-4 font-medium">
            {error}
          </div>
        )}

        {/* Step 1: Auth */}
        {step === "auth" && hasWallet === null && (
          <div className="bg-[#141728] rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-center mb-2 text-white">Do you have a Crypto Wallet?</h2>
            <p className="text-sm text-[#8B8FA3] font-medium text-center mb-8">
              If you have MetaMask or another wallet, connect it. Otherwise, sign in with email.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setHasWallet(true);
                  connectWallet();
                }}
                className="w-full border border-white/20 text-white font-medium py-3.5 rounded-full transition-all flex items-center justify-center gap-3 hover:bg-white/[0.02]"
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
                className="w-full bg-white hover:bg-white/90 text-[#0B0E1C] font-medium py-3.5 rounded-full transition-all flex items-center justify-center gap-3"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                No, Use Email Instead
              </button>
            </div>
            <div className="mt-5 pt-4 border-t border-white/[0.06]">
              <label className="text-xs text-[#8B8FA3] font-medium mb-1.5 block">Referral Code (optional)</label>
              <input
                type="text"
                placeholder="Enter referral code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="w-full bg-[#1A1F35] border border-white/[0.06] rounded-full px-5 py-2.5 text-white outline-none focus:border-[#3B5BFE] text-sm placeholder-[#5A5F7A]"
              />
            </div>
          </div>
        )}

        {step === "wallet-connecting" && (
          <div className="bg-[#141728] rounded-2xl p-8 text-center">
            <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="font-bold mb-2 text-white">Connecting Wallet</h2>
            <p className="text-sm text-[#8B8FA3] font-medium">
              Approve the connection and sign the message in your wallet...
            </p>
          </div>
        )}

        {step === "magic-form" && (
          <div className="bg-[#141728] rounded-2xl p-6 sm:p-8">
            <button onClick={() => { setStep("auth"); setHasWallet(null); }} className="text-[#8B8FA3] hover:text-white text-sm mb-4 flex items-center gap-1 font-medium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
            <h2 className="text-lg font-bold mb-2 text-white">Sign in with Email</h2>
            <p className="text-sm text-[#8B8FA3] font-medium mb-6">
              We&apos;ll create a secure trading wallet for you automatically.
            </p>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
              className="w-full bg-[#1A1F35] border border-white/[0.06] rounded-full px-5 py-3 text-white placeholder-[#5A5F7A] outline-none focus:border-[#3B5BFE] transition-colors mb-4"
            />
            <button
              onClick={sendMagicLink}
              disabled={loading}
              className="w-full bg-white hover:bg-white/90 text-[#0B0E1C] font-medium py-3.5 rounded-full transition-all disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Continue"}
            </button>
          </div>
        )}

        {step === "magic-sent" && (
          <div className="bg-[#141728] rounded-2xl p-8 text-center">
            <div className="w-14 h-14 bg-[#1A1F35] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B8FA3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <h2 className="font-bold mb-2 text-white">Check Your Email</h2>
            <p className="text-sm text-[#8B8FA3] font-medium mb-6">
              We sent a sign-in link to <strong className="text-white">{email}</strong>
            </p>
            <button onClick={() => setStep("magic-form")} className="text-white text-sm font-medium underline">
              Didn&apos;t receive it? Try again
            </button>
          </div>
        )}

        {/* Step 2: Choose Amount */}
        {step === "amount" && (
          <div className="bg-[#141728] rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-center mb-2 text-white">Choose Amount</h2>
            <p className="text-sm text-[#8B8FA3] font-medium text-center mb-8">
              {isDemo
                ? "How much virtual funds do you want to start with?"
                : "How much do you want to invest?"}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {PRESET_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => { setAmount(a); setCustomAmount(""); }}
                  className={`py-3 rounded-full text-sm font-bold font-mono transition-all ${
                    amount === a && !customAmount
                      ? "bg-[#3B5BFE] text-white"
                      : "bg-[#1A1F35] text-white hover:bg-[#1A1F35]/80"
                  }`}
                >
                  ${a.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="relative mb-6">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#5A5F7A]">$</span>
              <input
                type="number"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full bg-[#1A1F35] border border-white/[0.06] rounded-full pl-9 pr-5 py-3 text-white placeholder-[#5A5F7A] outline-none focus:border-[#3B5BFE] transition-colors"
              />
            </div>

            <button
              onClick={() => setStep("confirm")}
              disabled={!finalAmount || finalAmount < 1}
              className="w-full bg-white hover:bg-white/90 text-[#0B0E1C] font-medium py-3.5 rounded-full transition-all disabled:opacity-50"
            >
              Continue with ${(finalAmount || 0).toLocaleString()}
            </button>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && (
          <div className="bg-[#141728] rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-center mb-6 text-white">Confirm Investment</h2>

            <div className="space-y-0 mb-6">
              <div className="flex justify-between items-center py-3 border-b border-white/[0.06]">
                <span className="text-sm text-[#8B8FA3] font-medium">Strategy</span>
                <span className="text-sm font-bold text-white">{strategy.name}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/[0.06]">
                <span className="text-sm text-[#8B8FA3] font-medium">Amount</span>
                <span className="text-sm font-bold font-mono text-white">${(finalAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/[0.06]">
                <span className="text-sm text-[#8B8FA3] font-medium">Mode</span>
                <span className={`text-sm font-bold ${isDemo ? "text-[#5A5F7A]" : "text-[#00C853]"}`}>
                  {isDemo ? "Demo (Virtual)" : "Live Trading"}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-[#8B8FA3] font-medium">Win Rate</span>
                <span className="text-sm font-bold text-[#00C853]">{strategy.winRate}%</span>
              </div>
            </div>

            {isDemo && (
              <div className="bg-[#1A1F35] rounded-2xl p-3 mb-6">
                <p className="text-xs text-[#5A5F7A] font-medium">
                  Demo mode uses virtual funds. No real money at risk. You can switch to live trading anytime.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("amount")}
                className="flex-1 border border-white/20 text-white font-medium py-3 rounded-full transition-all text-sm hover:bg-white/[0.02]"
              >
                Back
              </button>
              <button
                onClick={confirmInvest}
                disabled={loading}
                className="flex-1 bg-white hover:bg-white/90 text-[#0B0E1C] font-medium py-3 rounded-full transition-all disabled:opacity-50 text-sm"
              >
                {loading ? "Setting up..." : "Confirm"}
              </button>
            </div>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="bg-[#141728] rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-[#00C853]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2 text-white">You&apos;re All Set!</h2>
            <p className="text-sm text-[#8B8FA3] font-medium mb-6">
              You&apos;re now {isDemo ? "demo " : ""}investing in <strong className="text-white">{strategy.name}</strong> with{" "}
              <strong className="text-white">${(finalAmount || 0).toLocaleString()}</strong> {isDemo ? "virtual " : ""}funds.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-white hover:bg-white/90 text-[#0B0E1C] font-medium py-3.5 rounded-full transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
