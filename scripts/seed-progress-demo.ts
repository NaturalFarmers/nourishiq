// Task 10 — build a deterministic localStorage seed for browser verification
// of the weekly "calories vs budget" section. Uses the app's own engine so the
// budget (rx.kcal) is exactly what the app will compute.
// Run: bun scripts/seed-progress-demo.ts

import { computePrescription } from "../src/lib/nourishiq/engine";
import { dateKey } from "../src/lib/nourishiq/store";
import type { UserProfile, LogEntry, DayLog } from "../src/lib/nourishiq/types";
import { writeFileSync } from "node:fs";

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
const B = rx.kcal;
console.log("rx.kcal (daily budget) =", B);

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateKey(d);
};

function entry(date: string, mult: number, slot: LogEntry["slot"], name: string, emoji: string): LogEntry {
  const kcal = Math.round(B * mult);
  return {
    id: `seed-${date}-${slot}`,
    slot,
    name,
    emoji,
    grams: 100,
    kcal,
    protein: Math.round(kcal * 0.06),
    carbs: Math.round(kcal * 0.11),
    fat: Math.round(kcal * 0.03),
    fiber: 6,
    sugar: 8,
  };
}

function dayLog(date: string, e: LogEntry, waterMl = 1000): [string, DayLog] {
  return [date, { date, meals: [e], waterMl }];
}

// This week: 100% / 120% / 90%  → avg 103.33% → 103%, net +0.1·B
// Last week: 150% / 50%         → avg 100%, net 0
// Week −2: 75% (under) · Week −3: 102.5% (within) · Week −4: empty
const logs = Object.fromEntries([
  dayLog(daysAgo(0), entry(daysAgo(0), 1.0, "lunch", "Grilled fish + brown rice", "🐟")),
  dayLog(daysAgo(1), entry(daysAgo(1), 1.2, "dinner", "Chicken biryani (large)", "🍗")),
  dayLog(daysAgo(2), entry(daysAgo(2), 0.9, "lunch", "Millet upma + curd", "🥣")),
  dayLog(daysAgo(8), entry(daysAgo(8), 1.5, "dinner", "Wedding feast", "🎉")),
  dayLog(daysAgo(9), entry(daysAgo(9), 0.5, "lunch", "Light rasam + salad", "🍜")),
  dayLog(daysAgo(15), entry(daysAgo(15), 0.75, "breakfast", "Idli + sambar", "🍚")),
  dayLog(daysAgo(22), entry(daysAgo(22), 1.025, "lunch", "Paneer wrap", "🧆")),
]);

const payload = {
  state: {
    passportId: "NP-SEED101",
    profile,
    seenWelcome: true,
    logs,
    measurements: {},
    chat: [],
    firedKeys: [],
  },
  version: 0,
};

writeFileSync("/home/z/my-project/scripts/seed-payload.json", JSON.stringify(payload));
console.log("seed written to scripts/seed-payload.json");
console.log("expected this week: avg", Math.round((B * (1.0 + 1.2 + 0.9)) / 3), "net +" + Math.round(B * 0.1));
console.log("expected last week: avg", Math.round(B * 1.0), "net 0");
