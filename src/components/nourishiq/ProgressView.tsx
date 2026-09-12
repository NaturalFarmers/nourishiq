"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNourish, dateKey } from "@/lib/nourishiq/store";
import { computePrescription } from "@/lib/nourishiq/engine";
import {
  buildAdherenceSummary,
  buildCalorieBudgetWeeks,
  calorieBudgetInsight,
  measurementSeries,
  latestWeight,
  healthyWeightBand,
  waistTargetOf,
  shortDate,
} from "@/lib/nourishiq/progress";
import type { ViewId } from "./HomeView";
import { useHydrated, Skeleton } from "./primitives";
import { TrendChart, WeekBars, DayDots, BudgetWeekBars, DayKcalBars, StepsTrendChart } from "./charts";
import { buildStepsWeeks } from "@/lib/nourishiq/steps";

const CRITERIA = [
  { key: "kcal", label: "Calories", note: "within ±10% of target" },
  { key: "protein", label: "Protein", note: "85%+ of target" },
  { key: "fiber", label: "Fibre", note: "70%+ of target" },
  { key: "water", label: "Water", note: "75%+ of goal" },
] as const;

export default function ProgressView({ go }: { go: (v: ViewId) => void }) {
  const hydrated = useHydrated();
  const profile = useNourish((s) => s.profile);
  const logs = useNourish((s) => s.logs);
  const measurements = useNourish((s) => s.measurements);
  const setMeasurement = useNourish((s) => s.setMeasurement);

  const [wInput, setWInput] = useState("");
  const [cInput, setCInput] = useState("");
  const [mErr, setMErr] = useState<string | null>(null);
  /** which week is shown in the day-by-day strip (0 = oldest, 4 = this week) */
  const [wkIdx, setWkIdx] = useState(4);
  /** which week the steps trend card shows (0 = oldest, 4 = this week) */
  const [sWkIdx, setSWkIdx] = useState(4);

  const rx = hydrated ? computePrescription(profile) : null;

  const adherence = useMemo(
    () => (hydrated && rx ? buildAdherenceSummary(logs, rx, 5) : null),
    [hydrated, rx, logs],
  );

  const calorieWeeks = useMemo(
    () => (hydrated && rx ? buildCalorieBudgetWeeks(logs, rx, 5) : null),
    [hydrated, rx, logs],
  );

  const wSeries = useMemo(() => measurementSeries(measurements, "weightKg"), [measurements]);
  const cSeries = useMemo(() => measurementSeries(measurements, "waistCm"), [measurements]);
  const stepsWeeks = useMemo(
    () => (hydrated ? buildStepsWeeks(5, profile.weightKg) : null),
    [hydrated, profile.weightKg],
  );
  const cur = latestWeight(measurements, profile);
  const band = healthyWeightBand(profile.heightCm);
  const cTarget = waistTargetOf(profile.sex);

  if (!hydrated) {
    return (
      <div className="px-5 pt-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const wDelta = wSeries.length >= 2
    ? Math.round((wSeries[wSeries.length - 1].value - wSeries[0].value) * 10) / 10
    : null;
  const cDelta = cSeries.length >= 2
    ? Math.round((cSeries[cSeries.length - 1].value - cSeries[0].value) * 10) / 10
    : null;

  const saveMeasurement = (kind: "weightKg" | "waistCm") => {
    const raw = kind === "weightKg" ? wInput : cInput;
    const v = parseFloat(raw);
    if (!raw || Number.isNaN(v)) {
      setMErr("Enter a number first");
      return;
    }
    if (kind === "weightKg" && (v < 20 || v > 300)) {
      setMErr("Weight looks out of range (20–300 kg)");
      return;
    }
    if (kind === "waistCm" && (v < 40 || v > 200)) {
      setMErr("Waist looks out of range (40–200 cm)");
      return;
    }
    setMErr(null);
    setMeasurement(dateKey(), { [kind]: Math.round(v * 10) / 10 });
    if (kind === "weightKg") setWInput(""); else setCInput("");
  };

  // per-criterion averages for the legend
  const avgPct = (pick: (d: { kcalPct: number | null; proteinPct: number | null; fiberPct: number | null; waterPct: number | null }) => number | null) => {
    if (!adherence) return null;
    const vals = adherence.days7.filter((d) => d.logged).map(pick).filter((v): v is number => v != null);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) : null;
  };

  // ── calories vs budget helpers ──
  const wkLen = calorieWeeks?.weeks.length ?? 1;
  const selIdx = Math.min(wkIdx, wkLen - 1);
  const selWeek = calorieWeeks?.weeks[selIdx] ?? null;
  const addDays = (ds: string, n: number): string => {
    const [y, m, d] = ds.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + n);
    return dateKey(dt);
  };

  // ── steps helpers (stepsWeeks windows are parallel to calorieWeeks) ──
  const selStepsIdx = stepsWeeks ? Math.min(sWkIdx, stepsWeeks.length - 1) : 0;
  const selStepsWeek = stepsWeeks?.[selStepsIdx] ?? null;
  const earnedByDate: Record<string, number> | undefined =
    stepsWeeks && calorieWeeks
      ? Object.fromEntries(stepsWeeks[selIdx].days.map((d) => [d.date, d.earnedKcal ?? 0]))
      : undefined;

  return (
    <div className="px-5 pt-5 pb-8 space-y-4">
      {/* Header */}
      <section className="rounded-[26px] bg-gradient-to-br from-[#0B5C46] to-[#0E6B4E] text-white p-5" aria-label="progress header">
        <h1 className="text-[19px] font-extrabold tracking-tight">Your progress</h1>
        <p className="text-[12.5px] text-white/80 mt-0.5">
          Weight, waist &amp; how consistently you follow your prescription.
        </p>
        {adherence && (
          <div className="mt-3.5 flex items-center gap-2.5">
            <div className="rounded-2xl bg-white/12 px-3.5 py-2 backdrop-blur-sm">
              <span className="block text-[17px] font-extrabold leading-none">🔥 {adherence.loggingStreak}</span>
              <span className="block text-[9.5px] font-bold text-white/70 mt-1">day log streak</span>
            </div>
            <div className="rounded-2xl bg-white/12 px-3.5 py-2 backdrop-blur-sm">
              <span className="block text-[17px] font-extrabold leading-none">🎯 {adherence.onTrackStreak}</span>
              <span className="block text-[9.5px] font-bold text-white/70 mt-1">day on-track streak</span>
            </div>
            <div className="rounded-2xl bg-white/12 px-3.5 py-2 backdrop-blur-sm">
              <span className="block text-[17px] font-extrabold leading-none">{adherence.adherencePct28}%</span>
              <span className="block text-[9.5px] font-bold text-white/70 mt-1">28-day adherence</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Quick log measurements ── */}
      <section className="rounded-[26px] bg-white border border-stone-200/80 p-4" aria-label="log measurements">
        <h2 className="text-[14px] font-extrabold text-stone-900">📏 Log today&apos;s measurements</h2>
        <p className="text-[11.5px] text-stone-500 mt-0.5">
          Weigh in the morning, waist at the navel. Same time each week = clean trend.
        </p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* weight */}
          <div className="rounded-2xl bg-[#E4F6EE]/60 p-3">
            <label htmlFor="w-in" className="block text-[11px] font-extrabold text-[#0E6B4E] uppercase tracking-wide">
              Weight (kg)
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="w-in"
                inputMode="decimal"
                type="number"
                step="0.1"
                placeholder={cur.fromProfile ? `${profile.weightKg} (from intake)` : `${cur.value}`}
                value={wInput}
                onChange={(e) => setWInput(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[14px] font-bold text-stone-800 outline-none focus:border-[#0B5C46]"
              />
              <button
                onClick={() => saveMeasurement("weightKg")}
                className="rounded-xl bg-[#0B5C46] px-4 text-[13px] font-bold text-white active:scale-95 transition-transform"
              >
                Save
              </button>
            </div>
            <p className="text-[10.5px] text-stone-500 mt-1.5">
              Latest: <b>{cur.value} kg</b>
              {wDelta !== null && (
                <> · change <b className={wDelta <= 0 ? "text-[#0E6B4E]" : "text-[#D96C0B]"}>{wDelta > 0 ? "+" : ""}{wDelta} kg</b></>
              )}
            </p>
          </div>
          {/* waist */}
          <div className="rounded-2xl bg-[#FCEFD9]/60 p-3">
            <label htmlFor="c-in" className="block text-[11px] font-extrabold text-[#D96C0B] uppercase tracking-wide">
              Waist (cm)
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="c-in"
                inputMode="decimal"
                type="number"
                step="0.5"
                placeholder={cSeries.length ? `${cSeries[cSeries.length - 1].value}` : "—"}
                value={cInput}
                onChange={(e) => setCInput(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[14px] font-bold text-stone-800 outline-none focus:border-[#D96C0B]"
              />
              <button
                onClick={() => saveMeasurement("waistCm")}
                className="rounded-xl bg-[#D96C0B] px-4 text-[13px] font-bold text-white active:scale-95 transition-transform"
              >
                Save
              </button>
            </div>
            <p className="text-[10.5px] text-stone-500 mt-1.5">
              {cSeries.length
                ? <>Latest: <b>{cSeries[cSeries.length - 1].value} cm</b>{cDelta !== null && <> · change <b className={cDelta <= 0 ? "text-[#0E6B4E]" : "text-[#D96C0B]"}>{cDelta > 0 ? "+" : ""}{cDelta} cm</b></>}</>
                : <>Goal: under <b>{cTarget} cm</b> ({profile.sex === "male" ? "men" : "women"}, South-Asian threshold)</>}
            </p>
          </div>
        </div>
        {mErr && <p className="mt-2 text-[11.5px] font-bold text-red-500" role="alert">{mErr}</p>}
      </section>

      {/* ── Weight chart ── */}
      <section className="rounded-[26px] bg-white border border-stone-200/80 p-4" aria-label="weight chart">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[14px] font-extrabold text-stone-900">⚖️ Weight trend</h2>
          <span className="text-[11px] font-bold text-stone-400">
            {wSeries.length} {wSeries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        {wSeries.length >= 2 ? (
          <TrendChart
            series={wSeries}
            color="#0B5C46"
            unit=" kg"
            band={{ min: band.min, max: band.max, label: `Healthy ${band.min}–${band.max} kg` }}
            ariaLabel={`Weight trend from ${shortDate(wSeries[0].date)} to ${shortDate(wSeries[wSeries.length - 1].date)}`}
          />
        ) : (
          <div className="mt-3 rounded-2xl bg-stone-50 border border-dashed border-stone-200 px-4 py-6 text-center">
            <p className="text-[12.5px] text-stone-500">
              {wSeries.length === 1
                ? "One entry saved — add another this week to draw your trend."
                : "No weight logged yet. Save your first entry above."}
            </p>
          </div>
        )}
        {wSeries.length >= 2 && (
          <p className="mt-1 text-[11px] text-stone-500">
            Started {cur.value === wSeries[0].value ? "here" : `at ${wSeries[0].value} kg`} on {shortDate(wSeries[0].date)} · healthy band for {profile.heightCm} cm is {band.min}–{band.max} kg.
          </p>
        )}
      </section>

      {/* ── Waist chart ── */}
      <section className="rounded-[26px] bg-white border border-stone-200/80 p-4" aria-label="waist chart">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[14px] font-extrabold text-stone-900">📐 Waist trend</h2>
          <span className="text-[11px] font-bold text-stone-400">
            {cSeries.length} {cSeries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        {cSeries.length >= 2 ? (
          <TrendChart
            series={cSeries}
            color="#D96C0B"
            unit=" cm"
            target={{ value: cTarget, label: `${cTarget} cm goal` }}
            ariaLabel={`Waist trend from ${shortDate(cSeries[0].date)} to ${shortDate(cSeries[cSeries.length - 1].date)}`}
          />
        ) : (
          <div className="mt-3 rounded-2xl bg-stone-50 border border-dashed border-stone-200 px-4 py-6 text-center">
            <p className="text-[12.5px] text-stone-500">
              {cSeries.length === 1
                ? "One entry saved — log again next week to see the line move."
                : "Waist is the best window on visceral fat — log it weekly."}
            </p>
          </div>
        )}
        {cSeries.length >= 2 && (
          <p className="mt-1 text-[11px] text-stone-500">
            Dashed line marks {cTarget} cm — below it, central-obesity risk drops sharply.
          </p>
        )}
      </section>

      {/* ── Calories vs budget ── */}
      {calorieWeeks && rx ? (
        <section className="rounded-[26px] bg-white border border-stone-200/80 p-4" aria-label="weekly calories vs budget">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-[14px] font-extrabold text-stone-900">🔥 Calories vs budget</h2>
            <span className="text-[11px] font-bold text-stone-400 shrink-0">{rx.kcal.toLocaleString("en-IN")} kcal/day</span>
          </div>
          <p className="text-[11.5px] text-stone-500 mt-0.5">
            Weekly intake against your prescription — green bars sit within ±10% of budget.
          </p>

          <div className="mt-1">
            <BudgetWeekBars weeks={calorieWeeks.weeks} budget={calorieWeeks.budget} />
          </div>

          {selWeek && (
            <div className="mt-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setWkIdx(Math.max(0, selIdx - 1))}
                  disabled={selIdx === 0}
                  aria-label="Show previous week"
                  className="rounded-xl bg-stone-100 px-2.5 py-1.5 text-[15px] leading-none font-extrabold text-stone-600 disabled:opacity-30 active:scale-95 transition-transform"
                >
                  ‹
                </button>
                <p className="text-[11.5px] font-extrabold text-stone-600 uppercase tracking-wide text-center">
                  {selWeek.label} · {shortDate(selWeek.start)} – {shortDate(addDays(selWeek.start, 6))}
                </p>
                <button
                  type="button"
                  onClick={() => setWkIdx(Math.min(calorieWeeks.weeks.length - 1, selIdx + 1))}
                  disabled={selIdx === calorieWeeks.weeks.length - 1}
                  aria-label="Show next week"
                  className="rounded-xl bg-stone-100 px-2.5 py-1.5 text-[15px] leading-none font-extrabold text-stone-600 disabled:opacity-30 active:scale-95 transition-transform"
                >
                  ›
                </button>
              </div>
              <div className="mt-1.5">
                <DayKcalBars days={selWeek.days} budget={calorieWeeks.budget} today={dateKey()} earnedByDate={earnedByDate} />
              </div>

              {/* eaten vs earned legend + weekly earned line */}
              <div className="mt-1 flex items-center gap-3 text-[9.5px] font-bold text-stone-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2.5 rounded-[3px] bg-[#0B5C46]" aria-hidden />eaten
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2.5 rounded-[3px] bg-[#8FD6B7]" aria-hidden />earned · steps
                </span>
                {stepsWeeks && (
                  <span className="ml-auto font-extrabold text-[#0E6B4E]">
                    +{stepsWeeks[selIdx].earnedTotal.toLocaleString("en-IN")} kcal earned
                  </span>
                )}
              </div>
              {stepsWeeks && (
                <p className="mt-1 text-[10.5px] font-semibold text-stone-500" role="status">
                  👟 Light-green caps add {stepsWeeks[selIdx].earnedTotal.toLocaleString("en-IN")} kcal earned from steps {selWeek.label.toLowerCase()} — they sit on top of eaten calories.
                </p>
              )}

              <div className="mt-1 grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Avg / day",
                    value: selWeek.avgKcal != null ? selWeek.avgKcal.toLocaleString("en-IN") : "—",
                    sub: `budget ${calorieWeeks.budget.toLocaleString("en-IN")}`,
                  },
                  {
                    label: "Week net",
                    value: selWeek.netKcal != null ? `${selWeek.netKcal > 0 ? "+" : ""}${selWeek.netKcal.toLocaleString("en-IN")}` : "—",
                    sub: selWeek.netKcal != null
                      ? Math.abs(selWeek.netKcal / 7700) >= 0.05
                        ? `kcal · ≈ ${selWeek.netKcal > 0 ? "+" : "-"}${Math.abs(selWeek.netKcal / 7700).toFixed(1)} kg`
                        : "kcal"
                      : "kcal",
                  },
                  {
                    label: "Within ±10%",
                    value: selWeek.loggedCount ? `${selWeek.withinDays} of ${selWeek.loggedCount}` : "—",
                    sub: "logged days",
                  },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-stone-50 px-2.5 py-2.5">
                    <p className="text-[10px] font-bold text-stone-500">{s.label}</p>
                    <p className="text-[14.5px] font-extrabold text-stone-900 mt-0.5 truncate">{s.value}</p>
                    <p className="text-[9.5px] font-semibold text-stone-400 truncate">{s.sub}</p>
                  </div>
                ))}
              </div>

              <p className="mt-3 rounded-2xl bg-[#E4F6EE]/70 px-4 py-3 text-[11.5px] font-semibold text-stone-700" role="status">
                {calorieBudgetInsight(selWeek, calorieWeeks.budget, profile.goal)}
              </p>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-[26px] bg-white border border-stone-200/80 p-4" aria-label="calories vs budget locked">
          <h2 className="text-[14px] font-extrabold text-stone-900">🔥 Calories vs budget</h2>
          <p className="text-[12.5px] text-stone-500 mt-1">
            Compare each week&apos;s intake with your daily calorie budget — take the intake to set your budget first.
          </p>
          <button
            onClick={() => go("assessment")}
            className="mt-3 w-full rounded-2xl bg-[#0B5C46] py-3 text-[13.5px] font-bold text-white active:scale-[0.99] transition-transform"
          >
            Take the intake
          </button>
        </section>
      )}

      {/* ── Steps & movement ── */}
      {stepsWeeks && selStepsWeek && (
        <section className="rounded-[26px] bg-white border border-stone-200/80 p-4" aria-label="weekly steps trend">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-[14px] font-extrabold text-stone-900">👟 Steps &amp; movement</h2>
            <span className="shrink-0 rounded-full bg-[#FBF3E2] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#A97715]">
              estimated
            </span>
          </div>
          <p className="text-[11.5px] text-stone-500 mt-0.5">
            Daily step trend — these earned calories are the light-green caps on your day bars.
          </p>

          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSWkIdx(Math.max(0, selStepsIdx - 1))}
              disabled={selStepsIdx === 0}
              aria-label="Show previous steps week"
              className="rounded-xl bg-stone-100 px-2.5 py-1.5 text-[15px] leading-none font-extrabold text-stone-600 disabled:opacity-30 active:scale-95 transition-transform"
            >
              ‹
            </button>
            <p className="text-[11.5px] font-extrabold text-stone-600 uppercase tracking-wide text-center">
              {selStepsWeek.label} · {shortDate(selStepsWeek.start)} – {shortDate(addDays(selStepsWeek.start, 6))}
            </p>
            <button
              type="button"
              onClick={() => setSWkIdx(Math.min(stepsWeeks.length - 1, selStepsIdx + 1))}
              disabled={selStepsIdx === stepsWeeks.length - 1}
              aria-label="Show next steps week"
              className="rounded-xl bg-stone-100 px-2.5 py-1.5 text-[15px] leading-none font-extrabold text-stone-600 disabled:opacity-30 active:scale-95 transition-transform"
            >
              ›
            </button>
          </div>
          <div className="mt-1.5">
            <StepsTrendChart days={selStepsWeek.days} goalSteps={10000} />
          </div>

          <div className="mt-1 grid grid-cols-3 gap-2">
            {[
              {
                label: "Avg / day",
                value: selStepsWeek.avgSteps != null ? selStepsWeek.avgSteps.toLocaleString("en-IN") : "—",
                sub: "steps",
              },
              {
                label: "Week total",
                value: selStepsWeek.totalSteps.toLocaleString("en-IN"),
                sub: "steps",
              },
              {
                label: "Earned",
                value: `+${selStepsWeek.earnedTotal.toLocaleString("en-IN")}`,
                sub: "kcal from steps",
              },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-stone-50 px-2.5 py-2.5">
                <p className="text-[10px] font-bold text-stone-500">{s.label}</p>
                <p className="text-[14.5px] font-extrabold text-stone-900 mt-0.5 truncate">{s.value}</p>
                <p className="text-[9.5px] font-semibold text-stone-400 truncate">{s.sub}</p>
              </div>
            ))}
          </div>

          <p className="mt-2.5 rounded-2xl bg-stone-50 px-4 py-3 text-[11px] font-semibold text-stone-600">
            Estimates from a typical routine until NourishIQ connects to Health Connect on Android. Earned kcal ≈ steps × 0.0004 × {profile.weightKg} kg — today&apos;s count still grows until midnight.
          </p>
        </section>
      )}

      {/* ── Adherence ── */}
      {adherence && rx ? (
        <section className="rounded-[26px] bg-white border border-stone-200/80 p-4" aria-label="weekly adherence">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[14px] font-extrabold text-stone-900">🎯 Weekly adherence</h2>
            <span className="text-[11px] font-bold text-stone-400">targets met / logged days</span>
          </div>
          <WeekBars weeks={adherence.weeks} />

          <div className="mt-3">
            <p className="text-[11.5px] font-extrabold text-stone-600 uppercase tracking-wide mb-2">Last 7 days</p>
            <DayDots days={adherence.days7} />
          </div>

          {/* averages vs targets */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {[
              { label: "Avg kcal/day", value: adherence.avgKcal7 != null ? Math.round(adherence.avgKcal7).toLocaleString() : "—", sub: rx.kcal.toLocaleString(), pct: adherence.avgKcal7 ? Math.round((adherence.avgKcal7 / rx.kcal) * 100) : null },
              { label: "Avg protein", value: adherence.avgProtein7 != null ? `${adherence.avgProtein7} g` : "—", sub: `${rx.proteinG} g`, pct: adherence.avgProtein7 ? Math.round((adherence.avgProtein7 / rx.proteinG) * 100) : null },
              { label: "Avg fibre", value: adherence.avgFiber7 != null ? `${adherence.avgFiber7} g` : "—", sub: `${rx.fiberG} g`, pct: adherence.avgFiber7 ? Math.round((adherence.avgFiber7 / rx.fiberG) * 100) : null },
              { label: "Avg water", value: adherence.avgWater7 != null ? `${(adherence.avgWater7 / 1000).toFixed(1)} L` : "—", sub: `${(rx.waterMl / 1000).toFixed(1)} L`, pct: adherence.avgWater7 ? Math.round((adherence.avgWater7 / rx.waterMl) * 100) : null },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-stone-50 px-3.5 py-3">
                <p className="text-[10.5px] font-bold text-stone-500">{s.label}</p>
                <p className="text-[16px] font-extrabold text-stone-900 mt-0.5">{s.value}</p>
                <p className="text-[10px] font-semibold text-stone-400">
                  target {s.sub}{s.pct != null && ` · ${s.pct}%`}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3.5 rounded-2xl bg-[#E4F6EE]/70 px-4 py-3">
            <p className="text-[11px] font-extrabold text-[#0E6B4E] uppercase tracking-wide">How a day is scored</p>
            <ul className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
              {CRITERIA.map((c) => {
                const p = avgPct((d) => d[`${c.key}Pct` as "kcalPct" | "proteinPct" | "fiberPct" | "waterPct"]);
                return (
                  <li key={c.key} className="text-[11px] text-stone-600 flex items-center justify-between gap-2">
                    <span><b className="text-stone-800">{c.label}</b> — {c.note}</span>
                    {p != null && <span className="font-bold text-[#0E6B4E] shrink-0">{p}%</span>}
                  </li>
                );
              })}
            </ul>
            <p className="text-[10.5px] text-stone-500 mt-2">
              Best streaks: {adherence.bestLoggingStreak}-day logging · {adherence.bestOnTrackStreak}-day on-track (last 28 days). 3 of 4 targets = on-track day.
            </p>
          </div>
        </section>
      ) : (
        <section className="rounded-[26px] bg-white border border-stone-200/80 p-4" aria-label="adherence locked">
          <h2 className="text-[14px] font-extrabold text-stone-900">🎯 Weekly adherence</h2>
          <p className="text-[12.5px] text-stone-500 mt-1">
            Streaks and weekly scores compare your diary against your prescription — take the intake to switch them on.
          </p>
          <button
            onClick={() => go("assessment")}
            className="mt-3 w-full rounded-2xl bg-[#0B5C46] py-3 text-[13.5px] font-bold text-white active:scale-[0.99] transition-transform"
          >
            Take the intake
          </button>
        </section>
      )}

      {/* ── Report CTA ── */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => go("report")}
        className="w-full text-left rounded-[26px] bg-[#FBF3E2] p-4 flex items-center gap-3 ring-1 ring-[#A97715]/15 active:scale-[0.99] transition-transform"
        aria-label="Open nutritionist report"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-[24px] shadow-sm" aria-hidden>🧾</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14.5px] font-extrabold text-[#A97715]">Nutritionist report</span>
          <span className="block text-[12px] text-stone-500">
            One-page summary of prescription, adherence &amp; trends — export as PDF
          </span>
        </span>
        <span className="text-[#A97715] text-lg" aria-hidden>›</span>
      </motion.button>

      {/* today glance for empty diaries */}
      {rx && logs[dateKey()]?.meals?.length === 0 && (
        <button
          onClick={() => go("log")}
          className="w-full text-left rounded-2xl bg-white border border-dashed border-stone-300 px-4 py-3 flex items-center gap-3"
        >
          <span className="text-xl" aria-hidden>📔</span>
          <span className="flex-1 text-[12.5px] text-stone-500">
            Nothing logged today — <b className="text-stone-700">add meals</b> to move your streak.
          </span>
          <span aria-hidden>›</span>
        </button>
      )}
    </div>
  );
}
