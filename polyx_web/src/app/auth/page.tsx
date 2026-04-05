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
    <div className="min-h-screen bg-white flex items-center justify-center px-5">
      <div className="w-full max-w-[360px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-10 h-10 rounded-xl bg-[#0F0F0F] flex items-center justify-center font-bold text-lg text-white mb-3">
            P
          </div>
          <span className="text-xl font-semibold text-[#0F0F0F]">Polycool</span>
        </div>

        {step === "choose" && (
          <>
            <h1 className="text-2xl font-bold -tracking-[0.02em] text-[#0F0F0F] mb-1">Welcome back</h1>
            <p className="text-sm text-[#6B7280] mb-8">Sign in to continue</p>

            {error && (
              <div className="bg-[#FEF2F2] text-[#EF4444] text-sm p-3 rounded-xl mb-4">{error}</div>
            )}

            <button
              onClick={connectWallet}
              disabled={loading}
              className="w-full h-11 border border-black/[0.08] text-[#0F0F0F] font-semibold text-sm rounded-xl transition-all duration-150 flex items-center justify-center gap-2.5 hover:bg-[#F5F5F5]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
              </svg>
              Connect Wallet
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-black/[0.04]" />
              <span className="text-xs text-[#9CA3AF]">or</span>
              <div className="flex-1 h-px bg-black/[0.04]" />
            </div>

            <button
              onClick={() => setStep("magic-form")}
              className="w-full h-11 bg-[#0F0F0F] hover:bg-[#262626] text-white font-semibold text-sm rounded-xl transition-all duration-150 flex items-center justify-center gap-2.5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              Continue with Email
            </button>
          </>
        )}

        {step === "wallet-connecting" && (
          <div className="text-center py-8">
            <div className="w-10 h-10 border-2 border-[#0F0F0F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="font-semibold text-[#0F0F0F] mb-1">Connecting...</h2>
            <p className="text-sm text-[#6B7280]">
              Approve the connection in your wallet
            </p>
          </div>
        )}

        {step === "magic-form" && (
          <>
            <button
              onClick={() => setStep("choose")}
              className="text-[#6B7280] hover:text-[#0F0F0F] text-sm mb-6 flex items-center gap-1.5 transition-colors duration-150"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
            <h1 className="text-lg font-semibold text-[#0F0F0F] mb-4">Enter your email</h1>

            {error && (
              <div className="bg-[#FEF2F2] text-[#EF4444] text-sm p-3 rounded-xl mb-4">{error}</div>
            )}

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
              className="w-full h-11 bg-[#F5F5F5] border-0 rounded-xl px-4 text-[#0F0F0F] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-black/10 transition-all duration-150 mb-3"
            />
            <button
              onClick={sendMagicLink}
              disabled={loading}
              className="w-full h-11 bg-[#0F0F0F] hover:bg-[#262626] text-white font-semibold text-sm rounded-xl transition-all duration-150 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Continue"}
            </button>
          </>
        )}

        {step === "magic-sent" && (
          <div className="text-center">
            <button
              onClick={() => setStep("magic-form")}
              className="text-[#6B7280] hover:text-[#0F0F0F] text-sm mb-6 flex items-center gap-1.5 transition-colors duration-150 mx-auto"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>

            <h2 className="text-lg font-semibold text-[#0F0F0F] mb-1">Check your email</h2>
            <p className="text-sm text-[#6B7280] mb-8">
              We sent a code to <span className="text-[#0F0F0F] font-medium">{email}</span>
            </p>

            {/* OTP input */}
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
                  className="w-12 h-12 text-center text-lg font-semibold text-[#0F0F0F] bg-[#F5F5F5] border-0 rounded-xl outline-none focus:ring-2 focus:ring-black/10 transition-all duration-150"
                />
              ))}
            </div>

            <button onClick={() => setStep("magic-form")} className="text-[#6B7280] text-sm hover:text-[#0F0F0F] transition-colors duration-150">
              Didn&apos;t receive it? Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <AuthContent />
    </Suspense>
  );
}
