"use client";

import { motion } from "framer-motion";
import { useNourish, DEFAULT_PROFILE } from "@/lib/nourishiq/store";
import { GOALS, computePrescription } from "@/lib/nourishiq/engine";
import { useHydrated } from "./primitives";

export type ViewId = "home" | "assessment" | "plan" | "foods" | "recipes" | "activity" | "guides" | "log" | "progress" | "report" | "chat";

interface HomeViewProps {
  go: (v: ViewId) => void;
}

const CARDS: {
  view: ViewId;
  title: string;
  sub: string;
  emoji: string;
  tint: string;
  ink: string;
  ring: string;
}[] = [
  { view: "plan", title: "My Plan", sub: "Your prescription", emoji: "📋", tint: "bg-[#E4F6EE]", ink: "text-[#0E6B4E]", ring: "ring-[#0E6B4E]/15" },
  { view: "log", title: "Food Diary", sub: "Rings & meal log", emoji: "📔", tint: "bg-[#E0F2EF]", ink: "text-[#0F766E]", ring: "ring-[#0F766E]/15" },
  { view: "foods", title: "Foods", sub: "Fit-scored database", emoji: "🥗", tint: "bg-[#F3EAF8]", ink: "text-[#7C3AED]", ring: "ring-[#7C3AED]/15" },
  { view: "recipes", title: "Recipes", sub: "Goal-aligned meals", emoji: "👨‍🍳", tint: "bg-[#EAF4E2]", ink: "text-[#4D8B31]", ring: "ring-[#4D8B31]/15" },
  { view: "chat", title: "Ask Nutritionist", sub: "AI chat · 24×7", emoji: "💬", tint: "bg-[#FCE9F1]", ink: "text-[#BE185D]", ring: "ring-[#BE185D]/15" },
  { view: "activity", title: "Activity", sub: "Energy burn", emoji: "🏃", tint: "bg-[#FCEFD9]", ink: "text-[#D96C0B]", ring: "ring-[#D96C0B]/15" },
  { view: "guides", title: "Guidelines", sub: "Evidence-based", emoji: "📖", tint: "bg-[#FBF3E2]", ink: "text-[#A97715]", ring: "ring-[#A97715]/15" },
  { view: "assessment", title: "My Goals", sub: "Update & retake", emoji: "🎯", tint: "bg-[#EFEFED]", ink: "text-[#4A342A]", ring: "ring-stone-900/10" },
];

export default function HomeView({ go }: HomeViewProps) {
  const hydrated = useHydrated();
  const profile = useNourish((s) => s.profile);
  const passportId = useNourish((s) => s.passportId);
  const rx = computePrescription(profile);
  const goal = GOALS.find((g) => g.id === profile.goal);

  return (
    <div className="px-5 pb-6">
      {/* Greeting */}
      <header className="pt-8 pb-5">
        <p className="text-[15px] text-stone-500 font-medium">Welcome back!</p>
        <h1 className="text-[34px] leading-tight font-extrabold text-[#0B5C46] tracking-tight">
          NourishIQ
        </h1>
        <p className="text-[15px] text-stone-500 mt-1">
          {rx ? `Your focus today: ${rx.goalLabel.toLowerCase()}.` : "What would you like to explore today?"}
        </p>
      </header>

      {/* Goal chip / CTA */}
      {hydrated && (
        rx ? (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => go("plan")}
            className={`w-full text-left ${goal?.tint ?? "bg-[#E4F6EE]"} rounded-2xl px-4 py-3.5 flex items-center gap-3 mb-4 active:scale-[0.99] transition-transform`}
            aria-label="Open my prescription"
          >
            <span className="text-2xl" aria-hidden>{goal?.emoji}</span>
            <span className="flex-1 min-w-0">
              <span className={`block text-[13px] font-bold ${goal?.ink ?? "text-[#0E6B4E]"}`}>{rx.goalLabel} plan is live</span>
              <span className="block text-xs text-stone-500 truncate">
                {rx.kcal} kcal · {rx.proteinG}g protein · {rx.fiberG}g fibre targets
              </span>
            </span>
            <span className={`${goal?.ink ?? "text-[#0E6B4E]"} text-lg`} aria-hidden>›</span>
          </motion.button>
        ) : (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => go("assessment")}
            className="w-full text-left bg-[#0B5C46] text-white rounded-2xl px-4 py-4 flex items-center gap-3 mb-4 shadow-sm active:scale-[0.99] transition-transform"
            aria-label="Start intake assessment"
          >
            <span className="text-2xl" aria-hidden>✨</span>
            <span className="flex-1">
              <span className="block text-[14px] font-bold">Build your nutrition prescription</span>
              <span className="block text-xs text-white/75">2-minute intake · personalised macros & food scores</span>
            </span>
            <span className="text-lg" aria-hidden>›</span>
          </motion.button>
        )
      )}

      {/* Card grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {CARDS.map((c, i) => (
          <motion.button
            key={c.view + c.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
            onClick={() => go(c.view)}
            className={`${c.tint} rounded-[26px] p-5 text-left aspect-square flex flex-col justify-between hover:shadow-md active:scale-[0.98] transition-all ring-1 ${c.ring}`}
            aria-label={c.title}
          >
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm text-[26px]" aria-hidden>
              {c.emoji}
            </span>
            <span>
              <span className={`block text-[22px] leading-6 font-extrabold ${c.ink}`}>{c.title}</span>
              <span className="block text-[13px] text-stone-500 mt-1">{c.sub}</span>
            </span>
          </motion.button>
        ))}
      </div>

      {/* Your journey — progress tracking */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          onClick={() => go("progress")}
          className="bg-[#E0F2EF] rounded-[26px] p-4 text-left flex items-center gap-3.5 ring-1 ring-[#0F766E]/15 hover:shadow-md active:scale-[0.98] transition-all"
          aria-label="Open progress: weight and waist charts, streaks"
        >
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm text-[22px]" aria-hidden>📈</span>
          <span className="min-w-0">
            <span className="block text-[16.5px] leading-5 font-extrabold text-[#0F766E]">Progress</span>
            <span className="block text-[11.5px] text-stone-500 mt-0.5">Weight &amp; waist charts · streaks</span>
          </span>
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          onClick={() => go("report")}
          className="bg-[#FBF3E2] rounded-[26px] p-4 text-left flex items-center gap-3.5 ring-1 ring-[#A97715]/15 hover:shadow-md active:scale-[0.98] transition-all"
          aria-label="Open nutritionist report"
        >
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm text-[22px]" aria-hidden>🧾</span>
          <span className="min-w-0">
            <span className="block text-[16.5px] leading-5 font-extrabold text-[#A97715]">Nutritionist Report</span>
            <span className="block text-[11.5px] text-stone-500 mt-0.5">Summary &amp; shareable PDF</span>
          </span>
        </motion.button>
      </div>

      {/* Passport */}
      <div className="mt-6 rounded-2xl bg-white border border-stone-200/80 px-4 py-3.5 text-center shadow-sm">
        <p className="text-[13px] text-stone-600">
          Nutrition Passport:{" "}
          <span className="font-bold text-[#0B5C46]" suppressHydrationWarning>
            {hydrated ? passportId || "…" : "…"}
          </span>
        </p>
        <p className="text-[11px] text-stone-400 mt-0.5">
          Your goals & plan live on this device only.
        </p>
      </div>

      <p className="text-center text-[11px] leading-relaxed text-stone-400 mt-4 px-2">
        Educational guidance built on ICMR-NIN 2024, WHO and ADA references — not a
        substitute for medical advice from your doctor or dietitian.
      </p>
    </div>
  );
}
