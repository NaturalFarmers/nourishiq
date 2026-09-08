"use client";

import { useMemo, useState } from "react";
import { useNourish, dateKey } from "@/lib/nourishiq/store";
import { computePrescription, GOALS, bmiInfo } from "@/lib/nourishiq/engine";
import { buildReport, shortDate } from "@/lib/nourishiq/progress";
import { exportReportPdf } from "@/lib/nourishiq/pdf";
import type { ViewId } from "./HomeView";
import { useHydrated, Skeleton } from "./primitives";
import { DayDots, Sparkline } from "./charts";

export default function ReportView({ go }: { go: (v: ViewId) => void }) {
  const hydrated = useHydrated();
  const passportId = useNourish((s) => s.passportId);
  const profile = useNourish((s) => s.profile);
  const logs = useNourish((s) => s.logs);
  const measurements = useNourish((s) => s.measurements);

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const rx = hydrated ? computePrescription(profile) : null;
  const report = useMemo(
    () => (hydrated && rx ? buildReport(passportId, profile, rx, logs, measurements) : null),
    [hydrated, rx, passportId, profile, logs, measurements],
  );

  if (!hydrated) {
    return (
      <div className="px-5 pt-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!rx || !report) {
    return (
      <div className="px-5 pt-5 pb-8 space-y-4">
        <section className="rounded-[26px] bg-white border border-stone-200/80 p-5 text-center">
          <span className="text-4xl" aria-hidden>🧾</span>
          <h1 className="mt-2 text-[17px] font-extrabold text-stone-900">No prescription to report on yet</h1>
          <p className="text-[12.5px] text-stone-500 mt-1.5 leading-relaxed">
            The nutritionist report compiles your prescription, adherence streaks, weight &amp; waist
            trends and top foods. Take the 2-minute intake first.
          </p>
          <button
            onClick={() => go("assessment")}
            className="mt-4 w-full rounded-2xl bg-[#0B5C46] py-3 text-[13.5px] font-bold text-white active:scale-[0.99] transition-transform"
          >
            Take the intake
          </button>
        </section>
      </div>
    );
  }

  const goal = GOALS.find((g) => g.id === profile.goal);
  const a = report.adherence;
  const bmi = bmiInfo(report.weight.current, profile.heightCm);
  const todayTotals = logs[dateKey()]
    ? logs[dateKey()].meals.reduce(
        (acc, m) => ({
          kcal: acc.kcal + m.kcal, protein: acc.protein + m.protein,
          carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat, fiber: acc.fiber + m.fiber,
        }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      )
    : null;

  const doExport = async () => {
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const res = await exportReportPdf(report);
      setDone(res === "shared" ? "Report shared" : "Report PDF downloaded — find it in your files");
    } catch {
      setErr("Could not build the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-5 pt-5 pb-8 space-y-4">
      {/* Hero */}
      <section className="rounded-[26px] bg-gradient-to-br from-[#0B5C46] to-[#0E6B4E] text-white p-5">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-white/70">
          Nutritionist report · {report.generatedAt}
        </p>
        <h1 className="mt-1 text-[20px] font-extrabold tracking-tight leading-snug">
          {profile.sex === "male" ? "Male" : "Female"}, {profile.age} · Passport {passportId || "—"}
        </h1>
        <p className="text-[12.5px] text-white/80 mt-0.5">
          {goal?.emoji} {rx.goalLabel} · BMI {bmi.bmi} ({bmi.category}) · {rx.kcal.toLocaleString()} kcal/day
        </p>
      </section>

      {/* Prescription snapshot */}
      <section className="rounded-[26px] bg-white border border-stone-200/80 p-4" aria-label="prescription snapshot">
        <h2 className="text-[14px] font-extrabold text-stone-900">📋 Prescription snapshot</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { l: "Energy", v: `${rx.kcal.toLocaleString()}`, u: "kcal" },
            { l: "Protein", v: `${rx.proteinG}`, u: "g" },
            { l: "Carbs", v: `${rx.carbsG}`, u: "g" },
            { l: "Fat", v: `${rx.fatG}`, u: "g" },
            { l: "Fibre", v: `${rx.fiberG}`, u: "g" },
            { l: "Water", v: `${(rx.waterMl / 1000).toFixed(1)}`, u: "L" },
          ].map((m) => (
            <div key={m.l} className="rounded-2xl bg-stone-50 px-3 py-2.5 text-center">
              <p className="text-[10px] font-bold text-stone-500">{m.l}</p>
              <p className="text-[15px] font-extrabold text-stone-900">
                {m.v}<span className="text-[10px] font-bold text-stone-400 ml-0.5">{m.u}</span>
              </p>
            </div>
          ))}
        </div>
        {todayTotals && todayTotals.kcal > 0 && (
          <p className="mt-2.5 text-[11px] text-stone-500">
            Today so far: {Math.round(todayTotals.kcal)} kcal · P {Math.round(todayTotals.protein)} g · C {Math.round(todayTotals.carbs)} g · F {Math.round(todayTotals.fat)} g
          </p>
        )}
      </section>

      {/* Adherence */}
      <section className="rounded-[26px] bg-white border border-stone-200/80 p-4" aria-label="adherence summary">
        <h2 className="text-[14px] font-extrabold text-stone-900">🎯 Adherence</h2>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-[#E4F6EE]/70 px-3.5 py-3">
            <p className="text-[10.5px] font-bold text-stone-500">Last 7 days</p>
            <p className="text-[17px] font-extrabold text-[#0B5C46]">{a.adherencePct7}%</p>
            <p className="text-[10px] font-semibold text-stone-400">{a.loggingDays7}/7 days logged</p>
          </div>
          <div className="rounded-2xl bg-[#E4F6EE]/70 px-3.5 py-3">
            <p className="text-[10.5px] font-bold text-stone-500">Last 28 days</p>
            <p className="text-[17px] font-extrabold text-[#0B5C46]">{a.adherencePct28}%</p>
            <p className="text-[10px] font-semibold text-stone-400">targets met on logged days</p>
          </div>
        </div>
        <div className="mt-3">
          <DayDots days={a.days7} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-bold text-stone-600">🔥 {a.loggingStreak}-day log streak</span>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-bold text-stone-600">🎯 {a.onTrackStreak}-day on-track</span>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-bold text-stone-600">🏆 best {a.bestOnTrackStreak}-day on-track</span>
        </div>
        <div className="mt-3 rounded-2xl bg-stone-50 px-3.5 py-3 text-[11.5px] text-stone-600 leading-relaxed">
          Averages (logged days, last 7): <b>{a.avgKcal7 ?? "—"} kcal</b> · protein <b>{a.avgProtein7 ?? "—"} g</b> of {rx.proteinG} g ·
          fibre <b>{a.avgFiber7 ?? "—"} g</b> of {rx.fiberG} g · water <b>{a.avgWater7 != null ? (a.avgWater7 / 1000).toFixed(1) : "—"} L</b> of {(rx.waterMl / 1000).toFixed(1)} L.
        </div>
      </section>

      {/* Weight & waist */}
      <section className="rounded-[26px] bg-white border border-stone-200/80 p-4" aria-label="body measurements">
        <h2 className="text-[14px] font-extrabold text-stone-900">⚖️ Weight &amp; waist</h2>
        <div className="mt-3 space-y-2.5">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-[12.5px] font-extrabold text-stone-800">Weight</p>
              <p className="text-[11px] text-stone-500">
                {report.weight.current} kg now
                {report.weight.deltaKg !== null && <> · {report.weight.deltaKg > 0 ? "+" : ""}{report.weight.deltaKg} kg since {shortDate(report.weight.series[0].date)}</>}
                {" "}· healthy {report.weight.targetMin}–{report.weight.targetMax} kg
              </p>
            </div>
            <Sparkline series={report.weight.series.map((p) => p.value)} color="#0B5C46" />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-[12.5px] font-extrabold text-stone-800">Waist</p>
              <p className="text-[11px] text-stone-500">
                {report.waist.current != null ? `${report.waist.current} cm now` : "not logged yet"}
                {report.waist.deltaCm !== null && <> · {report.waist.deltaCm > 0 ? "+" : ""}{report.waist.deltaCm} cm</>}
                {" "}· goal &lt; {report.waist.target} cm
              </p>
            </div>
            <Sparkline series={report.waist.series.map((p) => p.value)} color="#D96C0B" />
          </div>
        </div>
      </section>

      {/* Top foods */}
      <section className="rounded-[26px] bg-white border border-stone-200/80 p-4" aria-label="top foods">
        <h2 className="text-[14px] font-extrabold text-stone-900">🥗 Most-logged foods (28 days)</h2>
        {report.topFoods.length === 0 ? (
          <p className="mt-2 text-[12px] text-stone-400">No foods logged in the last 28 days.</p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-100">
            {report.topFoods.map((f) => (
              <li key={f.name} className="flex items-center gap-3 py-2">
                <span className="text-base" aria-hidden>{f.emoji}</span>
                <span className="flex-1 min-w-0 truncate text-[12.5px] font-bold text-stone-700">{f.name}</span>
                <span className="text-[11px] font-semibold text-stone-400">×{f.count}</span>
                <span className="w-16 text-right text-[11.5px] font-extrabold text-stone-700">{f.kcal.toLocaleString()} kcal</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Export */}
      <section className="rounded-[26px] bg-white border border-stone-200/80 p-4">
        <h2 className="text-[14px] font-extrabold text-stone-900">📤 Share with your nutritionist</h2>
        <p className="text-[12px] text-stone-500 mt-1 leading-relaxed">
          Generates a branded A4 PDF: patient snapshot, prescription, adherence streaks,
          measurement trends with charts, and your most-logged foods.
        </p>
        <button
          onClick={doExport}
          disabled={busy}
          className="mt-3 w-full rounded-2xl bg-[#0B5C46] py-3.5 text-[14px] font-extrabold text-white disabled:opacity-60 active:scale-[0.99] transition-transform"
        >
          {busy ? "Building report…" : "Export report as PDF"}
        </button>
        {done && <p className="mt-2 text-[12px] font-bold text-[#0E6B4E]" role="status">{done}</p>}
        {err && <p className="mt-2 text-[12px] font-bold text-red-500" role="alert">{err}</p>}
        <p className="mt-2 text-[10.5px] text-stone-400 leading-relaxed">
          Everything in this report stays on your device until you choose to share the PDF.
        </p>
      </section>
    </div>
  );
}
