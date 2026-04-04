"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, setToken } from "@/lib/api";
import { BrowserProvider } from "ethers";

type AuthStep = "choose" | "wallet-connecting" | "magic-form" | "magic-sent";

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>("choose");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function connectWallet() {
    setError("");
    if (typeof window === "undefined" || !(window as any).ethereum) {
      // No MetaMask — suggest magic link
      setError("No wallet detected. Use email sign-in instead.");
      return;
    }

    setStep("wallet-connecting");
    setLoading(true);

    try {
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // Get nonce
      const { nonce } = await authApi.nonce(address);

      // Sign the nonce
      const signature = await signer.signMessage(nonce);

      // Verify and get JWT
      const { token, user } = await authApi.verify(address, signature);
      setToken(token);

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Connection failed");
      setStep("choose");
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

      // Dev mode: auto-verify with dev_token
      if (res.dev_token) {
        const { token } = await authApi.magicVerify(res.dev_token);
        setToken(token);
        router.push("/dashboard");
        return;
      }

      setStep("magic-sent");
    } catch (err: any) {
      setError(err.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-10">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center font-bold text-lg text-white">X</div>
          <span className="font-display text-2xl font-semibold text-white">PolyX</span>
        </Link>

        <div className="bg-bg-card border border-border rounded-2xl p-8">
          {step === "choose" && (
            <>
              <h1 className="text-xl font-semibold text-center mb-2">Get Started</h1>
              <p className="text-sm text-text-secondary text-center mb-8">
                Connect your wallet or sign in with email to start copy trading.
              </p>

              {error && (
                <div className="bg-red/10 border border-red/20 text-red text-sm p-3 rounded-xl mb-4">
                  {error}
                </div>
              )}

              {/* Wallet Connect */}
              <button
                onClick={connectWallet}
                disabled={loading}
                className="w-full bg-bg-secondary border border-border hover:border-border-hover text-white font-medium py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 mb-3"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
                </svg>
                Connect Wallet (MetaMask)
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-text-muted uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Magic Link */}
              <button
                onClick={() => setStep("magic-form")}
                className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3.5 rounded-xl transition-all flex items-center justify-center gap-3"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                Sign in with Email
              </button>

              <p className="text-xs text-text-muted text-center mt-6">
                No wallet? No problem. We&apos;ll create a secure trading wallet for you.
              </p>
            </>
          )}

          {step === "wallet-connecting" && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="font-semibold mb-2">Connecting Wallet</h2>
              <p className="text-sm text-text-secondary">
                Please approve the connection and sign the message in your wallet...
              </p>
            </div>
          )}

          {step === "magic-form" && (
            <>
              <button onClick={() => setStep("choose")} className="text-text-muted hover:text-white text-sm mb-4 flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back
              </button>
              <h1 className="text-xl font-semibold mb-2">Sign in with Email</h1>
              <p className="text-sm text-text-secondary mb-6">
                Enter your email and we&apos;ll create a secure wallet for you.
              </p>

              {error && (
                <div className="bg-red/10 border border-red/20 text-red text-sm p-3 rounded-xl mb-4">
                  {error}
                </div>
              )}

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
            </>
          )}

          {step === "magic-sent" && (
            <div className="text-center py-4">
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
        </div>
      </div>
    </div>
  );
}
