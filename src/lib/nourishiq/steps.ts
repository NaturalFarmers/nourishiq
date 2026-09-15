// ─── Steps & earned calories ────────────────────────────────────────────────
// Pure, deterministic module powering the Progress view's movement data:
//  - daily step estimates (web builds have no step sensor, so each calendar
//    date gets a stable, plausible count — the same date always yields the
//    same number),
//  - weight-aware "earned kcal" conversion (steps → calories burned above
//    resting), shown as a light-green cap on the Calories-vs-budget day bars,
//  - Monday-based week builders that share the exact week windows of
//    buildCalorieBudgetWeeks() so the two cards never disagree.
//
// Native wiring: fetchNativeSteps() below now talks to real Health Connect /
// HealthKit through nativeHealth.ts when the app runs inside the Capacitor
// shell (permission + aggregated queries). On the web build it always resolves
// null and callers fall back to estimates or the Takeout CSV import.

import { dateKey } from "./store";
import { weekStartOf } from "./progress";
import { fetchNativeStepsFor, getHealthPlugin } from "./nativeHealth";

/** kcal per step per kg of body weight — ≈0.028 kcal/step at 70 kg (≈280 kcal per 10k steps). */
export const KCAL_PER_STEP_PER_KG = 0.0004;

const MIN_STEPS = 3800;
const MAX_STEPS = 11500;
/** weekends are typically ~25% more active */
const WEEKEND_FACTOR = 1.25;
const HARD_MAX = 14400; // clamp so boosted weekends stay in a sane band

/** FNV-1a 32-bit — tiny, stable, well-distributed string hash. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Deterministic daily step estimate for a date key (YYYY-MM-DD).
 * Stable per calendar day, varied across days, with a weekend bump.
 */
export function estimateStepsForDate(dateStr: string): number {
  const h = fnv1a(`nourishiq-steps-${dateStr}`);
  const base = MIN_STEPS + (h % (MAX_STEPS - MIN_STEPS + 1));
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0 Sun … 6 Sat
  const boosted = Math.round(base * (dow === 0 || dow === 6 ? WEEKEND_FACTOR : 1));
  return Math.min(HARD_MAX, boosted);
}

/**
 * Today's steps so far — today's estimate scaled by how far the day has
 * progressed (≈6% banked by 06:00, ~50% by 14:00, complete by 22:00).
 */
export function estimateStepsToday(now: Date = new Date()): number {
  const full = estimateStepsForDate(dateKey(now));
  const h = now.getHours() + now.getMinutes() / 60;
  const frac = Math.min(1, Math.max(0.06, 0.06 + (Math.max(0, h - 6) / 16) * 0.94));
  return Math.round(full * frac);
}

/** Steps → kcal burned above resting, scaled by body weight. */
export function earnedKcalFromSteps(steps: number, weightKg: number): number {
  if (!steps || steps <= 0 || !weightKg || weightKg <= 0) return 0;
  return Math.round(steps * KCAL_PER_STEP_PER_KG * weightKg);
}

export interface StepsDay {
  date: string; // YYYY-MM-DD
  /** null on future days */
  steps: number | null;
  /** null on future days */
  earnedKcal: number | null;
  isToday: boolean;
  isFuture: boolean;
  /** today only — the count still grows through the day */
  isPartial: boolean;
  /** false when the count comes from real Health Connect / Fit data */
  isEstimated: boolean;
}

export interface StepsWeek {
  label: string; // "This week" / "Last week" / "Wk 25/08"
  start: string; // YYYY-MM-DD of Monday
  days: StepsDay[]; // Mon..Sun
  totalSteps: number;
  avgSteps: number | null;
  earnedTotal: number; // kcal earned across non-future days
  /** days in this week backed by real imported data */
  realDays: number;
}

/**
 * N Monday-based step weeks, oldest → newest, ending with the current week.
 * Week windows are byte-identical to buildCalorieBudgetWeeks() so earned-kcal
 * caps on the day bars always line up with the selected budget week.
 *
 * `realSteps` maps date → real step counts (Health Connect / Google Fit
 * import or the native plugin). Real values always win over estimates and
 * mark the day `isEstimated: false`.
 */
export function buildStepsWeeks(
  weeks = 5,
  weightKg = 70,
  realSteps?: Record<string, number>,
  now: Date = new Date(),
): StepsWeek[] {
  const thisMonday = weekStartOf(dateKey(now));
  const [y0, m0, d0] = thisMonday.split("-").map(Number);
  const today = dateKey(now);

  const list: StepsWeek[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const startD = new Date();
    startD.setFullYear(y0, m0 - 1, d0);
    startD.setDate(startD.getDate() - w * 7);
    const start = dateKey(startD);

    const days: StepsDay[] = [];
    for (let i = 0; i < 7; i++) {
      const dd = new Date(startD);
      dd.setDate(dd.getDate() + i);
      const dk = dateKey(dd);
      const isFuture = dk > today;
      const isToday = dk === today;
      const real = realSteps?.[dk];
      const steps = isFuture
        ? null
        : real != null
          ? Math.max(0, Math.round(real))
          : isToday
            ? estimateStepsToday(now)
            : estimateStepsForDate(dk);
      days.push({
        date: dk,
        steps,
        earnedKcal: steps == null ? null : earnedKcalFromSteps(steps, weightKg),
        isToday,
        isFuture,
        isPartial: isToday,
        isEstimated: isFuture ? false : real == null,
      });
    }

    const have = days.filter((d): d is StepsDay & { steps: number; earnedKcal: number } => d.steps != null);
    const totalSteps = have.reduce((a, b) => a + b.steps, 0);
    const avgSteps = have.length ? Math.round(totalSteps / have.length) : null;
    const earnedTotal = have.reduce((a, b) => a + b.earnedKcal, 0);
    const realDays = have.filter((d) => !d.isEstimated).length;

    const label =
      w === 0 ? "This week" : w === 1 ? "Last week" : `Wk ${start.slice(8)}/${start.slice(5, 7)}`;

    list.push({ label, start, days, totalSteps, avgSteps, earnedTotal, realDays });
  }
  return list;
}

// ─── Earned offset on the weekly net ────────────────────────────────────────

/** Weekly net after movement: eaten − earned − budget (null when nothing logged). */
export function netAfterEarned(
  netRaw: number | null,
  earnedTotal: number,
): number | null {
  if (netRaw == null) return null;
  return netRaw - earnedTotal;
}

/**
 * Plain-language sentence on how earned kcal changes the weekly net — appended
 * to the budget insight only when it changes the story (over-budget weeks).
 */
export function earnedNetNote(netRaw: number | null, earnedTotal: number): string {
  if (netRaw == null || earnedTotal <= 0 || netRaw <= 0) return "";
  const net = netRaw - earnedTotal;
  const raw = netRaw.toLocaleString("en-IN");
  if (net > 0)
    return `Counting the +${earnedTotal.toLocaleString("en-IN")} kcal earned from steps, your true net is +${net.toLocaleString("en-IN")} kcal instead of +${raw}.`;
  if (net === 0)
    return `Steps earn back ${earnedTotal.toLocaleString("en-IN")} kcal — counting movement you land exactly on budget.`;
  return `Steps earn back ${earnedTotal.toLocaleString("en-IN")} kcal — counting movement you're back within budget (net ${net.toLocaleString("en-IN")} kcal).`;
}

// ─── Real data: Health Connect / Google Fit Takeout CSV ─────────────────

export interface ParsedStepsCsv {
  byDate: Record<string, number>; // YYYY-MM-DD → total steps that day
  rows: number; // data rows with a usable step count
  days: number; // distinct days
  skipped: number; // rows without a parseable step count
}

/** CSV line splitter that respects double-quoted fields ("a,b", """x"""). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * Parse a Google Fit / Health Connect Takeout steps CSV into daily totals.
 * Accepts the standard "Daily Aggregations" shape — header row containing a
 * Start Time and a Step count column, e.g.
 *   Start Time,End Time,Step count (count),Calories expended (kcal),…
 * Timestamps may be "2026-09-07T08:30:00.000+05:30" or "2026-09-07 08:30:00";
 * multiple rows per day are summed (sessions). Zero-step rows count as data.
 */
export function parseStepsTakeoutCsv(csv: string): ParsedStepsCsv {
  const empty: ParsedStepsCsv = { byDate: {}, rows: 0, days: 0, skipped: 0 };
  if (!csv || typeof csv !== "string") return empty;
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return empty;

  const header = splitCsvLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const startIdx = header.findIndex((h) => h.startsWith("start time") || h === "start" || h === "date");
  const stepIdx = header.findIndex((h) => h.includes("step count") || h === "steps" || h === "step count (count)");
  if (startIdx < 0 || stepIdx < 0) return empty;

  const byDate: Record<string, number> = {};
  let rows = 0;
  let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const start = (cells[startIdx] ?? "").trim().replace(/^"|"$/g, "");
    const m = start.match(/^(\d{4}-\d{2}-\d{2})/);
    const steps = Number.parseFloat((cells[stepIdx] ?? "").replace(/[^0-9.\-]/g, ""));
    if (!m || !Number.isFinite(steps) || steps < 0) { skipped++; continue; }
    byDate[m[1]] = (byDate[m[1]] ?? 0) + steps;
    rows++;
  }
  return { byDate, rows, days: Object.keys(byDate).length, skipped };
}

/**
 * Real Health Connect / HealthKit step count for one day, via the runtime
 * plugin registry inside the Capacitor shell (see nativeHealth.ts). Always
 * resolves null on the web build — callers fall back to estimates.
 */
export async function fetchNativeSteps(dateStr: string): Promise<number | null> {
  const p = getHealthPlugin();
  if (!p) return null;
  try {
    return await fetchNativeStepsFor(dateStr, p);
  } catch {
    return null; // bridge errors degrade to "no data" for callers
  }
}
