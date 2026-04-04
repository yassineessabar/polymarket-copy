"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { copyApi } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Gradient pairs for avatars                                        */
/* ------------------------------------------------------------------ */
const GRADIENT_PAIRS = [
  ["#3B5BFE", "#6C5CE7"],
  ["#00C853", "#3B5BFE"],
  ["#FF6B6B", "#FFC107"],
  ["#6C5CE7", "#E040FB"],
  ["#00BCD4", "#00C853"],
];

/* ------------------------------------------------------------------ */
/*  Mock traders                                                      */
/* ------------------------------------------------------------------ */
const MOCK_TRADERS = [
  { name: "0xdE17f7144fbD0e...", match: 65, winRate: 64, pnl: "+$423k", profit: "+$726.7K" },
  { name: "0xa82afc3751a2E5...", match: 65, winRate: 80, tag: "Daily flow", profit: "+$124.0K" },
  { name: "stingo43", match: 65, winRate: 79, pnl: "+$244k", profit: "+$305.0K" },
  { name: "0xbbc5zcZ96bne91...", match: 65, winRate: 71, pnl: "+$197k", profit: "+$121.8K" },
  { name: "0x2a2C53bD278c04...", match: 56, pnl: "+$1167k", tag: "Daily flow", profit: "" },
];

/* ================================================================== */
/*  Inline SVG Icons                                                  */
/* ================================================================== */

function BackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function CloseX() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B5BFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18" />
      <path d="M1 7l5 5-5 5" />
      <path d="M23 7l-5 5 5 5" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c-4.97 0-9-2.69-9-6 0-3.5 3-6.5 4-8 .5 2.5 2 4.5 4 6 1-2.5 2-5 1-7 3 1.5 6 5 6 10 0 3.31-2.69 6-6 6z" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.5 4.5-3 6l-1 1.5V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-3.5L8 15c-1.5-1.5-3-3.5-3-6a7 7 0 0 1 7-7z" />
      <line x1="9" y1="18" x2="15" y2="18" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B5BFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFC107" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B8FA3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B5BFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFC107" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
    </svg>
  );
}

/* ================================================================== */
/*  Reusable Components                                               */
/* ================================================================== */

function OptionCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
        selected
          ? "border-2 border-[#6C5CE7] bg-[#6C5CE7]/10"
          : "border-2 border-transparent bg-[#141728] hover:bg-[#1A1F35]"
      }`}
    >
      <div className="w-10 h-10 rounded-xl bg-[#1E2235] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-bold text-white text-sm">{title}</div>
        <div className="text-sm text-[#8B8FA3] mt-0.5">{description}</div>
      </div>
    </button>
  );
}

function ModalCard({
  children,
  onClose,
  progress,
}: {
  children: React.ReactNode;
  onClose?: () => void;
  progress: number;
}) {
  return (
    <div className="fixed inset-0 bg-[#080B16]/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-[#1C1F2E] rounded-3xl max-w-md w-full p-6 md:p-8 relative">
        {/* Internal progress bar */}
        <div className="w-full h-1 bg-[#141728] rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#3B5BFE] to-[#6C5CE7] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#5A5F7A] hover:text-white transition-colors"
          >
            <CloseX />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

function ContinueButton({ onClick, label = "Continue" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white text-[#0B0E1C] font-semibold rounded-full py-4 mt-6 hover:bg-gray-100 transition-colors"
    >
      {label}
    </button>
  );
}

/* ================================================================== */
/*  Main Onboarding Page                                              */
/* ================================================================== */

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  /* Step 1 state */
  const [referralCode, setReferralCode] = useState("");

  /* Step 3 state */
  const [riskLevel, setRiskLevel] = useState(1); // 0=steady, 1=balanced, 2=high

  /* Step 4 state */
  const [categories, setCategories] = useState<Set<string>>(new Set(["Crypto"]));

  /* Step 5 state */
  const [tradingStyle, setTradingStyle] = useState(1); // 0=analyst, 1=operator, 2=machine

  /* Step 6 state */
  const [activityLevel, setActivityLevel] = useState(1); // 0=set&forget, 1=daily, 2=always

  /* Step 8 state */
  const [traders, setTraders] = useState<typeof MOCK_TRADERS>([]);

  /* Progress bar percentage per step */
  const progressMap: Record<number, number> = {
    1: 40,
    2: 100,
    3: 25,
    4: 50,
    5: 75,
    6: 90,
    7: 95,
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
    <div className="min-h-screen bg-[#080B16] text-white relative">
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[#141728] z-[60]">
        <div
          className="h-full bg-[#3B5BFE] transition-all duration-700 ease-in-out"
          style={{ width: `${progressMap[step] ?? 0}%` }}
        />
      </div>

      {/* ============================================================ */}
      {/*  STEP 1: Referral Code                                       */}
      {/* ============================================================ */}
      {step === 1 && (
        <div className="flex flex-col min-h-screen px-6 pt-24">
          <div className="max-w-md w-full">
            <h1 className="text-2xl font-bold text-white mb-3 text-left">Got a referral code?</h1>
            <p className="text-[#8B8FA3] mb-8 text-left">
              Enter it below to get{" "}
              <span className="text-[#3B5BFE] font-medium">15% off</span> on all your trading fees.
            </p>

            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="e.g.  ABC123"
              className="w-full bg-[#1E2235] text-white placeholder-[#5A5F7A] rounded-xl h-14 px-4 font-mono focus:outline-none focus:ring-2 focus:ring-[#3B5BFE]/50 transition-all"
            />

            <button
              onClick={() => {
                // apply referral code logic
              }}
              className="text-[#3B5BFE] text-sm mt-3 hover:underline"
            >
              Apply code
            </button>
          </div>

          <div className="fixed bottom-8 left-0 right-0 flex flex-col items-center px-6">
            <button
              onClick={() => setStep(2)}
              className="w-full max-w-md bg-white text-black font-semibold rounded-full py-4 hover:bg-gray-100 transition-colors"
            >
              Continue
            </button>
            <button
              onClick={() => setStep(2)}
              className="text-[#5A5F7A] text-sm mt-3 hover:text-[#8B8FA3] transition-colors"
            >
              I don&apos;t have a code
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 2: Copy Trading Intro                                  */}
      {/* ============================================================ */}
      {step === 2 && (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 relative overflow-hidden">
          {/* Back arrow */}
          <button
            onClick={() => setStep(1)}
            className="absolute top-6 left-6 text-[#8B8FA3] hover:text-white transition-colors z-10"
          >
            <BackArrow />
          </button>

          {/* Decorative blurred circles */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-3xl opacity-20" />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-gradient-to-br from-pink-500 to-orange-400 rounded-full blur-3xl opacity-20" />
          <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-gradient-to-br from-green-400 to-cyan-500 rounded-full blur-3xl opacity-20" />

          <div className="max-w-md w-full text-center z-10">
            <p className="text-[#8B8FA3] mb-4 text-sm">
              Thousands of top traders, finding the right one is difficult.
            </p>
            <h2 className="text-xl font-bold text-white mb-10">Copy top traders in one tap.</h2>

            {/* Rainbow gradient border card */}
            <div className="p-[2px] rounded-2xl bg-gradient-to-r from-[#3B5BFE] via-[#9B59B6] via-[#E91E63] to-[#00C853]">
              <button
                onClick={() => setStep(3)}
                className="w-full bg-[#141728] rounded-2xl p-5 flex items-center gap-3 hover:bg-[#1A1F35] transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-[#1E2235] flex items-center justify-center flex-shrink-0">
                  <SparkleIcon />
                </div>
                <span className="text-white font-bold">Start copy trading</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 3: Risk Tolerance                                      */}
      {/* ============================================================ */}
      {step === 3 && (
        <ModalCard onClose={() => setStep(2)} progress={25}>
          <h2 className="text-xl font-bold text-white mb-1">What&apos;s your risk comfort?</h2>
          <p className="text-sm text-[#8B8FA3] mb-5">Choose your tolerance level</p>

          <div className="space-y-3">
            <OptionCard
              selected={riskLevel === 0}
              onClick={() => setRiskLevel(0)}
              icon={<ShieldIcon />}
              title="Steady Hands"
              description="High win rates, consistent returns. Less noise, more confidence."
            />
            <OptionCard
              selected={riskLevel === 1}
              onClick={() => setRiskLevel(1)}
              icon={<ScaleIcon />}
              title="Balanced Edge"
              description="Proven track records with solid risk-reward. The sweet spot."
            />
            <OptionCard
              selected={riskLevel === 2}
              onClick={() => setRiskLevel(2)}
              icon={<FlameIcon />}
              title="High Conviction"
              description="Bold moves, bigger positions. Higher potential rewards."
            />
          </div>

          <ContinueButton onClick={() => setStep(4)} />
        </ModalCard>
      )}

      {/* ============================================================ */}
      {/*  STEP 4: Market Expertise                                    */}
      {/* ============================================================ */}
      {step === 4 && (
        <ModalCard onClose={() => setStep(2)} progress={50}>
          <h2 className="text-lg font-bold text-white mb-1">
            What do you want your top traders to be an expert on?
          </h2>
          <p className="text-sm text-[#8B8FA3] mb-5">Select one or more</p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { emoji: "\ud83e\ude99", label: "Crypto" },
              { emoji: "\ud83c\udfdb\ufe0f", label: "Politics" },
              { emoji: "\u26bd", label: "Sports" },
              { emoji: "\ud83c\udfad", label: "Culture" },
              { emoji: "\ud83d\udcc8", label: "Finance" },
              { emoji: "\ud83c\udf24\ufe0f", label: "Weather" },
            ].map(({ emoji, label }) => (
              <button
                key={label}
                onClick={() => toggleCategory(label)}
                className={`flex flex-col items-center justify-center h-20 rounded-xl p-3 cursor-pointer transition-all ${
                  categories.has(label)
                    ? "border-2 border-[#6C5CE7] bg-[#6C5CE7]/10"
                    : "border-2 border-transparent bg-[#141728] hover:bg-[#1A1F35]"
                }`}
              >
                <span className="text-2xl mb-1">{emoji}</span>
                <span className="text-white text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>

          <ContinueButton onClick={() => setStep(5)} />
        </ModalCard>
      )}

      {/* ============================================================ */}
      {/*  STEP 5: Trading Style                                       */}
      {/* ============================================================ */}
      {step === 5 && (
        <ModalCard onClose={() => setStep(2)} progress={75}>
          <h2 className="text-xl font-bold text-white mb-1">What trading style fits you?</h2>
          <p className="text-sm text-[#8B8FA3] mb-5">Pick the one that resonates</p>

          <div className="space-y-3">
            <OptionCard
              selected={tradingStyle === 0}
              onClick={() => setTradingStyle(0)}
              icon={<BrainIcon />}
              title="The Analyst"
              description="Enters early, holds with conviction. Patient, research-driven."
            />
            <OptionCard
              selected={tradingStyle === 1}
              onClick={() => setTradingStyle(1)}
              icon={<TrendUpIcon />}
              title="The Operator"
              description="Rides momentum with precision. In and out within hours to days."
            />
            <OptionCard
              selected={tradingStyle === 2}
              onClick={() => setTradingStyle(2)}
              icon={<LightningIcon />}
              title="The Machine"
              description="High-frequency, data-driven. Hundreds of micro-trades."
            />
          </div>

          <ContinueButton onClick={() => setStep(6)} />
        </ModalCard>
      )}

      {/* ============================================================ */}
      {/*  STEP 6: Activity Level                                      */}
      {/* ============================================================ */}
      {step === 6 && (
        <ModalCard onClose={() => setStep(2)} progress={90}>
          <h2 className="text-xl font-bold text-white mb-1">How active should your trader be?</h2>
          <p className="text-sm text-[#8B8FA3] mb-5">Match your availability</p>

          <div className="space-y-3">
            <OptionCard
              selected={activityLevel === 0}
              onClick={() => setActivityLevel(0)}
              icon={<MoonIcon />}
              title="Set and Forget"
              description="A few trades per week. Low maintenance."
            />
            <OptionCard
              selected={activityLevel === 1}
              onClick={() => setActivityLevel(1)}
              icon={<BarChartIcon />}
              title="Daily Flow"
              description="Multiple trades per day. Steady signals."
            />
            <OptionCard
              selected={activityLevel === 2}
              onClick={() => setActivityLevel(2)}
              icon={<RocketIcon />}
              title="Always On"
              description="Round the clock. Maximum activity, maximum opportunities."
            />
          </div>

          <ContinueButton onClick={() => setStep(7)} />
        </ModalCard>
      )}

      {/* ============================================================ */}
      {/*  STEP 7: Analyzing                                           */}
      {/* ============================================================ */}
      {step === 7 && (
        <ModalCard progress={95}>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 border-4 border-[#1E2235] border-t-[#6C5CE7] rounded-full animate-spin mb-6" />
            <h2 className="font-bold text-white text-lg mb-2">Analyzing 1,500+ traders...</h2>
            <p className="text-[#8B8FA3] text-sm">Finding your best matches</p>
          </div>
        </ModalCard>
      )}

      {/* ============================================================ */}
      {/*  STEP 8: Top Matches                                         */}
      {/* ============================================================ */}
      {step === 8 && (
        <ModalCard progress={100}>
          <h2 className="text-xl font-bold text-white mb-5">Your Top Matches</h2>

          <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
            {traders.map((trader, i) => (
              <div
                key={i}
                className="bg-[#1E2235] rounded-xl p-4 flex items-center gap-3"
              >
                {/* Gradient avatar */}
                <div
                  className="w-12 h-12 rounded-full flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${GRADIENT_PAIRS[i % GRADIENT_PAIRS.length][0]}, ${GRADIENT_PAIRS[i % GRADIENT_PAIRS.length][1]})`,
                  }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-sm truncate">{trader.name}</div>
                  <div className="text-[#6C5CE7] font-bold text-sm">{trader.match}% match</div>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {trader.winRate && (
                      <span className="inline-flex rounded-full bg-[#141728] px-2 py-0.5 text-[11px] text-[#8B8FA3]">
                        {trader.winRate}% win rate
                      </span>
                    )}
                    {trader.pnl && (
                      <span className="inline-flex rounded-full bg-[#141728] px-2 py-0.5 text-[11px] text-[#8B8FA3]">
                        Strong PnL ({trader.pnl})
                      </span>
                    )}
                    {trader.tag && (
                      <span className="inline-flex rounded-full bg-[#141728] px-2 py-0.5 text-[11px] text-[#8B8FA3]">
                        {trader.tag}
                      </span>
                    )}
                  </div>
                  {(trader.winRate || trader.profit) && (
                    <div className="text-[#8B8FA3] text-xs mt-1">
                      {trader.winRate ? `${trader.winRate}% win` : ""}{trader.winRate && trader.profit ? " \u00b7 " : ""}{trader.profit || ""}
                    </div>
                  )}
                </div>

                {/* Copy button */}
                <button
                  onClick={() => handleCopy(trader.name)}
                  className="bg-white text-[#0B0E1C] rounded-full px-5 py-2 text-sm font-bold flex-shrink-0 hover:bg-gray-100 transition-colors"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep(3)}
            className="w-full text-center text-[#5A5F7A] text-sm mt-5 hover:text-[#8B8FA3] transition-colors"
          >
            Retake quiz
          </button>
        </ModalCard>
      )}
    </div>
  );
}
