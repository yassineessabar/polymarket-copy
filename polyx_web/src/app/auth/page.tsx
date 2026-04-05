"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi, copyApi, setToken } from "@/lib/api";

type AuthStep = "choose" | "wallet-connecting" | "magic-form" | "magic-sent" | "otp";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refFromUrl = searchParams.get("ref") || "";
  const [step, setStep] = useState<AuthStep>("choose");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState(refFromUrl);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);

  async function connectWallet() {
    setError("");
    const eth = (window as any)?.ethereum;
    if (!eth) {
      setError("No wallet detected. Use email sign-in instead.");
      return;
    }

    setStep("wallet-connecting");
    setLoading(true);

    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned");
      }
      const address = accounts[0];

      const { nonce } = await authApi.nonce(address);

      const signature: string = await eth.request({
        method: "personal_sign",
        params: [nonce, address],
      });

      const { token } = await authApi.verify(address, signature);
      setToken(token);
      try {
        const { targets } = await copyApi.targets();
        router.push(targets && targets.length > 0 ? "/dashboard" : "/onboarding");
      } catch {
        router.push("/onboarding");
      }
    } catch (err: any) {
      const code = err?.code || err?.data?.code || 0;
      const msg = err?.message || "";
      let userMsg = "Connection failed. Please try again.";

      if (code === 4001 || msg.includes("user-denied") || msg.includes("User rejected") || msg.includes("ACTION_REJECTED")) {
        userMsg = "Connection cancelled. Try again or use email sign-in.";
      } else if (code === -32002 || msg.includes("already pending") || msg.includes("coalesce")) {
        userMsg = "A wallet request is already pending. Please open your wallet and approve or reject the pending request.";
      } else if (msg.includes("No wallet") || msg.includes("accounts")) {
        userMsg = "Could not connect to wallet. Make sure it is unlocked.";
      }

      setError(userMsg);
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
      if (res.dev_token) {
        const { token } = await authApi.magicVerify(res.dev_token);
        setToken(token);
        try {
          const { targets } = await copyApi.targets();
          router.push(targets && targets.length > 0 ? "/dashboard" : "/onboarding");
        } catch {
          router.push("/onboarding");
        }
        return;
      }
      setStep("magic-sent");
    } catch (err: any) {
      setError(err.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newValues = [...otpValues];
    newValues[index] = value;
    setOtpValues(newValues);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center px-5">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 justify-center mb-10">
          <div className="w-10 h-10 rounded-full bg-[#121212] flex items-center justify-center font-bold text-lg text-white">P</div>
          <span className="text-2xl font-bold text-[#121212]">Polycool</span>
        </Link>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
          {step === "choose" && (
            <>
              <h1 className="text-xl font-bold text-center mb-2 text-[#121212]">Sign In</h1>
              <p className="text-sm text-[#9B9B9B] font-medium text-center mb-8">
                Connect your wallet or sign in with email
              </p>

              {error && (
                <div className="bg-[#DC2626]/5 border border-[#DC2626]/10 text-[#DC2626] text-sm p-3 rounded-2xl mb-4 font-medium">{error}</div>
              )}

              <button
                onClick={connectWallet}
                disabled={loading}
                className="w-full border border-[#121212] text-[#121212] font-medium py-3.5 rounded-full transition-all flex items-center justify-center gap-3 mb-3 hover:bg-[#F7F7F7]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
                </svg>
                Connect Wallet
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-black/5" />
                <span className="text-xs text-[#9B9B9B] uppercase tracking-wider font-medium">or</span>
                <div className="flex-1 h-px bg-black/5" />
              </div>

              <button
                onClick={() => setStep("magic-form")}
                className="w-full bg-[#121212] hover:bg-[#333] text-white font-medium py-3.5 rounded-full transition-all flex items-center justify-center gap-3"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                Sign in with Email
              </button>
            </>
          )}

          {step === "wallet-connecting" && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-2 border-[#121212] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="font-bold mb-2 text-[#121212]">Connecting Wallet</h2>
              <p className="text-sm text-[#9B9B9B] font-medium">
                Approve the connection and sign the message...
              </p>
            </div>
          )}

          {step === "magic-form" && (
            <>
              <button onClick={() => setStep("choose")} className="text-[#9B9B9B] hover:text-[#121212] text-sm mb-4 flex items-center gap-1 font-medium">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back
              </button>
              <h1 className="text-xl font-bold mb-2 text-[#121212]">Sign in with Email</h1>
              <p className="text-sm text-[#9B9B9B] font-medium mb-6">
                We&apos;ll create a secure wallet for you automatically.
              </p>

              {error && (
                <div className="bg-[#DC2626]/5 border border-[#DC2626]/10 text-[#DC2626] text-sm p-3 rounded-2xl mb-4 font-medium">{error}</div>
              )}

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
                className="w-full bg-[#F7F7F7] border border-black/5 rounded-full px-5 py-3 text-[#121212] placeholder-[#BFBFBF] outline-none focus:border-[#121212] transition-colors mb-4"
              />
              <button
                onClick={sendMagicLink}
                disabled={loading}
                className="w-full bg-[#121212] hover:bg-[#333] text-white font-medium py-3.5 rounded-full transition-all disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Continue"}
              </button>
            </>
          )}

          {step === "magic-sent" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-[#F7F7F7] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <h2 className="font-bold mb-2 text-[#121212]">Check Your Email</h2>
              <p className="text-sm text-[#9B9B9B] font-medium mb-6">
                We sent a sign-in link to <strong className="text-[#121212]">{email}</strong>
              </p>

              {/* OTP input */}
              <p className="text-sm text-[#656565] font-medium mb-4">Or enter your 6-digit code</p>
              <div className="flex gap-2 justify-center mb-6">
                {otpValues.map((val, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-12 text-center text-lg font-bold text-[#121212] bg-[#F7F7F7] border border-black/5 rounded-xl outline-none focus:border-[#121212] transition-colors"
                  />
                ))}
              </div>

              <button onClick={() => setStep("magic-form")} className="text-[#121212] text-sm font-medium underline">
                Didn&apos;t receive it? Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F7F7]" />}>
      <AuthContent />
    </Suspense>
  );
}
