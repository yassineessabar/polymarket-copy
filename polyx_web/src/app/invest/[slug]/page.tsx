"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { STRATEGIES } from "@/lib/strategies";
import { authApi, setToken, userApi, copyApi, isLoggedIn } from "@/lib/api";
import { BrowserProvider } from "ethers";

type Step = "auth" | "wallet-connecting" | "magic-form" | "magic-sent" | "amount" | "confirm" | "success";

const PRESET_AMOUNTS = [100, 500, 1000, 5000];

export default function InvestPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const strategy = STRATEGIES[slug];
  const isDemo = searchParams.get("demo") === "1";

  const [step, setStep] = useState<Step>(isLoggedIn() ? "amount" : "auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState("");
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);

  if (!strategy) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">404</div>
          <h1 className="text-xl font-semibold mb-2">Strategy Not Found</h1>
          <Link href="/" className="text-accent hover:underline text-sm">Back to Home</Link>
        </div>
      </div>
    );
  }

  async function connectWallet() {
    setError("");
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setError("No wallet detected. Use email sign-in instead.");
      setHasWallet(null);
      return;
    }

    setStep("wallet-connecting");
    setLoading(true);

    try {
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const { nonce } = await authApi.nonce(address);
      const signature = await signer.signMessage(nonce);
      const { token } = await authApi.verify(address, signature);
      setToken(token);
      setStep("amount");
    } catch (err: any) {
      setError(err.message || "Connection failed");
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
      // Set demo mode + balance
      await userApi.updateSettings({
        demo_mode: isDemo ? 1 : 0,
        demo_balance: amount,
      });

      // Add strategy target
      await copyApi.addTarget(strategy.wallet, strategy.name);

      // Start copy trading
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
    <div className="min-h-screen bg-bg-primary text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[rgba(14,15,17,0.85)] border-b border-border">
        <div className="max-w-[500px] mx-auto flex items-center justify-between h-[56px] px-4">
          <Link href={`/strategy/${slug}`} className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span className="text-sm">Back</span>
          </Link>
          <span className="text-sm font-medium">
            {isDemo ? "Demo" : "Invest"} in {strategy.name}
          </span>
          <div className="w-12" />
        </div>
      </nav>

      <div className="max-w-[500px] mx-auto px-4 py-8 sm:py-12">
        {/* Strategy header */}
        <div className="flex items-center gap-3 mb-8 bg-bg-card border border-border rounded-2xl p-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${strategy.gradient} flex items-center justify-center text-2xl`}>
            {strategy.emoji}
          </div>
          <div>
            <div className="font-semibold text-sm">{strategy.name}</div>
            <div className="text-xs text-text-muted">+{strategy.returnPct}% all time &middot; {strategy.winRate}% win rate</div>
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
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                  i <= stepIndex ? "bg-accent text-white" : "bg-bg-secondary text-text-muted border border-border"
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs ${i <= stepIndex ? "text-white" : "text-text-muted"} hidden sm:block`}>{label}</span>
                {i < 2 && <div className="w-8 sm:w-12 h-px bg-border" />}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="bg-red/10 border border-red/20 text-red text-sm p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Step 1: Auth — Do you have a wallet? */}
        {step === "auth" && hasWallet === null && (
          <div className="bg-bg-card border border-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-semibold text-center mb-2">Do you have a Crypto Wallet?</h2>
            <p className="text-sm text-text-secondary text-center mb-8">
              If you have MetaMask or another wallet, connect it. Otherwise, sign in with email.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setHasWallet(true);
                  connectWallet();
                }}
                className="w-full bg-bg-secondary border border-border hover:border-border-hover text-white font-medium py-3.5 rounded-xl transition-all flex items-center justify-center gap-3"
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
                className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3.5 rounded-xl transition-all flex items-center justify-center gap-3"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                No, Use Email Instead
              </button>
            </div>
          </div>
        )}

        {step === "wallet-connecting" && (
          <div className="bg-bg-card border border-border rounded-2xl p-8 text-center">
            <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="font-semibold mb-2">Connecting Wallet</h2>
            <p className="text-sm text-text-secondary">
              Approve the connection and sign the message in your wallet...
            </p>
          </div>
        )}

        {step === "magic-form" && (
          <div className="bg-bg-card border border-border rounded-2xl p-6 sm:p-8">
            <button onClick={() => { setStep("auth"); setHasWallet(null); }} className="text-text-muted hover:text-white text-sm mb-4 flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
            <h2 className="text-lg font-semibold mb-2">Sign in with Email</h2>
            <p className="text-sm text-text-secondary mb-6">
              We&apos;ll create a secure trading wallet for you automatically.
            </p>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
              className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-white placeholder-text-muted outline-none focus:border-accent transition-colors mb-4"
            />
            <button
              onClick={sendMagicLink}
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3.5 rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Continue"}
            </button>
          </div>
        )}

        {step === "magic-sent" && (
          <div className="bg-bg-card border border-border rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">&#x2709;&#xFE0F;</div>
            <h2 className="font-semibold mb-2">Check Your Email</h2>
            <p className="text-sm text-text-secondary mb-6">
              We sent a sign-in link to <strong className="text-white">{email}</strong>
            </p>
            <button onClick={() => setStep("magic-form")} className="text-accent text-sm hover:underline">
              Didn&apos;t receive it? Try again
            </button>
          </div>
        )}

        {/* Step 2: Choose Amount */}
        {step === "amount" && (
          <div className="bg-bg-card border border-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-semibold text-center mb-2">Choose Amount</h2>
            <p className="text-sm text-text-secondary text-center mb-8">
              {isDemo
                ? "How much virtual funds do you want to start with?"
                : "How much do you want to invest?"}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {PRESET_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => { setAmount(a); setCustomAmount(""); }}
                  className={`py-3 rounded-xl text-sm font-semibold font-mono transition-all ${
                    amount === a && !customAmount
                      ? "bg-accent text-white"
                      : "bg-bg-secondary border border-border text-white hover:border-border-hover"
                  }`}
                >
                  ${a.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">$</span>
              <input
                type="number"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded-xl pl-8 pr-4 py-3 text-white placeholder-text-muted outline-none focus:border-accent transition-colors"
              />
            </div>

            <button
              onClick={() => setStep("confirm")}
              disabled={!finalAmount || finalAmount < 1}
              className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3.5 rounded-xl transition-all disabled:opacity-50"
            >
              Continue with ${(finalAmount || 0).toLocaleString()}
            </button>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && (
          <div className="bg-bg-card border border-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-semibold text-center mb-6">Confirm Investment</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-text-secondary">Strategy</span>
                <span className="text-sm font-medium">{strategy.emoji} {strategy.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-text-secondary">Amount</span>
                <span className="text-sm font-medium font-mono">${(finalAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-text-secondary">Mode</span>
                <span className={`text-sm font-medium ${isDemo ? "text-accent" : "text-green"}`}>
                  {isDemo ? "Demo (Virtual)" : "Live Trading"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-text-secondary">Win Rate</span>
                <span className="text-sm font-medium text-green">{strategy.winRate}%</span>
              </div>
            </div>

            {isDemo && (
              <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 mb-6">
                <p className="text-xs text-accent">
                  Demo mode uses virtual funds. No real money at risk. You can switch to live trading anytime.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("amount")}
                className="flex-1 bg-bg-secondary border border-border hover:border-border-hover text-white font-medium py-3 rounded-xl transition-all text-sm"
              >
                Back
              </button>
              <button
                onClick={confirmInvest}
                disabled={loading}
                className="flex-1 bg-accent hover:bg-accent-hover text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 text-sm"
              >
                {loading ? "Setting up..." : "Confirm"}
              </button>
            </div>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="bg-bg-card border border-border rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">You&apos;re All Set!</h2>
            <p className="text-sm text-text-secondary mb-6">
              You&apos;re now {isDemo ? "demo " : ""}investing in <strong className="text-white">{strategy.name}</strong> with{" "}
              <strong className="text-white">${(finalAmount || 0).toLocaleString()}</strong> {isDemo ? "virtual " : ""}funds.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3.5 rounded-xl transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
