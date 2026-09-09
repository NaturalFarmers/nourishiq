"use client";

import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { useNourish } from "@/lib/nourishiq/store";
import { computePrescription } from "@/lib/nourishiq/engine";
import { ACTIVITIES, burnedKcal } from "@/lib/nourishiq/activities";
import { useHydrated, Skeleton } from "./primitives";

export default function ActivityView() {
  const hydrated = useHydrated();
  const profile = useNourish((s) => s.profile);
  const rx = hydrated ? computePrescription(profile) : null;

  const [actId, setActId] = useState("walk_brisk");
  const [minutes, setMinutes] = useState(30);

  const act = ACTIVITIES.find((a) => a.id === actId)!;
  const weight = profile.weightKg || 70;
  const burn = useMemo(() => burnedKcal(act.met, weight, minutes), [act, weight, minutes]);

  if (!hydrated) {
    return (
      <div className="px-5 pt-6 space-y-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 pb-8">
      <header className="mb-4">
        <h1 className="text-[26px] font-extrabold text-stone-900 tracking-tight">Energy burn</h1>
        <p className="text-[13px] text-stone-500 mt-0.5">
          MET-based estimates at {weight} kg body weight{rx ? `, against your ${rx.kcal.toLocaleString()} kcal target` : ""}.
        </p>
      </header>

      {/* Result card */}
      <section className="bg-[#FCEFD9] rounded-[26px] p-5 ring-1 ring-black/5" aria-label="burn estimate">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm text-[26px]" aria-hidden>{act.emoji}</span>
          <div className="flex-1">
            <p className="text-[15px] font-extrabold text-stone-900">{act.name}</p>
            <p className="text-[11.5px] text-stone-500">{act.hint} · MET {act.met}</p>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[44px] leading-none font-extrabold text-stone-900">
              {burn}
              <span className="text-[15px] font-bold text-stone-500 ml-1">kcal</span>
            </p>
            <p className="text-[11.5px] text-stone-500 mt-1">burned in {minutes} minutes</p>
          </div>
          {rx && (
            <div className="text-right">
              <p className="text-[22px] font-extrabold text-stone-900">{Math.round((burn / rx.kcal) * 100)}%</p>
              <p className="text-[11px] text-stone-500">of daily target</p>
            </div>
          )}
        </div>
      </section>

      {/* Duration */}
      <section className="mt-4 rounded-[26px] bg-white border border-stone-200/80 p-5 shadow-sm" aria-label="duration picker">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[13px] font-bold text-stone-700">Duration</span>
          <span className="text-[15px] font-extrabold text-[#0B5C46]">{minutes} min</span>
        </div>
        <Slider
          value={[minutes]}
          min={5} max={120} step={5}
          onValueChange={(v) => setMinutes(v[0])}
          aria-label="Duration in minutes"
          className="[&_[data-slot=slider-range]]:bg-[#0B5C46] [&_[data-slot=slider-thumb]]:border-[#0B5C46]"
        />
        <div className="flex justify-between mt-2 text-[10.5px] text-stone-400 font-semibold">
          <span>5 min</span><span>30</span><span>60</span><span>90</span><span>120 min</span>
        </div>
      </section>

      {/* Activity grid */}
      <section className="mt-4" aria-label="activities">
        <h2 className="text-[15px] font-extrabold text-stone-900 mb-2.5">Pick an activity</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {ACTIVITIES.map((a) => {
            const kcal30 = burnedKcal(a.met, weight, 30);
            const active = a.id === actId;
            return (
              <button
                key={a.id}
                onClick={() => setActId(a.id)}
                className={`rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.97] ${active ? "border-[#D96C0B] bg-[#FCEFD9]" : "border-stone-200 bg-white"}`}
                aria-pressed={active}
              >
                <span className="text-xl" aria-hidden>{a.emoji}</span>
                <span className="block text-[12.5px] font-bold text-stone-800 leading-tight mt-1">{a.name}</span>
                <span className="block text-[10.5px] text-stone-400 mt-0.5">{kcal30} kcal / 30 min</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* WHO guidance */}
      <section className="mt-5 rounded-[26px] bg-[#EAF4E2] p-5" aria-label="WHO activity guidance">
        <h2 className="text-[14px] font-extrabold text-stone-900">The WHO weekly minimum 🌍</h2>
        <ul className="mt-2 space-y-2 text-[12.5px] leading-relaxed text-stone-700">
          <li>• <b>150–300 min</b> moderate cardio (brisk walk, cycling) — or 75–150 min vigorous.</li>
          <li>• <b>2+ resistance sessions</b> weekly — muscle is metabolic currency, especially on a diet.</li>
          <li>• Break up sitting every 30–60 min; NEAT burns more weekly energy than your workouts.</li>
          {rx?.goalLabel === "Lose Visceral Fat" && (
            <li>• For visceral fat: pair Zone-2 walking with 2 interval sessions — this combo mobilises belly fat best in trials.</li>
          )}
        </ul>
      </section>

      <p className="mt-4 text-center text-[10.5px] text-stone-400 leading-relaxed">
        Estimates from the Compendium of Physical Activities; individual burn varies ±10–15%.
      </p>
    </div>
  );
}
