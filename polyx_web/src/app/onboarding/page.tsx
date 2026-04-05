"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { copyApi, traderApi } from "@/lib/api";
import { STRATEGY_LIST } from "@/lib/strategies";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Quiz option images (unsplash)                                      */
/* ------------------------------------------------------------------ */
const QUIZ_IMAGES = {
  risk: [
    "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=120&h=120&fit=crop",
  ],
  style: [
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=120&h=120&fit=crop",
  ],
  activity: [
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=120&h=120&fit=crop",
    "https://images.unsplash.com/photo-1504607798333-52a30db54a5d?w=120&h=120&fit=crop",
  ],
};

/* ------------------------------------------------------------------ */
/*  Mock traders (fallback)                                            */
/* ------------------------------------------------------------------ */
const MOCK_TRADERS = STRATEGY_LIST.map((s, i) => ({
  name: s.name,
  match: [94, 91, 87, 82, 76][i] ?? 75,
  winRate: s.winRate,
  pnl: s.profit,
  image: s.image,
  wallet: s.wallet,
  trades: s.trades,
  copiers: s.copiers,
  returnPct: s.returnPct,
  categories: s.categories,
}));

/* ================================================================== */
/*  Reusable Option Card with Image                                    */
/* ================================================================== */

function OptionCard({
  selected,
  onClick,
  title,
  description,
  imageUrl,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  imageUrl?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${
        selected
          ? "border-2 border-[#121212] bg-[#F7F7F7] shadow-sm"
          : "border-2 border-transparent bg-white shadow-sm hover:border-[#121212]"
      }`}
    >
      {imageUrl && (
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-[#121212]">{title}</div>
        <div className="text-xs text-[#9B9B9B] mt-1 leading-relaxed">
          {description}
        </div>
      </div>
      <div
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          selected ? "border-[#121212] bg-[#121212]" : "border-[#D1D1D1]"
        }`}
      >
        {selected && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </button>
  );
}

/* ================================================================== */
/*  Progress Bar Component                                             */
/* ================================================================== */

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full h-1 bg-[#EBEBEB] rounded-full overflow-hidden">
      <div
        className="h-full bg-[#121212] rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
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
      // Start with static data, then enrich with live Polymarket data
      let traderList = MOCK_TRADERS;
      try {
        const res = await copyApi.suggested();
        if (res.traders && res.traders.length > 0) {
          traderList = res.traders.map((t: any, i: number) => {
            const strat = STRATEGY_LIST.find(s => s.wallet.toLowerCase() === (t.wallet || "").toLowerCase());
            return {
              ...t,
              image: strat?.image || MOCK_TRADERS[i % MOCK_TRADERS.length]?.image,
              returnPct: strat?.returnPct || 0,
              categories: strat?.categories || [],
              trades: strat?.trades || "0",
            };
          });
        }
      } catch {}
      // Enrich with live analytics
      const enriched = await Promise.all(
        traderList.map(async (t: any) => {
          try {
            const live = await traderApi.one(t.wallet);
            return {
              ...t,
              winRate: live.win_rate ?? t.winRate ?? t.win_rate,
              pnl: live.total_pnl ? `$${Number(live.total_pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : t.pnl || t.profit,
              trades: live.position_count?.toString() || t.trades,
              returnPct: live.roi ?? t.returnPct,
            };
          } catch {
            return t;
          }
        })
      );
      setTraders(enriched);
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

  /* quiz step mapping: steps 3-6 map to quiz questions 1-4 */
  const quizStep = step >= 3 && step <= 6 ? step - 2 : 0;
  const totalQuizSteps = 4;

  /* ---------------------------------------------------------------- */
  /*  RENDER                                                          */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#F7F7F7] text-[#121212]">
      {/* ============================================================ */}
      {/*  STEP 1: Referral Code                                       */}
      {/* ============================================================ */}
      {step === 1 && (
        <div className="flex flex-col min-h-screen px-6 items-center justify-center">
          <div className="max-w-[480px] w-full text-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-8">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-[#121212]">
              Got a referral code?
            </h1>

            <p className="text-[#9B9B9B] text-sm mt-3 leading-relaxed">
              Enter it below to get 15% off on all your trading fees.
            </p>

            <div className="mt-8">
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="w-full bg-[#F7F7F7] border border-[#E5E5E5] focus:border-[#121212] h-12 text-[#121212] text-center text-lg tracking-widest placeholder:text-[#C5C5C5] placeholder:tracking-normal outline-none transition-colors rounded-full px-5 font-medium"
              />
            </div>

            <div className="mt-8 space-y-3">
              <button
                onClick={() => setStep(2)}
                className="w-full h-12 bg-[#121212] text-white text-sm font-semibold rounded-full transition-all hover:bg-[#121212]/90 active:scale-[0.98]"
              >
                Continue
              </button>
              <button
                onClick={() => setStep(2)}
                className="text-[#9B9B9B] text-sm font-medium transition-colors hover:text-[#656565] cursor-pointer block mx-auto py-2"
              >
                I don&apos;t have a code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 2: Copy Trading Intro                                  */}
      {/* ============================================================ */}
      {step === 2 && (
        <div className="flex flex-col items-center min-h-screen">
          {/* Hero image */}
          <div className="w-full max-w-[600px] px-4 pt-12">
            <div className="w-full h-[240px] sm:h-[320px] rounded-3xl overflow-hidden relative">
              <img
                src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=400&fit=crop"
                alt="Trading"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00D26A] animate-pulse" />
                  <span className="text-white/80 text-xs font-medium">1,500+ active traders</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-[480px] w-full px-6 mt-8 text-center flex-1 flex flex-col">
            <h2 className="text-2xl font-bold text-[#121212]">
              Copy top traders in one tap.
            </h2>

            <p className="text-[#9B9B9B] text-sm mt-3 leading-relaxed">
              Thousands of top traders. We find the right one for you.
            </p>

            <div className="mt-auto pb-12">
              <button
                onClick={() => setStep(3)}
                className="w-full h-12 bg-[#121212] text-white text-sm font-semibold rounded-full transition-all hover:bg-[#121212]/90 active:scale-[0.98]"
              >
                Start Copy Trading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 3: Risk Tolerance                                      */}
      {/* ============================================================ */}
      {step === 3 && (
        <div className="flex flex-col min-h-screen px-6 items-center pt-16 pb-8">
          <div className="max-w-[480px] w-full">
            <ProgressBar current={1} total={totalQuizSteps} />

            <div className="mt-8">
              <h2 className="text-xl font-bold text-[#121212]">
                What&apos;s your risk comfort?
              </h2>
              <p className="text-[#9B9B9B] text-sm mt-2">
                Choose how much volatility you can handle
              </p>
            </div>

            <div className="space-y-3 mt-6">
              <OptionCard
                selected={riskLevel === 0}
                onClick={() => setRiskLevel(0)}
                title="Steady Hands"
                description="High win rates, consistent returns. Less noise, more confidence."
                imageUrl={QUIZ_IMAGES.risk[0]}
              />
              <OptionCard
                selected={riskLevel === 1}
                onClick={() => setRiskLevel(1)}
                title="Balanced Edge"
                description="Proven track records with solid risk-reward. The sweet spot."
                imageUrl={QUIZ_IMAGES.risk[1]}
              />
              <OptionCard
                selected={riskLevel === 2}
                onClick={() => setRiskLevel(2)}
                title="High Conviction"
                description="Bold moves, bigger positions. Higher potential rewards."
                imageUrl={QUIZ_IMAGES.risk[2]}
              />
            </div>

            <button
              onClick={() => setStep(4)}
              className="w-full h-12 bg-[#121212] text-white text-sm font-semibold rounded-full mt-8 transition-all hover:bg-[#121212]/90 active:scale-[0.98]"
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
        <div className="flex flex-col min-h-screen px-6 items-center pt-16 pb-8">
          <div className="max-w-[480px] w-full">
            <ProgressBar current={2} total={totalQuizSteps} />

            <div className="mt-8">
              <h2 className="text-xl font-bold text-[#121212]">
                Pick your markets
              </h2>
              <p className="text-[#9B9B9B] text-sm mt-2">
                Select one or more categories you want to trade
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              {[
                { label: "Crypto", icon: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=80&h=80&fit=crop" },
                { label: "Politics", icon: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=80&h=80&fit=crop" },
                { label: "Sports", icon: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=80&h=80&fit=crop" },
                { label: "Culture", icon: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=80&h=80&fit=crop" },
                { label: "Finance", icon: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=80&h=80&fit=crop" },
                { label: "Weather", icon: "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=80&h=80&fit=crop" },
              ].map(({ label, icon }) => (
                <button
                  key={label}
                  onClick={() => toggleCategory(label)}
                  className={`flex flex-col items-center justify-center gap-2 py-5 rounded-2xl cursor-pointer transition-all ${
                    categories.has(label)
                      ? "border-2 border-[#121212] text-[#121212] bg-[#F7F7F7] shadow-sm"
                      : "border-2 border-transparent text-[#656565] bg-white shadow-sm hover:border-[#121212]"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden">
                    <img src={icon} alt={label} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(5)}
              className="w-full h-12 bg-[#121212] text-white text-sm font-semibold rounded-full mt-8 transition-all hover:bg-[#121212]/90 active:scale-[0.98]"
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
        <div className="flex flex-col min-h-screen px-6 items-center pt-16 pb-8">
          <div className="max-w-[480px] w-full">
            <ProgressBar current={3} total={totalQuizSteps} />

            <div className="mt-8">
              <h2 className="text-xl font-bold text-[#121212]">
                Trading style?
              </h2>
              <p className="text-[#9B9B9B] text-sm mt-2">
                Pick the approach that resonates with you
              </p>
            </div>

            <div className="space-y-3 mt-6">
              <OptionCard
                selected={tradingStyle === 0}
                onClick={() => setTradingStyle(0)}
                title="The Analyst"
                description="Enters early, holds with conviction. Patient, research-driven."
                imageUrl={QUIZ_IMAGES.style[0]}
              />
              <OptionCard
                selected={tradingStyle === 1}
                onClick={() => setTradingStyle(1)}
                title="The Operator"
                description="Rides momentum with precision. In and out within hours to days."
                imageUrl={QUIZ_IMAGES.style[1]}
              />
              <OptionCard
                selected={tradingStyle === 2}
                onClick={() => setTradingStyle(2)}
                title="The Machine"
                description="High-frequency, data-driven. Hundreds of micro-trades."
                imageUrl={QUIZ_IMAGES.style[2]}
              />
            </div>

            <button
              onClick={() => setStep(6)}
              className="w-full h-12 bg-[#121212] text-white text-sm font-semibold rounded-full mt-8 transition-all hover:bg-[#121212]/90 active:scale-[0.98]"
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
        <div className="flex flex-col min-h-screen px-6 items-center pt-16 pb-8">
          <div className="max-w-[480px] w-full">
            <ProgressBar current={4} total={totalQuizSteps} />

            <div className="mt-8">
              <h2 className="text-xl font-bold text-[#121212]">
                How active do you want to be?
              </h2>
              <p className="text-[#9B9B9B] text-sm mt-2">
                Match your availability and trading frequency
              </p>
            </div>

            <div className="space-y-3 mt-6">
              <OptionCard
                selected={activityLevel === 0}
                onClick={() => setActivityLevel(0)}
                title="Set and Forget"
                description="A few trades per week. Low maintenance, maximum peace of mind."
                imageUrl={QUIZ_IMAGES.activity[0]}
              />
              <OptionCard
                selected={activityLevel === 1}
                onClick={() => setActivityLevel(1)}
                title="Daily Flow"
                description="Multiple trades per day. Steady signals, steady growth."
                imageUrl={QUIZ_IMAGES.activity[1]}
              />
              <OptionCard
                selected={activityLevel === 2}
                onClick={() => setActivityLevel(2)}
                title="Always On"
                description="Round the clock. Maximum activity, maximum opportunities."
                imageUrl={QUIZ_IMAGES.activity[2]}
              />
            </div>

            <button
              onClick={() => setStep(7)}
              className="w-full h-12 bg-[#121212] text-white text-sm font-semibold rounded-full mt-8 transition-all hover:bg-[#121212]/90 active:scale-[0.98]"
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
        <div className="flex flex-col items-center justify-center min-h-screen px-6">
          <div className="text-center">
            {/* Animated spinner */}
            <div className="relative w-16 h-16 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-2 border-[#EBEBEB]" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#121212] animate-spin" />
              <div className="absolute inset-3 rounded-full border-2 border-transparent border-b-[#121212]/40 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
            </div>

            <h2 className="text-xl font-bold text-[#121212]">
              Finding your best matches...
            </h2>
            <p className="text-[#9B9B9B] text-sm mt-3">
              Analyzing 1,500+ traders across all markets
            </p>

            {/* Animated dots */}
            <div className="flex items-center justify-center gap-1.5 mt-6">
              <div className="w-2 h-2 rounded-full bg-[#121212] animate-bounce" style={{ animationDelay: "0s" }} />
              <div className="w-2 h-2 rounded-full bg-[#121212] animate-bounce" style={{ animationDelay: "0.15s" }} />
              <div className="w-2 h-2 rounded-full bg-[#121212] animate-bounce" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 8: Top Matches                                         */}
      {/* ============================================================ */}
      {step === 8 && (
        <div className="flex flex-col min-h-screen px-6 items-center pt-16 pb-12">
          <div className="max-w-[480px] w-full">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-[#121212] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#121212]">
                Your Top Matches
              </h2>
              <p className="text-[#9B9B9B] text-sm mt-2">
                Based on your preferences, these traders are the best fit
              </p>
            </div>

            <div className="space-y-4">
              {traders.map((trader: any, i: number) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Hero image */}
                  <div className="h-28 relative overflow-hidden">
                    <img src={trader.image} alt={trader.name} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-2.5 right-2.5 bg-white text-[#121212] text-[10px] font-bold px-2.5 py-1 rounded-full">
                      {trader.match}% match
                    </div>
                    <div className="absolute bottom-3 left-4 flex items-center gap-2">
                      <img src={trader.image} alt={trader.name} className="w-9 h-9 rounded-full object-cover border-2 border-white/40" />
                      <div>
                        <p className="text-white font-bold text-sm drop-shadow-sm">{trader.name}</p>
                        <p className="text-white/70 text-[10px]">{trader.categories?.join(", ") || "Overall"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-4 gap-px bg-[#F0F0F0]">
                    <div className="bg-white p-3 text-center">
                      <p className="text-xs font-bold font-mono text-[#009D55]">{trader.pnl}</p>
                      <p className="text-[9px] text-[#9B9B9B] mt-0.5">P&L</p>
                    </div>
                    <div className="bg-white p-3 text-center">
                      <p className="text-xs font-bold font-mono text-[#121212]">{trader.winRate}%</p>
                      <p className="text-[9px] text-[#9B9B9B] mt-0.5">Win Rate</p>
                    </div>
                    <div className="bg-white p-3 text-center">
                      <p className="text-xs font-bold font-mono text-[#121212]">{trader.trades}</p>
                      <p className="text-[9px] text-[#9B9B9B] mt-0.5">Positions</p>
                    </div>
                    <div className="bg-white p-3 text-center">
                      <p className="text-xs font-bold font-mono text-[#121212]">+{trader.returnPct}%</p>
                      <p className="text-[9px] text-[#9B9B9B] mt-0.5">Return</p>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="p-3">
                    <button
                      onClick={() => handleCopy(trader.name)}
                      className="w-full bg-[#121212] text-white text-sm font-semibold py-2.5 rounded-full transition-all hover:bg-[#333] active:scale-[0.98]"
                    >
                      Start Copying
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Retake */}
            <div className="mt-8 text-center">
              <button
                onClick={() => setStep(3)}
                className="text-[#9B9B9B] text-sm font-medium transition-colors hover:text-[#656565] cursor-pointer"
              >
                Retake Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
