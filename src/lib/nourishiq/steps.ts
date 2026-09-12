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
// Level-2 native hook: fetchNativeSteps() below is where real Health Connect
// step counts will be fetched once the app ships inside the Capacitor shell.
// On the web build it always resolves null and callers fall back to estimates.

import { dateKey } from "./store";
import { weekStartOf } from "./progress";

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
}

export interface StepsWeek {
  label: string; // "This week" / "Last week" / "Wk 25/08"
  start: string; // YYYY-MM-DD of Monday
  days: StepsDay[]; // Mon..Sun
  totalSteps: number;
  avgSteps: number | null;
  earnedTotal: number; // kcal earned across non-future days
}

/**
 * N Monday-based step weeks, oldest → newest, ending with the current week.
 * Week windows are byte-identical to buildCalorieBudgetWeeks() so earned-kcal
 * caps on the day bars always line up with the selected budget week.
 */
export function buildStepsWeeks(
  weeks = 5,
  weightKg = 70,
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
      const steps = isFuture
        ? null
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
      });
    }

    const have = days.filter((d): d is StepsDay & { steps: number; earnedKcal: number } => d.steps != null);
    const totalSteps = have.reduce((a, b) => a + b.steps, 0);
    const avgSteps = have.length ? Math.round(totalSteps / have.length) : null;
    const earnedTotal = have.reduce((a, b) => a + b.earnedKcal, 0);

    const label =
      w === 0 ? "This week" : w === 1 ? "Last week" : `Wk ${start.slice(8)}/${start.slice(5, 7)}`;

    list.push({ label, start, days, totalSteps, avgSteps, earnedTotal });
  }
  return list;
}

/**
 * Level-2 native hook: inside the Capacitor shell this will query Health
 * Connect for the real TYPE_STEPS daily aggregate and replace estimates.
 * Always resolves null on the web build — callers fall back to
 * estimateStepsForDate(). Intentionally dependency-free until the shell ships.
 */
export async function fetchNativeSteps(_dateStr: string): Promise<number | null> {
  if (typeof window === "undefined") return null;
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  // TODO(Level-2): HealthConnect aggregate query for the given date.
  return null;
}
