"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, setToken } from "@/lib/api";

type AuthStep = "choose" | "email-form" | "verify-code" | "welcome" | "creating";

/* ───────────────────────── Chrome/Metallic P Logo ───────────────────────── */
function Logo({ size = 80 }: { size?: number }) {
  return (
    <div
      className="rounded-2xl flex items-center justify-center relative overflow-hidden"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(145deg, #1a1d2e 0%, #0f1219 100%)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <span
        className="font-black italic"
        style={{
          fontSize: size * 0.5,
          background:
            "linear-gradient(180deg, #ffffff 0%, #a0a0b0 50%, #ffffff 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
        }}
      >
        P
      </span>
    </div>
  );
}

/* ───────────────────────── Bottom Sheet Wrapper ───────────────────────── */
function BottomSheet({
  children,
  onBack,
  onClose,
}: {
  children: React.ReactNode;
  onBack?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Blurred backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="relative z-10 bg-[#141728] rounded-t-3xl border-t border-[rgba(255,255,255,0.06)] px-6 pt-5 pb-8 min-h-[60vh] flex flex-col animate-slide-up">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          {onBack ? (
            <button
              onClick={onBack}
              className="text-white/60 hover:text-white p-1 -ml-1 transition-colors"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <div className="w-6" />
          )}
          {onClose ? (
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white p-1 -mr-1 transition-colors"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <div className="w-6" />
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

/* ───────────────────────── OTP Input ───────────────────────── */
function OtpInput() {
  const [values, setValues] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...values];
    next[index] = val.slice(-1);
    setValues(next);
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-2.5">
      {values.map((v, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={v}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-12 h-14 bg-[#1E2235] border border-[rgba(255,255,255,0.08)] focus:border-white rounded-lg text-center text-white font-bold text-xl outline-none transition-colors"
        />
      ))}
    </div>
  );
}

/* ───────────────────────── Mesh Gradient Background ───────────────────────── */
function MeshGradientBg({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#080B16" }}>
      {/* Purple blob */}
      <div
        className="absolute"
        style={{
          width: "120vw",
          height: "120vw",
          top: "-20%",
          left: "-30%",
          background:
            "radial-gradient(circle, rgba(88,28,135,0.6) 0%, rgba(88,28,135,0.2) 40%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      {/* Teal blob */}
      <div
        className="absolute"
        style={{
          width: "100vw",
          height: "100vw",
          bottom: "-30%",
          right: "-20%",
          background:
            "radial-gradient(circle, rgba(13,148,136,0.5) 0%, rgba(13,148,136,0.15) 40%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      {/* Deep blue accent */}
      <div
        className="absolute"
        style={{
          width: "80vw",
          height: "80vw",
          top: "20%",
          right: "-10%",
          background:
            "radial-gradient(circle, rgba(30,58,138,0.4) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
      />
      <div className="relative z-10 min-h-screen flex flex-col">{children}</div>
    </div>
  );
}

/* ───────────────────────── Main Auth Content ───────────────────────── */
function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refFromUrl = searchParams.get("ref") || "";
  const [step, setStep] = useState<AuthStep>("choose");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState(refFromUrl);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* ── Wallet connect (X / Twitter button) ── */
  const connectWallet = useCallback(async () => {
    setError("");
    const eth = (window as any)?.ethereum;
    if (!eth) {
      setError("No wallet detected. Use email sign-in instead.");
      return;
    }

    setLoading(true);

    try {
      const accounts: string[] = await eth.request({
        method: "eth_requestAccounts",
      });
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

      // Success — go through welcome flow
      setStep("welcome");
    } catch (err: any) {
      const code = err?.code || err?.data?.code || 0;
      const msg = err?.message || "";
      let userMsg = "Connection failed. Please try again.";

      if (
        code === 4001 ||
        msg.includes("user-denied") ||
        msg.includes("User rejected") ||
        msg.includes("ACTION_REJECTED")
      ) {
        userMsg = "Connection cancelled. Try again or use email sign-in.";
      } else if (
        code === -32002 ||
        msg.includes("already pending") ||
        msg.includes("coalesce")
      ) {
        userMsg =
          "A wallet request is already pending. Please open your wallet and approve or reject the pending request.";
      } else if (msg.includes("No wallet") || msg.includes("accounts")) {
        userMsg = "Could not connect to wallet. Make sure it is unlocked.";
      }

      setError(userMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Magic link ── */
  const sendMagicLink = useCallback(async () => {
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
        setStep("welcome");
        return;
      }
      setStep("verify-code");
    } catch (err: any) {
      setError(err.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  }, [email]);

  /* ── Auto-advance: welcome -> creating -> redirect ── */
  useEffect(() => {
    if (step === "welcome") {
      const t = setTimeout(() => setStep("creating"), 2000);
      return () => clearTimeout(t);
    }
    if (step === "creating") {
      const t = setTimeout(() => router.push("/onboarding"), 2500);
      return () => clearTimeout(t);
    }
  }, [step, router]);

  /* ──────────── STEP: choose ──────────── */
  if (step === "choose") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-between px-6 py-12"
        style={{ background: "#080B16" }}
      >
        {/* Top content */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm w-full">
          <Logo size={80} />
          <h1 className="text-3xl font-bold text-white mt-8 mb-2">
            Welcome to Polycool
          </h1>
          <p className="text-[#6B7084] text-base mb-10">
            Sign in to start trading
          </p>

          {error && (
            <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-2xl mb-4 font-medium text-center">
              {error}
            </div>
          )}

          {/* Continue with X */}
          <button
            onClick={connectWallet}
            disabled={loading}
            className="w-full max-w-sm bg-white hover:bg-white/90 text-[#080B16] font-semibold py-4 rounded-full transition-all flex items-center justify-center gap-3 mb-3 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#080B16] border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            )}
            Continue with X
          </button>

          {/* Continue with Email */}
          <button
            onClick={() => {
              setError("");
              setStep("email-form");
            }}
            className="w-full max-w-sm bg-transparent text-white/70 hover:text-white font-medium py-4 rounded-full transition-all flex items-center justify-center gap-3"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            Continue with Email
          </button>

          {/* Login later */}
          <button
            onClick={() => router.push("/")}
            className="mt-6 text-[#4A4E63] hover:text-[#6B7084] text-sm font-medium transition-colors"
          >
            Login later
          </button>
        </div>

        {/* Footer */}
        <p className="text-[#4A4E63] text-xs text-center mt-8">
          By continuing, you agree to our{" "}
          <span className="text-white underline cursor-pointer">Terms</span> and{" "}
          <span className="text-white underline cursor-pointer">
            Privacy Policy
          </span>
        </p>
      </div>
    );
  }

  /* ──────────── STEP: email-form ──────────── */
  if (step === "email-form") {
    return (
      <div className="min-h-screen" style={{ background: "#080B16" }}>
        <BottomSheet
          onBack={() => {
            setError("");
            setStep("choose");
          }}
          onClose={() => {
            setError("");
            setStep("choose");
          }}
        >
          <div className="flex flex-col flex-1">
            {/* Envelope icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-[#1E2235] rounded-full flex items-center justify-center">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8B8FA3"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-2 text-center">
              Sign in with Email
            </h2>
            <p className="text-[#8B8FA3] text-sm mb-6 text-center">
              We&apos;ll send you a confirmation code to verify your identity.
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-2xl mb-4 font-medium text-center">
                {error}
              </div>
            )}

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
              className="w-full bg-[#1E2235] border border-[rgba(255,255,255,0.08)] rounded-xl px-5 py-4 text-white placeholder-[#4A4E63] outline-none focus:border-white/20 transition-colors mb-4 text-base"
            />

            <button
              onClick={sendMagicLink}
              disabled={loading}
              className="w-full bg-white hover:bg-white/90 text-[#080B16] font-semibold py-4 rounded-full transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#080B16] border-t-transparent rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                "Continue"
              )}
            </button>

            {/* Privy badge */}
            <div className="mt-auto pt-8 flex justify-center">
              <p className="text-[#4A4E63] text-xs flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Protected by privy
              </p>
            </div>
          </div>
        </BottomSheet>
      </div>
    );
  }

  /* ──────────── STEP: verify-code ──────────── */
  if (step === "verify-code") {
    return (
      <div className="min-h-screen" style={{ background: "#080B16" }}>
        <BottomSheet
          onBack={() => {
            setError("");
            setStep("email-form");
          }}
          onClose={() => {
            setError("");
            setStep("choose");
          }}
        >
          <div className="flex flex-col items-center flex-1">
            {/* Envelope icon */}
            <div className="w-16 h-16 bg-[#1E2235] rounded-full flex items-center justify-center mb-6">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-white mb-2 text-center">
              Enter confirmation code
            </h2>
            <p className="text-[#8B8FA3] text-sm text-center mb-8 max-w-xs">
              Please check{" "}
              <strong className="text-white">{email}</strong> for an email
              from privy.io and enter your code below.
            </p>

            <OtpInput />

            <p className="text-[#8B8FA3] text-sm mt-8">
              Didn&apos;t get an email?{" "}
              <button
                onClick={sendMagicLink}
                className="text-[#3B82F6] hover:text-[#60A5FA] font-medium transition-colors"
              >
                Resend code
              </button>
            </p>

            {/* Privy badge */}
            <div className="mt-auto pt-8">
              <p className="text-[#4A4E63] text-xs flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Protected by privy
              </p>
            </div>
          </div>
        </BottomSheet>
      </div>
    );
  }

  /* ──────────── STEP: welcome ──────────── */
  if (step === "welcome") {
    return (
      <MeshGradientBg>
        {/* Logo centered */}
        <div className="flex-1 flex items-center justify-center">
          <Logo size={100} />
        </div>

        {/* Bottom overlay card */}
        <div className="flex justify-center pb-12 px-6">
          <div className="w-full max-w-sm bg-[#141728]/90 border border-[rgba(255,255,255,0.08)] rounded-3xl p-8 relative backdrop-blur-sm">
            {/* Close button */}
            <button className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="flex flex-col items-center text-center">
              {/* Green checkmark circle */}
              <div className="w-14 h-14 bg-[#00C853] rounded-full flex items-center justify-center mb-5">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome to polycool
              </h2>
              <p className="text-[#8B8FA3] text-sm">
                You&apos;ve successfully created an account.
              </p>

              {/* Privy badge */}
              <div className="mt-6">
                <p className="text-[#4A4E63] text-xs flex items-center gap-1.5">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Protected by privy
                </p>
              </div>
            </div>
          </div>
        </div>
      </MeshGradientBg>
    );
  }

  /* ──────────── STEP: creating ──────────── */
  if (step === "creating") {
    return (
      <MeshGradientBg>
        {/* Logo centered */}
        <div className="flex-1 flex items-center justify-center">
          <Logo size={100} />
        </div>

        {/* Bottom text area */}
        <div className="w-full max-w-sm mx-auto px-6 pb-12">
          <h2 className="text-2xl font-bold text-white mb-5 text-left">
            Trade smarter on Polycool
          </h2>

          {/* Loading pill */}
          <div className="bg-[#1E2235]/80 rounded-full py-4 px-6 flex items-center gap-3 mb-6 opacity-70">
            <div className="w-5 h-5 border-2 border-[#8B8FA3] border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-[#8B8FA3] text-sm font-medium">
              Creating your account...
            </span>
          </div>

          <p className="text-[#4A4E63] text-xs leading-relaxed mb-2">
            By clicking Discover Polycool, you accept the{" "}
            <span className="text-white underline cursor-pointer">
              Terms and Conditions
            </span>{" "}
            and{" "}
            <span className="text-white underline cursor-pointer">
              Privacy Policy
            </span>
            .
          </p>
          <p className="text-[#4A4E63] text-xs">
            Not financial advice. Trade responsibly.
          </p>
        </div>
      </MeshGradientBg>
    );
  }

  return null;
}

/* ───────────────────────── Page Export ───────────────────────── */
export default function AuthPage() {
  return (
    <>
      {/* Slide-up animation for bottom sheets */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
      <Suspense fallback={<div className="min-h-screen" style={{ background: "#080B16" }} />}>
        <AuthContent />
      </Suspense>
    </>
  );
}
