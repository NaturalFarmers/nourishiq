// Task 18 — steps & earned-calorie module tests (pure functions only).
// Run: bun scripts/test-steps-earned.ts

import {
  estimateStepsForDate,
  estimateStepsToday,
  earnedKcalFromSteps,
  buildStepsWeeks,
  fetchNativeSteps,
  parseStepsTakeoutCsv,
  netAfterEarned,
  earnedNetNote,
  KCAL_PER_STEP_PER_KG,
} from "../src/lib/nourishiq/steps";
import { computePrescription } from "../src/lib/nourishiq/engine";
import { buildCalorieBudgetWeeks, weekStartOf } from "../src/lib/nourishiq/progress";
import { dateKey } from "../src/lib/nourishiq/store";
import type { UserProfile } from "../src/lib/nourishiq/types";

let pass = 0;
let fail = 0;
function ok(cond: boolean, msg: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${msg}`);
  } else {
    fail++;
    console.error(`  ✗ ${msg}`);
  }
}

// ── 1. determinism ──────────────────────────────────────────────────────────
console.log("1. determinism");
ok(estimateStepsForDate("2026-09-10") === estimateStepsForDate("2026-09-10"), "same date → same estimate");
ok(estimateStepsForDate("2026-01-01") === estimateStepsForDate("2026-01-01"), "other date → stable too");
ok(estimateStepsForDate("2026-09-10") !== estimateStepsForDate("2026-09-11"), "adjacent dates differ (varied trend)");

// ── 2. bounds & variety over a 120-day sweep ───────────────────────────────
console.log("2. bounds & variety");
const sweep: number[] = [];
for (let i = 0; i < 120; i++) {
  const d = new Date(2026, 7, 1);
  d.setDate(d.getDate() + i);
  sweep.push(estimateStepsForDate(dateKey(d)));
}
ok(sweep.every((v) => v >= 3800 && v <= 14400), `all 120 estimates within [3800, 14400] (min ${Math.min(...sweep)}, max ${Math.max(...sweep)})`);
ok(new Set(sweep).size >= 15, `varied across days (${new Set(sweep).size} distinct values)`);

// ── 3. today is partial ─────────────────────────────────────────────────────
console.log("3. today partial");
const today = dateKey();
const fullToday = estimateStepsForDate(today);
const now = new Date();
ok(estimateStepsToday() <= fullToday, `today's partial (${estimateStepsToday()}) ≤ full estimate (${fullToday})`);
ok(estimateStepsToday() >= Math.round(fullToday * 0.06) - 1, "today's partial ≥ 6% floor");
const lateNight = estimateStepsToday(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 30));
ok(lateNight === fullToday, "23:30 → full estimate for the day");
const early = estimateStepsToday(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0));
ok(early === Math.round(fullToday * 0.06), "06:00 → 6% of the estimate");

// ── 4. earned kcal math ─────────────────────────────────────────────────────
console.log("4. earned kcal math");
ok(earnedKcalFromSteps(10000, 70) === 280, "10,000 steps @ 70 kg = 280 kcal");
ok(earnedKcalFromSteps(8000, 90) === 288, "8,000 steps @ 90 kg = 288 kcal");
ok(earnedKcalFromSteps(0, 70) === 0 && earnedKcalFromSteps(10000, 0) === 0, "zero steps or zero weight → 0");
ok(KCAL_PER_STEP_PER_KG === 0.0004, "constant documented at 0.0004 kcal/step/kg");

// ── 5. week builder structure ───────────────────────────────────────────────
console.log("5. week builder");
const weeks = buildStepsWeeks(5, 70);
ok(weeks.length === 5, "5 weeks built");
ok(weeks[4].label === "This week" && weeks[3].label === "Last week", 'labels "This week" / "Last week"');
ok(/^Wk \d{2}\/\d{2}$/.test(weeks[0].label), `oldest label "Wk dd/mm" (${weeks[0].label})`);
ok(weeks.every((w) => w.days.length === 7), "every week has 7 days (Mon..Sun)");
const monday = weeks[4].start;
const md = new Date(Number(monday.slice(0, 4)), Number(monday.slice(5, 7)) - 1, Number(monday.slice(8)));
ok((md.getDay() + 6) % 7 === 0, `week start ${monday} is a Monday`);

// ── 6. windows byte-identical to the calorie-budget weeks ───────────────────
console.log("6. alignment with budget weeks");
const profile: UserProfile = {
  goal: "visceral_fat",
  pattern: "nonveg",
  exclusions: [],
  boosters: ["low_gi"],
  sex: "male",
  age: 30,
  heightCm: 170,
  weightKg: 70,
  activity: "moderate",
};
const rx = computePrescription(profile);
const budgetWeeks = buildCalorieBudgetWeeks({}, rx, 5);
ok(
  weeks.every((w, i) => w.start === budgetWeeks.weeks[i].start),
  "all 5 Monday starts match buildCalorieBudgetWeeks exactly",
);

// ── 7. future days & today flags ────────────────────────────────────────────
console.log("7. future days & today");
const thisWk = weeks[4];
ok(thisWk.days.some((d) => d.isToday), "this week contains today");
ok(
  thisWk.days.every((d) => (d.isFuture ? d.steps == null && d.earnedKcal == null : true)),
  "future days carry no steps / earned kcal",
);
const todayDay = thisWk.days.find((d) => d.isToday)!;
ok(todayDay.isPartial === true, "today flagged partial (count still growing)");
ok(todayDay.earnedKcal === earnedKcalFromSteps(todayDay.steps!, 70), "today's earned = steps × factor × weight");

// ── 8. aggregates ───────────────────────────────────────────────────────────
console.log("8. aggregates");
for (const w of [weeks[4], weeks[2]]) {
  const real = w.days.filter((d) => d.steps != null) as NonNullable<typeof w.days[number]>[];
  const sum = real.reduce((a, b) => a + (b.steps ?? 0), 0);
  ok(w.totalSteps === sum, `${w.label}: totalSteps = sum of days (${sum})`);
  ok(w.avgSteps === Math.round(sum / real.length), `${w.label}: avgSteps = round(total / days)`);
  const earnedSum = real.reduce((a, b) => a + (b.earnedKcal ?? 0), 0);
  ok(w.earnedTotal === earnedSum, `${w.label}: earnedTotal = Σ earned (${earnedSum})`);
}
ok(buildStepsWeeks(5, 90)[4].earnedTotal > buildStepsWeeks(5, 60)[4].earnedTotal, "heavier body → more earned kcal (weight-aware)");

// ── 9. earnedByDate-style consumption matches the day bars' input ──────────
console.log("9. day-bar merge shape");
const map = Object.fromEntries(weeks[4].days.map((d) => [d.date, d.earnedKcal ?? 0]));
ok(Object.keys(map).length === 7, "earned map covers all 7 days");
ok(Object.values(map).reduce((a, b) => a + b, 0) === weeks[4].earnedTotal, "map values sum to the week's earnedTotal");

// ── 10. native hook ─────────────────────────────────────────────────────────
console.log("10. native hook");
const native = await fetchNativeSteps(today);
ok(native === null, "fetchNativeSteps resolves null on the web build (estimates used)");

// ── 11. Takeout / Health Connect CSV parser ────────────────────────────────
console.log("11. steps CSV parser");
const csv = [
  "Start Time,End Time,Step count (count),Calories expended (kcal)",
  '2026-09-07T08:30:00.000+05:30,2026-09-07T09:00:00.000+05:30,"4,200",105',
  "2026-09-07 19:10:00,2026-09-07 19:40:00,1800,45",
  "2026-09-08T07:00:00.000Z,2026-09-08T07:30:00.000Z,0,0",
  "2026-09-09T06:00:00.000Z,2026-09-09T06:30:00.000Z,,",
].join("\r\n");
const parsed = parseStepsTakeoutCsv(csv);
ok(parsed.days === 2, `2 distinct days parsed — empty-steps row is skipped (got ${parsed.days})`);
ok(parsed.byDate["2026-09-07"] === 6000, `same-day session rows summed (4,200+1,800 = ${parsed.byDate["2026-09-07"]})`);
ok(parsed.byDate["2026-09-08"] === 0, "zero-step day counts as data");
ok(parsed.rows === 3 && parsed.skipped === 1, `rows=3 skipped=1 (empty steps row) (got ${parsed.rows}/${parsed.skipped})`);
ok(parseStepsTakeoutCsv("name,age\nA,30").days === 0, "non-steps CSV → empty result");
ok(parseStepsTakeoutCsv("").days === 0, "empty input → empty result");

// ── 12. real data beats estimates ──────────────────────────────────────────
console.log("12. real-data precedence");
const d1 = dateKey(new Date(Date.now() - 1 * 864e5));
const sameWeek = weekStartOf(d1) === weekStartOf(today);
const withReal = buildStepsWeeks(5, 70, { [today]: 12345, [d1]: 999 });
const tReal = withReal[4].days.find((d) => d.isToday)!;
ok(tReal.steps === 12345, "today uses the imported value (12345)");
ok(tReal.isEstimated === false, "today flagged NOT estimated");
ok(tReal.earnedKcal === earnedKcalFromSteps(12345, 70), `today earned recomputed from real steps (${tReal.earnedKcal} kcal)`);
const d1Day = withReal[4].days.find((d) => d.date === d1);
ok(
  !sameWeek || (d1Day != null && d1Day.steps === 999 && d1Day.isEstimated === false),
  sameWeek ? "yesterday uses its real value" : "yesterday falls in last week — checked there instead",
);
if (!sameWeek) {
  const lw = withReal[3].days.find((d) => d.date === d1)!;
  ok(lw.steps === 999 && lw.isEstimated === false, "last-week day uses its real value (999)");
}
const estDay = withReal[2].days.find((d) => d.steps != null)!;
ok(estDay.isEstimated === true && estDay.steps === estimateStepsForDate(estDay.date), "days without data keep estimates");
ok(withReal[4].realDays === (sameWeek ? 2 : 1), `this week realDays = ${sameWeek ? 2 : 1} (got ${withReal[4].realDays})`);
ok(withReal[4].totalSteps === withReal[4].days.reduce((a, b) => a + (b.steps ?? 0), 0), "totals still coherent with real data");

// ── 13. earned offset on the weekly net ────────────────────────────────────
console.log("13. earned offset on net");
ok(netAfterEarned(211, 1096) === -885, "net 211 − earned 1,096 = −885");
ok(netAfterEarned(null, 500) === null, "unlogged week → null net after earned");
ok(earnedNetNote(211, 1096).includes("back within budget"), "over→under note says back within budget");
ok(earnedNetNote(2000, 500).includes("+1,500"), "still-over note shows reduced net (+1,500)");
ok(earnedNetNote(500, 500).includes("exactly on budget"), "exact-offset note");
ok(earnedNetNote(-300, 500) === "" && earnedNetNote(200, 0) === "" && earnedNetNote(null, 500) === "", "no note when under budget / no earned / nothing logged");

console.log(`\n${pass}/${pass + fail} PASS`);
if (fail > 0) process.exit(1);
