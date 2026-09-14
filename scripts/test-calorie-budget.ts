// Task 10 — validation for weekly "calories vs budget" analytics.
// Run: bun scripts/test-calorie-budget.ts
// Deterministic: pins "now" to Wed 2026-09-09 so fixtures always land in the
// same Mon–Sun buckets regardless of the real clock (buildCalorieBudgetWeeks
// accepts an injectable now for exactly this reason).

// store.ts uses zustand persist → shim localStorage before any import runs.
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

import type { Prescription, DayLog, LogEntry } from "../src/lib/nourishiq/types";

const { dateKey } = await import("../src/lib/nourishiq/store");
const { buildCalorieBudgetWeeks, calorieBudgetInsight, weekStartOf } = await import(
  "../src/lib/nourishiq/progress"
);

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

const RX: Prescription = {
  bmi: 24.2, bmiCategory: "at risk", bmiNote: "", bmr: 1600, tdee: 2400,
  kcal: 2000, proteinG: 120, carbsG: 220, fatG: 70, proteinPct: 25, carbsPct: 50, fatPct: 25,
  fiberG: 30, waterMl: 2500, sugarCapG: 25, sodiumCapMg: 2300, proteinPerKg: 1.7,
  rules: [], goalLabel: "Weight loss", goalTagline: "",
};

function day(date: string, kcal: number): [string, DayLog] {
  const entry: LogEntry = {
    id: `e-${date}`, slot: "lunch", name: "Test curry", emoji: "🍛",
    grams: 100, kcal, protein: 20, carbs: 100, fat: 30, fiber: 6, sugar: 8,
  };
  return [date, { date, meals: [entry], waterMl: 500 }];
}

function daysAgoKcal(n: number, kcal: number): [string, DayLog] {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return day(dateKey(d), kcal);
}

/** Fixed clock: Wednesday → daysAgo 0/1/2 always sit in the current week. */
const NOW = new Date(2026, 8, 9);

const logs = Object.fromEntries([
  daysAgoKcal(0, 2000),  // Wed — exactly 100% of budget (within)
  daysAgoKcal(1, 2400),  // Tue — over (>110%)
  daysAgoKcal(2, 1800),  // Mon — exactly at the 90% boundary → within
  daysAgoKcal(8, 3000),  // last week — over
  daysAgoKcal(9, 1000),  // last week — under
  daysAgoKcal(15, 1500), // week −2 — under
  daysAgoKcal(22, 2050), // week −3 — slightly over but within band
]);

const summary = buildCalorieBudgetWeeks(logs, RX, 5, NOW);

console.log("\n── structure ──");
ok(summary.budget === 2000, "budget pulled from rx.kcal (2000)");
ok(summary.weeks.length === 5, "5 week buckets");
ok(summary.weeks[4].label === "This week", `last bucket labelled "This week"`);
ok(summary.weeks[3].label === "Last week", `second-last bucket labelled "Last week"`);
ok(summary.weeks[2].label.startsWith("Wk "), `older bucket labelled "${summary.weeks[2].label}"`);
ok(summary.weeks.every((w) => w.days.length === 7), "every bucket has 7 days Mon..Sun");
ok(summary.weeks[4].days.some((d) => d.date === dateKey(NOW)), "current week bucket contains today");
ok(weekStartOf(dateKey(NOW)) === summary.weeks[4].start, "current week starts Monday");

console.log("\n── this week math ──");
const tw = summary.weeks[4];
ok(tw.loggedCount === 3, `3 logged days (got ${tw.loggedCount})`);
ok(tw.budgetTotal === 6000, `week budget = 2000 × 3 = 6000, logged-days only (got ${tw.budgetTotal})`);
ok(tw.avgKcal === 2067, `avg (2000+2400+1800)/3 = 2067 (got ${tw.avgKcal})`);
ok(tw.netKcal === 200, `net = 6200 − 6000 = +200 (got ${tw.netKcal})`);
ok(
  tw.overDays === 1 && tw.withinDays === 2 && tw.underDays === 0,
  `over/within/under = 1/2/0 (got ${tw.overDays}/${tw.withinDays}/${tw.underDays})`,
);

console.log("\n── last week math ──");
const lw = summary.weeks[3];
ok(lw.loggedCount === 2, "2 logged days");
ok(lw.avgKcal === 2000, "avg (3000+1000)/2 = 2000");
ok(lw.netKcal === 0, "net = 4000 − 4000 = 0");
ok(lw.overDays === 1 && lw.underDays === 1 && lw.withinDays === 0, "over/within/under = 1/0/1");

console.log("\n── other weeks ──");
const w2 = summary.weeks[2]; // 1500 only
ok(w2.loggedCount === 1 && w2.netKcal === -500 && w2.underDays === 1, "week −2: one under-budget day, net −500");
const w1 = summary.weeks[1]; // 2050 only
ok(w1.loggedCount === 1 && w1.avgKcal === 2050 && w1.withinDays === 1, "week −3: 2050 counts as within ±10%");
const w0 = summary.weeks[0];
ok(
  w0.loggedCount === 0 && w0.avgKcal === null && w0.netKcal === null && w0.budgetTotal === null,
  "empty week → null avg/net/budget",
);

console.log("\n── insights ──");
const mixInsight = calorieBudgetInsight(tw, 2000, "weight_loss");
ok(mixInsight.includes("over by 200"), `mixed week (avg 103%) says OVER, not under (got: "${mixInsight}")`);
ok(!mixInsight.includes("kg/week"), "no kg estimate below the 0.05 kg threshold");
ok(calorieBudgetInsight(lw, 2000, "weight_loss").includes("balanced out"), "net-0 week insight");
const underInsight = calorieBudgetInsight(w2, 2000, "weight_loss");
ok(
  underInsight.includes("under by 500") && underInsight.includes("steady deficit"),
  `loss-goal under insight (got: "${underInsight}")`,
);
ok(calorieBudgetInsight(w2, 2000, "muscle_gain").includes("energy-dense snack"), "gain-goal under insight");
ok(calorieBudgetInsight(w0, 2000, "weight_loss").includes("Nothing logged"), "empty-week insight");
const overWeek = { ...tw, loggedCount: 2, avgKcal: 2500, budgetTotal: 4000, netKcal: 1000, overDays: 2, withinDays: 0, underDays: 0 };
const overInsight = calorieBudgetInsight(overWeek, 2000, "weight_loss");
ok(
  overInsight.includes("over by 1,000") && overInsight.includes("0.1 kg"),
  `over insight with kg estimate (got: "${overInsight}")`,
);
ok(calorieBudgetInsight(overWeek, 2000, "muscle_gain").includes("surplus"), "gain-goal over insight");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
