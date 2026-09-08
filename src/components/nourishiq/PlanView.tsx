"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useNourish } from "@/lib/nourishiq/store";
import { computePrescription, fitScore, GOALS } from "@/lib/nourishiq/engine";
import { FOODS } from "@/lib/nourishiq/foods";
import { sampleDay } from "@/lib/nourishiq/mealplan";
import type { ViewId } from "./HomeView";
import { useHydrated, Skeleton } from "./primitives";

export default function PlanView({ go }: { go: (v: ViewId) => void }) {
  const hydrated = useHydrated();
  const profile = useNourish((s) => s.profile);
  const rx = hydrated ? computePrescription(profile) : null;
  const goal = GOALS.find((g) => g.id === profile.goal);

  if (!hydrated) {
    return (
      <div className="px-5 pt-6 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (!rx) {
    return (
      <div className="px-5 pt-16 pb-8 text-center">
        <span className="text-5xl" aria-hidden>📋</span>
        <h2 className="text-[22px] font-extrabold text-stone-900 mt-4">No prescription yet</h2>
        <p className="text-sm text-stone-500 mt-2 max-w-xs mx-auto">
          Take the 2-minute intake and I&apos;ll compute your calories, macros, fibre,
          water targets and rule-set — like a first visit to a nutritionist.
        </p>
        <button
          onClick={() => go("assessment")}
          className="mt-6 rounded-2xl bg-[#0B5C46] px-6 py-3.5 text-[15px] font-bold text-white active:scale-95 transition-transform"
        >
          Start my assessment
        </button>
      </div>
    );
  }

  const ranked = FOODS.map((f) => ({ f, fit: fitScore(f, rx, profile) }))
    .filter((x) => x.fit.score >= 60)
    .sort((a, b) => b.fit.score - a.fit.score)
    .slice(0, 6);

  const day = sampleDay(rx, profile);
  const dayKcal = day.reduce((s, m) => s + m.kcal, 0);

  const macros = [
    { label: "Protein", g: rx.proteinG, kcal: rx.proteinG * 4, pct: rx.proteinPct, tint: "bg-[#0E6B4E]", note: `${rx.proteinPerKg} g/kg` },
    { label: "Carbs", g: rx.carbsG, kcal: rx.carbsG * 4, pct: rx.carbsPct, tint: "bg-[#7C3AED]", note: "smart, low-GI first" },
    { label: "Fat", g: rx.fatG, kcal: rx.fatG * 9, pct: rx.fatPct, tint: "bg-[#D96C0B]", note: "MUFA-forward" },
  ];

  return (
    <div className="px-5 pt-6 pb-8 space-y-4">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={`${goal?.tint ?? "bg-[#E4F6EE]"} rounded-[26px] p-5 ring-1 ring-black/5`}
        aria-label="prescription summary"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-[12px] font-bold uppercase tracking-wide ${goal?.ink ?? "text-[#0E6B4E]"}`}>{rx.goalLabel}</p>
            <p className="text-[42px] leading-none font-extrabold text-stone-900 mt-1">
              {rx.kcal.toLocaleString()}
              <span className="text-[15px] font-bold text-stone-500 ml-1.5">kcal/day</span>
            </p>
          </div>
          <div className="text-right text-[12px] text-stone-600 leading-relaxed">
            <p>BMR <b className="text-stone-800">{rx.bmr}</b></p>
            <p>Burn <b className="text-stone-800">{rx.tdee}</b></p>
            <p>BMI <b className="text-stone-800">{rx.bmi}</b> · {rx.bmiCategory}</p>
          </div>
        </div>
        <p className="text-[12px] text-stone-600 mt-3 leading-relaxed">{rx.bmiNote} {rx.goalTagline}.</p>
      </motion.section>

      {/* Macros */}
      <section className="rounded-[26px] bg-white border border-stone-200/80 p-5 shadow-sm" aria-label="macronutrient targets">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-extrabold text-stone-900">Daily macros</h3>
          <Badge className="bg-[#E4F6EE] text-[#0E6B4E] hover:bg-[#E4F6EE] border-0">Mifflin-St Jeor + goal</Badge>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {macros.map((m) => (
            <div key={m.label} className="rounded-2xl bg-stone-50 p-3 text-center">
              <p className="text-[12px] font-semibold text-stone-500">{m.label}</p>
              <p className="text-[24px] font-extrabold text-stone-900 leading-tight">{m.g}<span className="text-[12px] text-stone-400 font-bold">g</span></p>
              <div className="h-1.5 rounded-full bg-stone-200 mt-2 overflow-hidden">
                <div className={`h-full ${m.tint} rounded-full`} style={{ width: `${Math.min(100, m.pct * 1.6)}%` }} />
              </div>
              <p className="text-[10px] text-stone-400 mt-1.5">≈{m.pct}% energy</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <MiniStat label="Fibre" value={`${rx.fiberG} g`} emoji="🥦" />
          <MiniStat label="Water" value={`${(rx.waterMl / 1000).toFixed(1)} L`} emoji="💧" />
          <MiniStat label="Added sugar" value={`≤ ${rx.sugarCapG} g`} emoji="🍬" />
          <MiniStat label="Sodium" value={`≤ ${(rx.sodiumCapMg / 1000).toFixed(1)} g`} emoji="🧂" />
        </div>
      </section>

      {/* Rules */}
      <section className="rounded-[26px] bg-white border border-stone-200/80 p-5 shadow-sm" aria-label="nutritionist rules">
        <h3 className="text-[16px] font-extrabold text-stone-900 mb-3">Your nutritionist&apos;s notes</h3>
        <ul className="space-y-2.5">
          {rx.rules.map((r, i) => (
            <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed text-stone-700">
              <span className="text-base leading-6 shrink-0" aria-hidden>{r.icon}</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Best-fit foods */}
      <section className="rounded-[26px] bg-white border border-stone-200/80 p-5 shadow-sm" aria-label="best fit foods">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[16px] font-extrabold text-stone-900">Best-fit foods right now</h3>
          <button onClick={() => go("foods")} className="text-[12px] font-bold text-[#0B5C46] underline underline-offset-4">See all</button>
        </div>
        <p className="text-[12px] text-stone-500 mb-3">Every food re-scores against your prescription.</p>
        <div className="space-y-2">
          {ranked.map(({ f, fit }) => (
            <button key={f.id} onClick={() => go("foods")} className="w-full flex items-center gap-3 rounded-2xl border border-stone-100 px-3 py-2.5 text-left hover:bg-stone-50 active:scale-[0.99] transition-all">
              <span className="text-xl" aria-hidden>{f.emoji}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] font-bold text-stone-800 truncate">{f.name}</span>
                <span className="block text-[11px] text-stone-400">{f.kcal} kcal · P {f.protein}g · Fib {f.fiber}g</span>
              </span>
              <span className={`shrink-0 h-9 w-9 grid place-items-center rounded-full text-[12px] font-extrabold ${fit.score >= 80 ? "bg-[#DEF5E7] text-[#0E6B4E]" : "bg-[#EAF4E2] text-[#4D8B31]"}`}>
                {fit.score}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Sample day */}
      <section className="rounded-[26px] bg-white border border-stone-200/80 p-5 shadow-sm" aria-label="sample day meal plan">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[16px] font-extrabold text-stone-900">Sample day</h3>
          <span className="text-[12px] text-stone-400">≈{dayKcal} kcal</span>
        </div>
        <p className="text-[12px] text-stone-500 mb-3">Portions auto-scaled to your targets. Swap freely within the same slot.</p>
        <div className="space-y-2.5">
          {day.map((m) => (
            <div key={m.recipe.id} className={`${m.recipe.hue} rounded-2xl p-3.5 flex items-center gap-3`}>
              <span className="text-2xl" aria-hidden>{m.recipe.emoji}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[10.5px] font-bold uppercase tracking-wide text-stone-500">{m.mealLabel} · {m.portions}</span>
                <span className="block text-[14px] font-extrabold text-stone-800 truncate">{m.recipe.name}</span>
              </span>
              <span className="text-[12px] font-bold text-stone-600 shrink-0">{m.kcal} kcal</span>
            </div>
          ))}
        </div>
        <button onClick={() => go("recipes")} className="mt-3 w-full rounded-2xl border-2 border-[#0B5C46]/15 py-2.5 text-[13px] font-bold text-[#0B5C46] active:scale-[0.99] transition-transform">
          Browse all recipes
        </button>
      </section>

      <button onClick={() => go("assessment")} className="w-full rounded-2xl border border-stone-200 py-3 text-[13px] font-semibold text-stone-500 hover:text-stone-700">
        Update goals & body metrics
      </button>
    </div>
  );
}

function MiniStat({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-3">
      <p className="text-[16px]" aria-hidden>{emoji}</p>
      <p className="text-[15px] font-extrabold text-stone-900 leading-tight mt-0.5">{value}</p>
      <p className="text-[10.5px] text-stone-400">{label}</p>
    </div>
  );
}
