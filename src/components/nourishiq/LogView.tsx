"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNourish, dateKey, totalsOf } from "@/lib/nourishiq/store";
import { computePrescription, GOALS } from "@/lib/nourishiq/engine";
import { adherenceForDay } from "@/lib/nourishiq/progress";
import type { MealSlot } from "@/lib/nourishiq/types";
import type { ViewId } from "./HomeView";
import { useHydrated, Skeleton } from "./primitives";
import FoodPicker from "./FoodPicker";

const SLOTS: { id: MealSlot; label: string; emoji: string }[] = [
  { id: "breakfast", label: "Breakfast", emoji: "🌅" },
  { id: "lunch", label: "Lunch", emoji: "🍛" },
  { id: "snack", label: "Snacks", emoji: "🍎" },
  { id: "dinner", label: "Dinner", emoji: "🌙" },
];

// ─── Ring primitive ──────────────────────────────────────────────────────────

function Ring({
  value,
  target,
  size = 76,
  stroke = 8.5,
  color,
  track = "#E7E5E4",
  children,
}: {
  value: number;
  target: number;
  size?: number;
  stroke?: number;
  color: string;
  track?: string;
  children: React.ReactNode;
}) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">{children}</div>
    </div>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────

export default function LogView({ go }: { go: (v: ViewId) => void }) {
  const hydrated = useHydrated();
  const profile = useNourish((s) => s.profile);
  const logs = useNourish((s) => s.logs);
  const addLogEntry = useNourish((s) => s.addLogEntry);
  const removeLogEntry = useNourish((s) => s.removeLogEntry);
  const addWater = useNourish((s) => s.addWater);
  const clearDay = useNourish((s) => s.clearDay);

  const [pickerSlot, setPickerSlot] = useState<MealSlot | null>(null);
  const [active, setActive] = useState(() => dateKey());

  const rx = hydrated ? computePrescription(profile) : null;
  const goal = GOALS.find((g) => g.id === profile.goal);

  const days = useMemo(() => {
    const arr: { key: string; label: string; sub: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push({
        key: dateKey(d),
        label: i === 0 ? "Today" : i === 1 ? "Yest." : d.toLocaleDateString("en", { weekday: "short" }),
        sub: `${d.getDate()}/${d.getMonth() + 1}`,
      });
    }
    return arr;
  }, []);

  const day = logs[active];
  const totals = totalsOf(day);

  // quick logging streak (walks back from today; today may still be in progress)
  const streak = useMemo(() => {
    if (!rx) return 0;
    let n = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const a = adherenceForDay(logs, rx, dateKey(d));
      if (a.logged) n++;
      else if (i === 0) continue;
      else break;
    }
    return n;
  }, [logs, rx]);

  if (!hydrated) {
    return (
      <div className="px-5 pt-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const kcalLeft = rx ? rx.kcal - totals.kcal : 0;
  const waterTarget = rx?.waterMl ?? 2500;
  const glasses = Math.round(waterTarget / 250);
  const filled = Math.min(glasses, Math.round((day?.waterMl ?? 0) / 250));

  const macroRings = rx
    ? [
        { label: "Protein", value: totals.protein, target: rx.proteinG, unit: "g", color: "#0E6B4E" },
        { label: "Carbs", value: totals.carbs, target: rx.carbsG, unit: "g", color: "#7C3AED" },
        { label: "Fat", value: totals.fat, target: rx.fatG, unit: "g", color: "#D96C0B" },
        { label: "Fibre", value: totals.fiber, target: rx.fiberG, unit: "g", color: "#0F766E" },
      ]
    : [];

  return (
    <div className="px-5 pt-5 pb-8 space-y-4">
      {/* No-prescription nudge */}
      {!rx && (
        <button
          onClick={() => go("assessment")}
          className="w-full text-left bg-[#0B5C46] text-white rounded-2xl px-4 py-3.5 flex items-center gap-3"
          aria-label="Take assessment to unlock targets"
        >
          <span className="text-2xl" aria-hidden>🎯</span>
          <span className="flex-1">
            <span className="block text-[13.5px] font-bold">Take the intake to unlock your targets</span>
            <span className="block text-xs text-white/75">Rings need a daily calorie & macro prescription</span>
          </span>
          <span aria-hidden>›</span>
        </button>
      )}

      {/* Day chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300">
        {days.map((d) => (
          <button
            key={d.key}
            onClick={() => setActive(d.key)}
            className={`shrink-0 rounded-2xl px-4 py-2 text-center border transition-colors ${
              active === d.key
                ? "bg-[#0B5C46] text-white border-[#0B5C46]"
                : "bg-white text-stone-600 border-stone-200"
            }`}
            aria-pressed={active === d.key}
          >
            <span className="block text-[12px] font-extrabold">{d.label}</span>
            <span className={`block text-[10px] ${active === d.key ? "text-white/70" : "text-stone-400"}`}>{d.sub}</span>
          </button>
        ))}
      </div>

      {/* Streak chip */}
      {streak >= 2 && (
        <button
          onClick={() => go("progress")}
          className="w-full rounded-2xl bg-[#FBF3E2] border border-[#A97715]/15 px-4 py-2.5 flex items-center gap-2.5 text-left active:scale-[0.99] transition-transform"
          aria-label={`View your ${streak} day logging streak in Progress`}
        >
          <span className="text-base" aria-hidden>🔥</span>
          <span className="flex-1 text-[12px] text-stone-600">
            <b className="text-[#A97715]">{streak}-day logging streak</b> — keep it alive
          </span>
          <span className="text-[#A97715]" aria-hidden>›</span>
        </button>
      )}

      {/* Rings hero */}
      <section
        className={`${goal?.tint ?? "bg-[#E4F6EE]"} rounded-[26px] p-5 ring-1 ring-black/5`}
        aria-label="daily macro rings"
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-stone-600">Today&apos;s rings</h2>
          {day && day.meals.length > 0 && (
            <button
              onClick={() => clearDay(active)}
              className="text-[11px] font-bold text-stone-500 hover:text-red-500 transition-colors"
            >
              Clear day
            </button>
          )}
        </div>
        <div className="flex items-center gap-5">
          {/* Big kcal ring */}
          <Ring value={totals.kcal} target={rx?.kcal ?? 2000} size={132} stroke={12} color="#0B5C46" track="#00000012">
            {rx ? (
              <>
                <span className={`block text-[22px] font-extrabold ${kcalLeft < 0 ? "text-red-600" : "text-stone-900"}`}>
                  {Math.abs(Math.round(kcalLeft))}
                </span>
                <span className="block text-[9.5px] font-bold text-stone-500 mt-0.5">
                  {kcalLeft < 0 ? "kcal over" : "kcal left"}
                </span>
              </>
            ) : (
              <>
                <span className="block text-[19px] font-extrabold text-stone-900">{Math.round(totals.kcal)}</span>
                <span className="block text-[9.5px] font-bold text-stone-500 mt-0.5">kcal eaten</span>
              </>
            )}
          </Ring>
          {/* Small rings 2×2 */}
          {rx ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 flex-1 justify-items-center">
              {macroRings.map((m) => {
                const over = m.value > m.target * 1.02;
                return (
                  <Ring key={m.label} value={m.value} target={m.target} color={m.color}>
                    <span className={`block text-[13px] font-extrabold ${over ? "text-red-600" : "text-stone-800"}`}>
                      {Math.round(m.value)}{m.unit}
                    </span>
                    <span className="block text-[8.5px] font-bold text-stone-500 mt-0.5">
                      / {m.target}{m.unit} {m.label}
                    </span>
                  </Ring>
                );
              })}
            </div>
          ) : (
            <p className="flex-1 text-[12px] leading-relaxed text-stone-500">
              Log meals to see calories here. Protein, carb, fat &amp; fibre rings switch on once your
              prescription exists.
            </p>
          )}
        </div>
      </section>

      {/* Water */}
      <section className="rounded-[26px] bg-white border border-stone-200/80 p-4" aria-label="water tracker">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-extrabold text-stone-900">💧 Water</h2>
            <p className="text-[11.5px] text-stone-500 mt-0.5">
              {((day?.waterMl ?? 0) / 1000).toFixed(2)} L of {(waterTarget / 1000).toFixed(1)} L goal
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => addWater(active, -250)}
              className="grid h-10 w-10 place-items-center rounded-full border border-stone-200 bg-white text-lg font-bold text-stone-500 active:scale-90 transition-transform"
              aria-label="Remove 250 ml water"
            >
              −
            </button>
            <button
              onClick={() => addWater(active, 250)}
              className="rounded-full bg-[#0F766E] px-4 py-2.5 text-[13px] font-bold text-white active:scale-95 transition-transform"
              aria-label="Add 250 ml water"
            >
              + 250 ml
            </button>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {Array.from({ length: glasses }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 flex-1 rounded-full ${i < filled ? "bg-[#0F766E]" : "bg-stone-200"}`}
            />
          ))}
        </div>
      </section>

      {/* Meal slots */}
      {SLOTS.map((s) => {
        const items = (day?.meals ?? []).filter((m) => m.slot === s.id);
        const slotKcal = items.reduce((acc, m) => acc + m.kcal, 0);
        return (
          <section key={s.id} className="rounded-[26px] bg-white border border-stone-200/80 overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
              <h3 className="text-[14px] font-extrabold text-stone-900">
                <span className="mr-1.5" aria-hidden>{s.emoji}</span>
                {s.label}
                {items.length > 0 && (
                  <span className="ml-2 text-[11px] font-bold text-stone-400">{Math.round(slotKcal)} kcal</span>
                )}
              </h3>
              <button
                onClick={() => setPickerSlot(s.id)}
                className="rounded-full bg-[#E4F6EE] px-3.5 py-1.5 text-[12px] font-extrabold text-[#0E6B4E] active:scale-95 transition-transform"
                aria-label={`Add food to ${s.label}`}
              >
                + Add
              </button>
            </div>
            {items.length === 0 ? (
              <p className="px-4 pb-3.5 text-[12px] text-stone-400">Nothing logged yet.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {items.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-lg" aria-hidden>{m.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-stone-800 truncate">
                        {m.name}
                        <span className="ml-1.5 text-[11px] font-semibold text-stone-400">{m.grams} g</span>
                      </p>
                      <p className="text-[10.5px] text-stone-400 font-semibold">
                        P {m.protein}g · C {m.carbs}g · F {m.fat}g · Fibre {m.fiber}g
                      </p>
                    </div>
                    {m.offPlan && (
                      <span
                        className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[9.5px] font-bold text-red-500"
                        title={m.offPlan}
                      >
                        off-plan
                      </span>
                    )}
                    <span className="shrink-0 text-[12.5px] font-extrabold text-stone-700">{Math.round(m.kcal)}</span>
                    <button
                      onClick={() => removeLogEntry(active, m.id)}
                      className="shrink-0 grid h-7 w-7 place-items-center rounded-full text-stone-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      aria-label={`Remove ${m.name} from ${s.label}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {/* Picker */}
      <FoodPicker
        open={pickerSlot !== null}
        slot={pickerSlot ?? "breakfast"}
        onClose={() => setPickerSlot(null)}
        onAdd={(entry) => addLogEntry(active, entry)}
      />
    </div>
  );
}
