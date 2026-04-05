"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { copyApi } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Mock traders                                                       */
/* ------------------------------------------------------------------ */
const MOCK_TRADERS = [
  { name: "0xdE17f7144fbD0e...", match: 94, winRate: 64, pnl: "+$423k", profit: "+$726.7K", color: "#009D55" },
  { name: "0xa82afc3751a2E5...", match: 91, winRate: 80, tag: "Daily flow", profit: "+$124.0K", color: "#22c55e" },
  { name: "stingo43", match: 87, winRate: 79, pnl: "+$244k", profit: "+$305.0K", color: "#60a5fa" },
  { name: "0xbbc5zcZ96bne91...", match: 82, winRate: 71, pnl: "+$197k", profit: "+$121.8K", color: "#f59e0b" },
  { name: "0x2a2C53bD278c04...", match: 76, pnl: "+$1167k", tag: "Daily flow", profit: "", color: "#DC2626" },
];

/* ================================================================== */
/*  Reusable Option Card                                               */
/* ================================================================== */

function OptionCard({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl cursor-pointer transition-all ${
        selected
          ? "border-2 border-[#121212] bg-[#F7F7F7]"
          : "border border-black/5 bg-white"
      }`}
    >
      <div
        className={`text-sm font-semibold ${
          selected ? "text-[#121212]" : "text-[#121212]"
        }`}
      >
        {title}
      </div>
      <div className="text-xs text-[#9B9B9B] mt-1">
        {description}
      </div>
    </button>
  );
}

/* ================================================================== */
/*  Main Onboarding Page                                               */
/* ================================================================== */

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  /* Step 1 state */
  const [referralCode, setReferralCode] = useState("");

  /* Step 3 state */
  const [riskLevel, setRiskLevel] = useState(1);

  /* Step 4 state */
  const [categories, setCategories] = useState<Set<string>>(new Set(["Crypto"]));

  /* Step 5 state */
  const [tradingStyle, setTradingStyle] = useState(1);

  /* Step 6 state */
  const [activityLevel, setActivityLevel] = useState(1);

  /* Step 8 state */
  const [traders, setTraders] = useState<typeof MOCK_TRADERS>([]);

  /* Progress percentage per step */
  const progressMap: Record<number, number> = {
    1: 12,
    2: 25,
    3: 37,
    4: 50,
    5: 62,
    6: 75,
    7: 87,
    8: 100,
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  /* Step 7 auto-advance */
  useEffect(() => {
    if (step !== 7) return;
    const timer = setTimeout(async () => {
      try {
        const res = await copyApi.suggested();
        if (res.traders && res.traders.length > 0) {
          setTraders(res.traders);
        } else {
          setTraders(MOCK_TRADERS);
        }
      } catch {
        setTraders(MOCK_TRADERS);
      }
      setStep(8);
    }, 2500);
    return () => clearTimeout(timer);
  }, [step]);

  const handleCopy = async (traderName: string) => {
    try {
      await copyApi.addTarget(traderName);
    } catch {
      // ignore errors for now
    }
    router.push("/dashboard");
  };

  /* ---------------------------------------------------------------- */
  /*  RENDER                                                          */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#F7F7F7] text-[#121212]">
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[#F4F4F4] z-50">
        <div
          className="h-full bg-[#121212] transition-all duration-700 ease-in-out rounded-full"
          style={{ width: `${progressMap[step] ?? 0}%` }}
        />
      </div>

      {/* ============================================================ */}
      {/*  STEP 1: Referral Code                                       */}
      {/* ============================================================ */}
      {step === 1 && (
        <div className="flex flex-col min-h-screen px-6 items-center justify-center pt-12">
          <div className="max-w-[480px] w-full text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#121212] animate-fade-up">
              Got a referral code?
            </h1>

            <div className="animate-fade-up delay-2">
              <div className="w-8 h-[1px] bg-[#F4F4F4] mx-auto my-6" />
            </div>

            <p className="text-[#9B9B9B] text-sm text-center animate-fade-up delay-3">
              Enter below for 15% off all fees
            </p>

            <div className="mt-10 animate-fade-up delay-4">
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="ABC123"
                className="w-full bg-[#F7F7F7] border border-black/5 focus:border-[#121212] h-12 text-[#121212] text-center text-lg tracking-wider placeholder:text-[#9B9B9B] outline-none transition-colors rounded-full px-5"
              />

              <button
                onClick={() => {
                  // apply referral code logic
                }}
                className="text-[#121212] text-xs font-medium mt-3 transition-colors hover:text-[#656565] cursor-pointer"
              >
                Apply
              </button>
            </div>

            {/* Inline buttons */}
            <div className="mt-12">
              <button
                onClick={() => setStep(2)}
                className="w-full h-12 bg-[#121212] text-white text-sm font-medium rounded-full transition-all hover:bg-[#121212]/90"
              >
                Continue
              </button>
              <button
                onClick={() => setStep(2)}
                className="text-[#9B9B9B] text-xs font-medium mt-3 transition-colors hover:text-[#656565] cursor-pointer block mx-auto"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 2: Copy Trading Intro                                  */}
      {/* ============================================================ */}
      {step === 2 && (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 pt-12">
          <div className="max-w-[480px] w-full text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#121212] animate-fade-up">
              Copy top traders
            </h2>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#009D55] animate-fade-up delay-1">
              in one tap.
            </h2>

            <div className="animate-fade-up delay-2">
              <div className="w-8 h-[1px] bg-[#F4F4F4] mx-auto my-6" />
            </div>

            <p className="text-[#9B9B9B] text-sm text-center animate-fade-up delay-3">
              Thousands of top traders. We find the right one.
            </p>

            <button
              onClick={() => setStep(3)}
              className="w-full h-14 bg-[#121212] text-white text-sm font-medium rounded-full mt-12 animate-fade-up delay-4 transition-all hover:bg-[#121212]/90"
            >
              Start
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 3: Risk Tolerance                                      */}
      {/* ============================================================ */}
      {step === 3 && (
        <div className="flex flex-col min-h-screen px-6 items-center justify-center pt-12">
          <div className="max-w-[480px] w-full">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#121212]">
              What&apos;s your risk comfort?
            </h2>
            <p className="text-[#9B9B9B] text-sm mt-3">
              Choose your tolerance level
            </p>

            <div className="space-y-3 mt-6">
              <OptionCard
                selected={riskLevel === 0}
                onClick={() => setRiskLevel(0)}
                title="Steady Hands"
                description="High win rates, consistent returns. Less noise, more confidence."
              />
              <OptionCard
                selected={riskLevel === 1}
                onClick={() => setRiskLevel(1)}
                title="Balanced Edge"
                description="Proven track records with solid risk-reward. The sweet spot."
              />
              <OptionCard
                selected={riskLevel === 2}
                onClick={() => setRiskLevel(2)}
                title="High Conviction"
                description="Bold moves, bigger positions. Higher potential rewards."
              />
            </div>

            <button
              onClick={() => setStep(4)}
              className="w-full h-12 bg-[#121212] text-white text-sm font-medium rounded-full mt-8 transition-all hover:bg-[#121212]/90"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 4: Market Expertise                                    */}
      {/* ============================================================ */}
      {step === 4 && (
        <div className="flex flex-col min-h-screen px-6 items-center justify-center pt-12">
          <div className="max-w-[480px] w-full">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#121212]">
              Pick your markets
            </h2>
            <p className="text-[#9B9B9B] text-sm mt-3">
              Select one or more
            </p>

            <div className="grid grid-cols-2 gap-3 mt-6">
              {[
                "Crypto",
                "Politics",
                "Sports",
                "Culture",
                "Finance",
                "Weather",
              ].map((label) => (
                <button
                  key={label}
                  onClick={() => toggleCategory(label)}
                  className={`flex items-center justify-center h-12 rounded-full cursor-pointer transition-all text-sm font-medium ${
                    categories.has(label)
                      ? "border-2 border-[#121212] text-[#121212] bg-[#F7F7F7]"
                      : "border border-black/5 text-[#656565] bg-white hover:border-[#121212]/20"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(5)}
              className="w-full h-12 bg-[#121212] text-white text-sm font-medium rounded-full mt-8 transition-all hover:bg-[#121212]/90"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 5: Trading Style                                       */}
      {/* ============================================================ */}
      {step === 5 && (
        <div className="flex flex-col min-h-screen px-6 items-center justify-center pt-12">
          <div className="max-w-[480px] w-full">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#121212]">
              Trading style?
            </h2>
            <p className="text-[#9B9B9B] text-sm mt-3">
              Pick the one that resonates
            </p>

            <div className="space-y-3 mt-6">
              <OptionCard
                selected={tradingStyle === 0}
                onClick={() => setTradingStyle(0)}
                title="The Analyst"
                description="Enters early, holds with conviction. Patient, research-driven."
              />
              <OptionCard
                selected={tradingStyle === 1}
                onClick={() => setTradingStyle(1)}
                title="The Operator"
                description="Rides momentum with precision. In and out within hours to days."
              />
              <OptionCard
                selected={tradingStyle === 2}
                onClick={() => setTradingStyle(2)}
                title="The Machine"
                description="High-frequency, data-driven. Hundreds of micro-trades."
              />
            </div>

            <button
              onClick={() => setStep(6)}
              className="w-full h-12 bg-[#121212] text-white text-sm font-medium rounded-full mt-8 transition-all hover:bg-[#121212]/90"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 6: Activity Level                                      */}
      {/* ============================================================ */}
      {step === 6 && (
        <div className="flex flex-col min-h-screen px-6 items-center justify-center pt-12">
          <div className="max-w-[480px] w-full">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#121212]">
              How active?
            </h2>
            <p className="text-[#9B9B9B] text-sm mt-3">
              Match your availability
            </p>

            <div className="space-y-3 mt-6">
              <OptionCard
                selected={activityLevel === 0}
                onClick={() => setActivityLevel(0)}
                title="Set and Forget"
                description="A few trades per week. Low maintenance."
              />
              <OptionCard
                selected={activityLevel === 1}
                onClick={() => setActivityLevel(1)}
                title="Daily Flow"
                description="Multiple trades per day. Steady signals."
              />
              <OptionCard
                selected={activityLevel === 2}
                onClick={() => setActivityLevel(2)}
                title="Always On"
                description="Round the clock. Maximum activity, maximum opportunities."
              />
            </div>

            <button
              onClick={() => setStep(7)}
              className="w-full h-12 bg-[#121212] text-white text-sm font-medium rounded-full mt-8 transition-all hover:bg-[#121212]/90"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 7: Analyzing                                           */}
      {/* ============================================================ */}
      {step === 7 && (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 pt-12">
          <div className="w-8 h-8 border-2 border-[#F4F4F4] border-t-[#121212] rounded-full animate-spin mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-[#121212] animate-fade-up">
            Analyzing
          </h2>
          <p className="text-[#9B9B9B] text-sm mt-4 animate-fade-up delay-2">
            Scanning 1,500+ traders...
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 8: Top Matches                                         */}
      {/* ============================================================ */}
      {step === 8 && (
        <div className="flex flex-col min-h-screen px-6 items-center pt-12 pb-12">
          <div className="max-w-[480px] w-full">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#121212] animate-fade-up">
              Your matches
            </h2>

            <div className="animate-fade-up delay-1">
              <div className="w-8 h-[1px] bg-[#F4F4F4] my-6" />
            </div>

            <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto">
              {traders.map((trader, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-sm p-4 animate-fade-up transition-all hover:shadow-md"
                  style={{ animationDelay: `${0.2 + i * 0.1}s` }}
                >
                  {/* Top row: dot + name + match */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: (trader as any).color || "#009D55" }}
                    />
                    <span className="text-sm font-medium text-[#121212] truncate">
                      {trader.name}
                    </span>
                    <span className="text-[#009D55] text-sm font-semibold ml-auto flex-shrink-0">
                      {trader.match}%
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {trader.winRate && (
                      <span className="text-xs text-[#9B9B9B]">
                        {trader.winRate}% win
                      </span>
                    )}
                    {trader.pnl && (
                      <span className="text-xs text-[#9B9B9B]">
                        {trader.pnl}
                      </span>
                    )}
                    {trader.tag && (
                      <span className="text-xs text-[#9B9B9B]">
                        {trader.tag}
                      </span>
                    )}
                  </div>

                  {/* Copy button */}
                  <button
                    onClick={() => handleCopy(trader.name)}
                    className="w-full sm:w-auto bg-[#121212] text-white text-xs font-medium px-6 py-2.5 rounded-full mt-3 transition-all hover:bg-[#121212]/90"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>

            {/* Retake */}
            <div className="mt-8 text-center">
              <button
                onClick={() => setStep(3)}
                className="text-[#9B9B9B] text-sm font-medium transition-colors hover:text-[#656565] cursor-pointer"
              >
                Retake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
