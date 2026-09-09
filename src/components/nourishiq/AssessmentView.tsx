"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useNourish, DEFAULT_PROFILE } from "@/lib/nourishiq/store";
import { GOALS, PATTERNS, EXCLUSIONS, BOOSTERS, ACTIVITY_LEVELS } from "@/lib/nourishiq/engine";
import type { GoalId, DietaryPattern, ExclusionId, BoosterId, Sex, ActivityLevel } from "@/lib/nourishiq/types";
import type { ViewId } from "./HomeView";

const STEPS = ["Goal", "Diet", "You", "Confirm"];

export default function AssessmentView({ go }: { go: (v: ViewId) => void }) {
  const profile = useNourish((s) => s.profile);
  const setProfile = useNourish((s) => s.setProfile);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({
    goal: profile.goal,
    pattern: profile.pattern,
    exclusions: profile.exclusions,
    boosters: profile.boosters,
    sex: profile.sex,
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    activity: profile.activity,
  });

  const toggle = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const canNext =
    (step === 0 && draft.goal !== null) ||
    (step === 1 && draft.pattern !== null) ||
    step === 2;

  const finish = () => {
    setProfile({ ...draft, goal: draft.goal ?? "optimal_health", pattern: draft.pattern ?? "vegetarian" });
    go("plan");
  };

  return (
    <div className="px-5 pb-8 pt-6 min-h-[70vh] flex flex-col">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={4}>
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${i <= step ? "bg-[#0B5C46]" : "bg-stone-200"}`} />
            <p className={`text-[11px] mt-1.5 font-semibold ${i === step ? "text-[#0B5C46]" : "text-stone-400"}`}>{s}</p>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 0 — Goal */}
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
            <h2 className="text-[22px] font-extrabold text-stone-900">What&apos;s your primary goal?</h2>
            <p className="text-sm text-stone-500 mt-1 mb-4">This drives your calories, macros & food scores. Pick one for now.</p>
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setDraft({ ...draft, goal: g.id as GoalId })}
                  className={`${g.tint} rounded-3xl p-4 text-left min-h-[118px] flex flex-col justify-between ring-2 transition-all active:scale-[0.98] ${draft.goal === g.id ? `ring-[#0B5C46] scale-[1.02]` : "ring-transparent"}`}
                  aria-pressed={draft.goal === g.id}
                >
                  <span className="text-2xl" aria-hidden>{g.emoji}</span>
                  <span>
                    <span className={`block text-[16px] font-extrabold leading-5 ${g.ink}`}>{g.label}</span>
                    <span className="block text-[11px] text-stone-500 mt-0.5">{g.tagline}</span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP 1 — Diet pattern, exclusions, boosters */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
            <h2 className="text-[22px] font-extrabold text-stone-900">How do you eat?</h2>
            <p className="text-sm text-stone-500 mt-1 mb-3">Pattern first — then anything to exclude or boost.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {PATTERNS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDraft({ ...draft, pattern: p.id as DietaryPattern })}
                  className={`rounded-2xl border-2 px-3.5 py-3 text-left transition-all active:scale-[0.98] ${draft.pattern === p.id ? "border-[#0B5C46] bg-[#E4F6EE]" : "border-stone-200 bg-white"}`}
                  aria-pressed={draft.pattern === p.id}
                >
                  <span className="text-lg mr-1.5" aria-hidden>{p.emoji}</span>
                  <span className="text-[14px] font-bold text-stone-800">{p.label}</span>
                  <span className="block text-[11px] text-stone-500">{p.desc}</span>
                </button>
              ))}
            </div>

            <p className="text-[13px] font-bold text-stone-700 mt-5 mb-2">Exclude <span className="font-normal text-stone-400">(any that apply)</span></p>
            <div className="flex flex-wrap gap-2">
              {EXCLUSIONS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setDraft({ ...draft, exclusions: toggle(draft.exclusions, e.id as ExclusionId) })}
                  className={`rounded-full border-2 px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-95 ${draft.exclusions.includes(e.id) ? "border-[#D96C0B] bg-[#FCEFD9] text-[#B35309]" : "border-stone-200 bg-white text-stone-600"}`}
                  aria-pressed={draft.exclusions.includes(e.id)}
                >
                  {e.emoji} {e.label}
                </button>
              ))}
            </div>

            <p className="text-[13px] font-bold text-stone-700 mt-5 mb-2">Also prioritise <span className="font-normal text-stone-400">(optional)</span></p>
            <div className="flex flex-wrap gap-2">
              {BOOSTERS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setDraft({ ...draft, boosters: toggle(draft.boosters, b.id as BoosterId) })}
                  className={`rounded-full border-2 px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-95 ${draft.boosters.includes(b.id) ? "border-[#0B5C46] bg-[#E4F6EE] text-[#0E6B4E]" : "border-stone-200 bg-white text-stone-600"}`}
                  aria-pressed={draft.boosters.includes(b.id)}
                >
                  {b.emoji} {b.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP 2 — Body */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
            <h2 className="text-[22px] font-extrabold text-stone-900">About you</h2>
            <p className="text-sm text-stone-500 mt-1 mb-4">Used for Mifflin-St Jeor BMR — the clinical standard.</p>

            <div className="flex gap-2 mb-5">
              {(["male", "female"] as Sex[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setDraft({ ...draft, sex: s })}
                  className={`flex-1 rounded-2xl border-2 py-3 text-[14px] font-bold capitalize transition-all active:scale-[0.98] ${draft.sex === s ? "border-[#0B5C46] bg-[#E4F6EE] text-[#0E6B4E]" : "border-stone-200 bg-white text-stone-600"}`}
                  aria-pressed={draft.sex === s}
                >
                  {s === "male" ? "♂ Male" : "♀ Female"}
                </button>
              ))}
            </div>

            <NumberRow
              label="Age"
              unit="years"
              value={draft.age}
              min={14} max={90}
              onChange={(v) => setDraft({ ...draft, age: v })}
            />
            <NumberRow
              label="Height"
              unit="cm"
              value={draft.heightCm}
              min={120} max={215}
              onChange={(v) => setDraft({ ...draft, heightCm: v })}
            />
            <NumberRow
              label="Weight"
              unit="kg"
              value={draft.weightKg}
              min={30} max={200}
              onChange={(v) => setDraft({ ...draft, weightKg: v })}
            />

            <p className="text-[13px] font-bold text-stone-700 mt-5 mb-2">Activity level</p>
            <div className="space-y-2">
              {ACTIVITY_LEVELS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setDraft({ ...draft, activity: a.id as ActivityLevel })}
                  className={`w-full rounded-2xl border-2 px-4 py-3 flex items-center justify-between text-left transition-all active:scale-[0.99] ${draft.activity === a.id ? "border-[#0B5C46] bg-[#E4F6EE]" : "border-stone-200 bg-white"}`}
                  aria-pressed={draft.activity === a.id}
                >
                  <span>
                    <span className="block text-[14px] font-bold text-stone-800">{a.label}</span>
                    <span className="block text-[11px] text-stone-500">{a.desc}</span>
                  </span>
                  <span className="text-[11px] font-mono text-stone-400">×{a.factor}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP 3 — Confirm */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
            <h2 className="text-[22px] font-extrabold text-stone-900">Ready to prescribe</h2>
            <p className="text-sm text-stone-500 mt-1 mb-4">Quick review — everything stays on your device.</p>
            <div className="rounded-3xl border border-stone-200 bg-white divide-y divide-stone-100 shadow-sm overflow-hidden">
              {[
                ["Primary goal", GOALS.find((g) => g.id === draft.goal)?.label ?? "—"],
                ["Diet pattern", PATTERNS.find((p) => p.id === draft.pattern)?.label ?? "—"],
                ["Excludes", draft.exclusions.length ? draft.exclusions.map((e) => EXCLUSIONS.find((x) => x.id === e)?.label).join(", ") : "None"],
                ["Boosts", draft.boosters.length ? draft.boosters.map((b) => BOOSTERS.find((x) => x.id === b)?.label).join(", ") : "None"],
                ["Body", `${draft.sex === "male" ? "Male" : "Female"} · ${draft.age} yrs · ${draft.heightCm} cm · ${draft.weightKg} kg`],
                ["Activity", ACTIVITY_LEVELS.find((a) => a.id === draft.activity)?.label ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="px-4 py-3 flex items-start justify-between gap-4">
                  <span className="text-[13px] text-stone-500 shrink-0">{k}</span>
                  <span className="text-[13px] font-semibold text-stone-800 text-right">{v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(0)} className="mt-3 text-[13px] font-semibold text-[#0B5C46] underline underline-offset-4">
              Edit something
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer buttons */}
      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <Button variant="outline" className="flex-1 h-12 rounded-2xl border-stone-300 text-stone-700" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button className="flex-[2] h-12 rounded-2xl bg-[#0B5C46] hover:bg-[#094a38] text-[15px] font-bold" disabled={!canNext} onClick={() => setStep(step + 1)}>
            Continue
          </Button>
        ) : (
          <Button className="flex-[2] h-12 rounded-2xl bg-[#0B5C46] hover:bg-[#094a38] text-[15px] font-bold" onClick={finish}>
            ✨ Create my prescription
          </Button>
        )}
      </div>
      {step === 0 && (
        <button
          onClick={() => { setProfile(DEFAULT_PROFILE); go("home"); }}
          className="mt-4 text-[12px] text-stone-400 underline underline-offset-4"
        >
          Skip — I&apos;ll explore without a plan
        </button>
      )}
    </div>
  );
}

function NumberRow({
  label, unit, value, min, max, onChange,
}: {
  label: string; unit: string; value: number; min: number; max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[13px] font-bold text-stone-700">{label}</span>
        <span className="text-[15px] font-extrabold text-[#0B5C46]">
          {value} <span className="text-[11px] font-medium text-stone-400">{unit}</span>
        </span>
      </div>
      <Slider
        value={[value]}
        min={min} max={max} step={1}
        onValueChange={(v) => onChange(v[0])}
        aria-label={`${label} in ${unit}`}
        className="[&_[data-slot=slider-range]]:bg-[#0B5C46] [&_[data-slot=slider-thumb]]:border-[#0B5C46]"
      />
    </div>
  );
}
