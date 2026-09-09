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
