// ─── Progress analytics: adherence, streaks, measurements, report ───────────
// Pure, deterministic functions consumed by ProgressView, ReportView,
// exportReportPdf() and the AI-nutritionist context.

import type {
  UserProfile,
  Prescription,
  DayLog,
  Measurement,
} from "./types";
import { totalsOf, dateKey } from "./store";

// ─── Adherence ───────────────────────────────────────────────────────────────

export type DayStatus = "full" | "partial" | "missed" | "empty";

export interface DayAdherence {
  date: string;
  logged: boolean;
  /** each 0..1 against its criterion, null when nothing logged that day */
  kcalPct: number | null;
  proteinPct: number | null;
  fiberPct: number | null;
  waterPct: number | null;
  /** how many of the 4 criteria were met (0–4) */
  met: number;
  status: DayStatus;
}

/** Adherence criteria: kcal within 90–110% · protein ≥85% · fibre ≥70% · water ≥75%. */
export function adherenceForDay(
  logs: Record<string, DayLog>,
  rx: Prescription,
  date: string,
): DayAdherence {
  const day = logs[date];
  const t = totalsOf(day);
  const logged = !!day && day.meals.length > 0;
  if (!logged) {
    return {
      date, logged: false,
      kcalPct: null, proteinPct: null, fiberPct: null, waterPct: null,
      met: 0, status: "empty",
    };
  }
  const kcalPct = rx.kcal > 0 ? t.kcal / rx.kcal : 0;
  const proteinPct = rx.proteinG > 0 ? t.protein / rx.proteinG : 0;
  const fiberPct = rx.fiberG > 0 ? t.fiber / rx.fiberG : 0;
  const waterPct = rx.waterMl > 0 ? (day?.waterMl ?? 0) / rx.waterMl : 0;
  let met = 0;
  if (kcalPct >= 0.9 && kcalPct <= 1.1) met++;
  if (proteinPct >= 0.85) met++;
  if (fiberPct >= 0.7) met++;
  if (waterPct >= 0.75) met++;
  const status: DayStatus = met >= 4 ? "full" : met >= 2 ? "partial" : "missed";
  return {
    date, logged: true,
    kcalPct, proteinPct, fiberPct, waterPct,
    met, status,
  };
}

export interface WeekBucket {
  label: string; // "This week", "Last wk", "Wk of 11 Aug"…
  start: string; // YYYY-MM-DD of week start (Monday)
  days: DayAdherence[]; // Mon..Sun, may include future → status "empty"
  loggedCount: number;
  /** average criteria-met across logged days (0–1) */
  score: number;
}

export interface AdherenceSummary {
  days7: DayAdherence[]; // oldest → newest, ends today
  last28: DayAdherence[];
  weeks: WeekBucket[]; // oldest → newest (n weeks, ends current week)
  adherencePct7: number; // 0–100, share of criteria met on logged days
  adherencePct28: number;
  loggingDays7: number;
  avgKcal7: number | null;
  avgProtein7: number | null;
  avgFiber7: number | null;
  avgWater7: number | null;
  loggingStreak: number; // consecutive days with ≥1 item (ends today or yesterday)
  onTrackStreak: number; // consecutive days meeting ≥3 of 4 criteria
  bestOnTrackStreak: number;
  bestLoggingStreak: number;
}

function shiftDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return dateKey(d);
}

/** Monday-based week start for a given date key. */
export function weekStartOf(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = (dt.getDay() + 6) % 7; // Mon=0
  dt.setDate(dt.getDate() - dow);
  return dateKey(dt);
}

export function buildAdherenceSummary(
  logs: Record<string, DayLog>,
  rx: Prescription,
  weeks = 5,
): AdherenceSummary {
  // 28 days oldest → newest
  const last28: DayAdherence[] = [];
  for (let i = 27; i >= 0; i--) last28.push(adherenceForDay(logs, rx, shiftDate(i)));
  const days7 = last28.slice(-7);

  // weekly buckets (Monday start), oldest → newest
  const weekList: WeekBucket[] = [];
  const thisMonday = weekStartOf(dateKey());
  for (let w = weeks - 1; w >= 0; w--) {
    const startD = new Date();
    const [y, m, d] = thisMonday.split("-").map(Number);
    startD.setFullYear(y, m - 1, d);
    startD.setDate(startD.getDate() - w * 7);
    const start = dateKey(startD);
    const days: DayAdherence[] = [];
    for (let i = 0; i < 7; i++) {
      const dd = new Date(startD);
      dd.setDate(dd.getDate() + i);
      days.push(adherenceForDay(logs, rx, dateKey(dd)));
    }
    const loggedDays = days.filter((x) => x.logged);
    const score = loggedDays.length
      ? loggedDays.reduce((a, x) => a + x.met, 0) / (loggedDays.length * 4)
      : 0;
    const label =
      w === 0 ? "This week" : w === 1 ? "Last week" : `Wk ${start.slice(8)}/${start.slice(5, 7)}`;
    weekList.push({ label, start, days, loggedCount: loggedDays.length, score });
  }

  const pct = (arr: DayAdherence[]) => {
    const logged = arr.filter((x) => x.logged);
    return logged.length
      ? Math.round((logged.reduce((a, x) => a + x.met, 0) / (logged.length * 4)) * 100)
      : 0;
  };

  // averages over last 7 days (only logged days)
  const logged7 = days7.filter((x) => x.logged);
  // recompute raw grams from logs for averages
  let kcalSum = 0, proSum = 0, fibSum = 0, waterSum = 0, n = 0;
  for (const d of days7) {
    const day = logs[d.date];
    if (!day || day.meals.length === 0) continue;
    const t = totalsOf(day);
    kcalSum += t.kcal; proSum += t.protein; fibSum += t.fiber; waterSum += day.waterMl; n++;
  }

  // streaks — walk back from today
  let loggingStreak = 0;
  for (let i = 0; i < 28; i++) {
    const a = adherenceForDay(logs, rx, shiftDate(i));
    if (a.logged) loggingStreak++;
    else if (i === 0) continue; // today not logged yet doesn't break yesterday's streak
    else break;
  }

  let onTrackStreak = 0;
  for (let i = 0; i < 28; i++) {
    const a = adherenceForDay(logs, rx, shiftDate(i));
    if (a.logged && a.met >= 3) onTrackStreak++;
    else if (i === 0) continue;
    else break;
  }

  // best streaks within last 28 days
  let bestLogging = 0, runLog = 0, bestOnTrack = 0, runOn = 0;
  for (const a of last28) {
    if (a.logged) { runLog++; bestLogging = Math.max(bestLogging, runLog); }
    else runLog = 0;
    if (a.logged && a.met >= 3) { runOn++; bestOnTrack = Math.max(bestOnTrack, runOn); }
    else if (a.logged) runOn = 0;
    else runOn = 0;
  }

  return {
    days7,
    last28,
    weeks: weekList,
    adherencePct7: pct(days7),
    adherencePct28: pct(last28),
    loggingDays7: logged7.length,
    avgKcal7: n ? Math.round(kcalSum / n) : null,
    avgProtein7: n ? Math.round(proSum / n) : null,
    avgFiber7: n ? Math.round(fibSum / n) : null,
    avgWater7: n ? Math.round(waterSum / n) : null,
    loggingStreak,
    onTrackStreak,
    bestOnTrackStreak: bestOnTrack,
    bestLoggingStreak: bestLogging,
  };
}

// ─── Calories vs budget (weekly) ─────────────────────────────────────────────

export interface CalorieDay {
  date: string; // YYYY-MM-DD
  /** total kcal eaten that day; null when nothing was logged */
  kcal: number | null;
}

export interface CalorieWeek {
  label: string; // "This week", "Last week", "Wk 25/08"
  start: string; // YYYY-MM-DD of Monday
  days: CalorieDay[]; // Mon..Sun (future days → kcal null)
  loggedCount: number;
  /** mean kcal across logged days, rounded */
  avgKcal: number | null;
  /** daily budget × logged days — the fair week budget */
  budgetTotal: number | null;
  /** consumed − budgetTotal (+ = over budget) */
  netKcal: number | null;
  /** logged days above 110% of the daily budget */
  overDays: number;
  /** logged days within 90–110% of the daily budget */
  withinDays: number;
  /** logged days below 90% of the daily budget */
  underDays: number;
}

export interface CalorieBudgetSummary {
  weeks: CalorieWeek[]; // oldest → newest, ends current week
  budget: number; // daily kcal budget (rx.kcal)
}

/**
 * Weekly "calories vs budget" buckets for the Progress view.
 * Same Monday-based week windows as the adherence summary so the two
 * sections always tell one coherent story.
 */
export function buildCalorieBudgetWeeks(
  logs: Record<string, DayLog>,
  rx: Prescription,
  weeks = 5,
): CalorieBudgetSummary {
  const list: CalorieWeek[] = [];
  const thisMonday = weekStartOf(dateKey());
  const [y0, m0, d0] = thisMonday.split("-").map(Number);

  for (let w = weeks - 1; w >= 0; w--) {
    const startD = new Date();
    startD.setFullYear(y0, m0 - 1, d0);
    startD.setDate(startD.getDate() - w * 7);
    const start = dateKey(startD);

    const days: CalorieDay[] = [];
    for (let i = 0; i < 7; i++) {
      const dd = new Date(startD);
      dd.setDate(dd.getDate() + i);
      const dk = dateKey(dd);
      const day = logs[dk];
      const logged = !!day && day.meals.length > 0;
      days.push({ date: dk, kcal: logged ? Math.round(totalsOf(day).kcal) : null });
    }

    const kvals = days.map((x) => x.kcal).filter((v): v is number => v != null);
    const loggedCount = kvals.length;
    const kcalSum = kvals.reduce((a, b) => a + b, 0);
    const avgKcal = loggedCount ? Math.round(kcalSum / loggedCount) : null;
    const budgetTotal = loggedCount ? rx.kcal * loggedCount : null;
    const netKcal = budgetTotal != null ? kcalSum - budgetTotal : null;
    const overDays = kvals.filter((v) => v > rx.kcal * 1.1).length;
    const withinDays = kvals.filter((v) => v >= rx.kcal * 0.9 && v <= rx.kcal * 1.1).length;
    const underDays = loggedCount - overDays - withinDays;

    const label =
      w === 0 ? "This week" : w === 1 ? "Last week" : `Wk ${start.slice(8)}/${start.slice(5, 7)}`;

    list.push({ label, start, days, loggedCount, avgKcal, budgetTotal, netKcal, overDays, withinDays, underDays });
  }

  return { weeks: list, budget: rx.kcal };
}

/** 7,700 kcal ≈ 1 kg of body fat — the standard rough conversion. */
const KCAL_PER_KG = 7700;

/**
 * Plain-language weekly summary, personalised by the user's goal.
 * Pure so the bun test script can assert on the wording.
 */
export function calorieBudgetInsight(
  w: CalorieWeek,
  budget: number,
  goal: UserProfile["goal"],
): string {
  if (w.loggedCount === 0)
    return "Nothing logged this week yet — add meals in the diary to see how you compare.";

  const avg = w.avgKcal ?? 0;
  const net = w.netKcal ?? 0;
  const pct = budget > 0 ? Math.round((avg / budget) * 100) : 0;
  const kg = Math.abs(net / KCAL_PER_KG);
  const kgTxt = kg >= 0.05 ? ` (≈ ${net > 0 ? "+" : "-"}${kg.toFixed(1)} kg/week at this pace)` : "";
  const isGain = goal === "muscle_gain" || goal === "weight_gain";
  const isLoss = goal === "weight_loss" || goal === "visceral_fat";

  if (w.withinDays === w.loggedCount)
    return `Spot on — all ${w.loggedCount} logged day${w.loggedCount > 1 ? "s" : ""} landed within ±10% of your budget.`;

  if (net > 0)
    return `Averaging ${pct}% of budget — over by ${Math.abs(net).toLocaleString("en-IN")} kcal this week${kgTxt}. ${
      isGain
        ? "That surplus supports your gain goal — keep it protein-forward."
        : "Trim evening portions to pull the weekly average back to budget."
    }`;

  if (net < 0)
    return `Averaging ${pct}% of budget — under by ${Math.abs(net).toLocaleString("en-IN")} kcal this week${kgTxt}. ${
      isLoss
        ? "A steady deficit is exactly how sustainable loss works."
        : isGain
          ? "Too little to gain on — add one energy-dense snack a day."
          : "Occasional shortfalls are fine — just avoid large, frequent deficits."
    }`;

  return "Exactly on budget for the week — your over and under days balanced out.";
}

// ─── Measurements ────────────────────────────────────────────────────────────

export interface SeriesPoint { date: string; value: number }

/** Sorted (oldest → newest) series for weight or waist. */
export function measurementSeries(
  measurements: Record<string, Measurement>,
  field: "weightKg" | "waistCm",
): SeriesPoint[] {
  return Object.values(measurements)
    .filter((m) => typeof m[field] === "number")
    .map((m) => ({ date: m.date, value: m[field] as number }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Latest value, falling back to the intake profile weight when nothing logged yet. */
export function latestWeight(
  measurements: Record<string, Measurement>,
  profile: UserProfile,
): { value: number; fromProfile: boolean; date?: string } {
  const s = measurementSeries(measurements, "weightKg");
  if (s.length) return { value: s[s.length - 1].value, fromProfile: false, date: s[s.length - 1].date };
  return { value: profile.weightKg, fromProfile: true };
}

/** Healthy-weight goal in kg: BMI 18.5–22.9 band (Asian-Indian thresholds). */
export function healthyWeightBand(heightCm: number): { min: number; max: number } {
  const m = heightCm / 100;
  return { min: Math.round(18.5 * m * m * 10) / 10, max: Math.round(22.9 * m * m * 10) / 10 };
}

/** IDF/WHO central-obesity thresholds for South Asians. */
export function waistTargetOf(sex: "male" | "female"): number {
  return sex === "male" ? 90 : 80;
}

// ─── Report ──────────────────────────────────────────────────────────────────

export interface ReportTopFood {
  name: string;
  emoji: string;
  count: number;
  kcal: number;
}

export interface ReportData {
  passportId: string;
  generatedAt: string; // display string
  profile: UserProfile;
  rx: Prescription;
  adherence: AdherenceSummary;
  weight: {
    series: SeriesPoint[];
    start: number | null;
    current: number;
    deltaKg: number | null;
    targetMin: number;
    targetMax: number;
    fromProfile: boolean;
  };
  waist: {
    series: SeriesPoint[];
    start: number | null;
    current: number | null;
    deltaCm: number | null;
    target: number;
  };
  topFoods: ReportTopFood[];
  waterAvgMl7: number | null;
}

export function buildReport(
  passportId: string,
  profile: UserProfile,
  rx: Prescription,
  logs: Record<string, DayLog>,
  measurements: Record<string, Measurement>,
): ReportData {
  const adherence = buildAdherenceSummary(logs, rx, 5);

  const wSeries = measurementSeries(measurements, "weightKg");
  const start = wSeries.length ? wSeries[0].value : profile.weightKg;
  const currentW = latestWeight(measurements, profile);
  const weight = {
    series: wSeries,
    start,
    current: currentW.value,
    deltaKg: wSeries.length >= 2
      ? Math.round((wSeries[wSeries.length - 1].value - wSeries[0].value) * 10) / 10
      : null,
    targetMin: healthyWeightBand(profile.heightCm).min,
    targetMax: healthyWeightBand(profile.heightCm).max,
    fromProfile: currentW.fromProfile,
  };

  const cSeries = measurementSeries(measurements, "waistCm");
  const waist = {
    series: cSeries,
    start: cSeries.length ? cSeries[0].value : null,
    current: cSeries.length ? cSeries[cSeries.length - 1].value : null,
    deltaCm: cSeries.length >= 2
      ? Math.round((cSeries[cSeries.length - 1].value - cSeries[0].value) * 10) / 10
      : null,
    target: waistTargetOf(profile.sex),
  };

  // top foods over last 28 days by log frequency
  const counts = new Map<string, { emoji: string; count: number; kcal: number }>();
  for (let i = 0; i < 28; i++) {
    const day = logs[shiftDate(i)];
    if (!day) continue;
    for (const m of day.meals) {
      const e = counts.get(m.name) ?? { emoji: m.emoji, count: 0, kcal: 0 };
      e.count++;
      e.kcal += m.kcal;
      counts.set(m.name, e);
    }
  }
  const topFoods: ReportTopFood[] = [...counts.entries()]
    .map(([name, v]) => ({ name, emoji: v.emoji, count: v.count, kcal: Math.round(v.kcal) }))
    .sort((a, b) => b.count - a.count || b.kcal - a.kcal)
    .slice(0, 8);

  return {
    passportId,
    generatedAt: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    profile,
    rx,
    adherence,
    weight,
    waist,
    topFoods,
    waterAvgMl7: adherence.avgWater7,
  };
}

/** Short human label for a date key, e.g. 5 Sep */
export function shortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
