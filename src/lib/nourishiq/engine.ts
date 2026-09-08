// ─── NourishIQ Prescription Engine ──────────────────────────────────────────
// Evidence-based energy & macro math:
//   • BMR: Mifflin-St Jeor (1990) — the ADA-preferred equation
//   • TDEE: physical-activity-level multipliers (ICMR-NIN 2024 style PAL bands)
//   • Protein: goal-specific g/kg within evidence ranges (0.8–2.2 g/kg)
//   • Fibre: ≥14 g/1000 kcal, floored at ICMR-NIN adult RDA
//   • Sugar cap: WHO <10% E (ideally <5% E)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Prescription,
  UserProfile,
  GoalId,
  ActivityLevel,
  BoosterId,
  ExclusionId,
  DietaryPattern,
} from "./types";

export const GOALS: {
  id: GoalId;
  label: string;
  tagline: string;
  emoji: string;
  tint: string;
  ink: string;
}[] = [
  {
    id: "muscle_gain",
    label: "Build Muscle",
    tagline: "Lean gains, protein-first",
    emoji: "💪",
    tint: "bg-[#E4F6EE]",
    ink: "text-[#0E6B4E]",
  },
  {
    id: "weight_loss",
    label: "Lose Weight",
    tagline: "Sustainable calorie deficit",
    emoji: "⚖️",
    tint: "bg-[#F3EAF8]",
    ink: "text-[#7C3AED]",
  },
  {
    id: "weight_gain",
    label: "Gain Weight",
    tagline: "Healthy calorie surplus",
    emoji: "📈",
    tint: "bg-[#EAF4E2]",
    ink: "text-[#4D8B31]",
  },
  {
    id: "visceral_fat",
    label: "Lose Visceral Fat",
    tagline: "Belly-fat & metabolic reset",
    emoji: "🔥",
    tint: "bg-[#FCEFD9]",
    ink: "text-[#D96C0B]",
  },
  {
    id: "protein_rich",
    label: "Protein-Rich Eating",
    tagline: "Hit optimal protein daily",
    emoji: "🥚",
    tint: "bg-[#FBF3E2]",
    ink: "text-[#A97715]",
  },
  {
    id: "optimal_health",
    label: "Optimal Health",
    tagline: "Balanced, whole-food base",
    emoji: "🌿",
    tint: "bg-[#EFEFED]",
    ink: "text-[#4A342A]",
  },
];

export const PATTERNS: {
  id: DietaryPattern;
  label: string;
  desc: string;
  emoji: string;
}[] = [
  { id: "vegan", label: "Vegan", desc: "No animal products", emoji: "🌱" },
  { id: "vegetarian", label: "Vegetarian", desc: "Dairy ok, no eggs/meat", emoji: "🥛" },
  { id: "eggetarian", label: "Eggetarian", desc: "Veg + eggs", emoji: "🍳" },
  { id: "nonveg", label: "Non-Vegetarian", desc: "Everything included", emoji: "🍗" },
];

export const EXCLUSIONS: {
  id: ExclusionId;
  label: string;
  desc: string;
  emoji: string;
}[] = [
  { id: "gluten_free", label: "No Gluten", desc: "Wheat, barley, rye out", emoji: "🚫🌾" },
  { id: "lactose_free", label: "Lactose-Free", desc: "Milk sugar sensitive", emoji: "🚫🥛" },
  { id: "nut_allergy", label: "Nut Allergy", desc: "Strict nut avoidance", emoji: "⚠️🥜" },
];

export const BOOSTERS: {
  id: BoosterId;
  label: string;
  desc: string;
  emoji: string;
}[] = [
  { id: "low_gi", label: "Low GI Focus", desc: "Steady blood sugar", emoji: "🩸" },
  { id: "high_fibre", label: "High Fibre", desc: "Gut & satiety boost", emoji: "🥦" },
];

export const ACTIVITY_LEVELS: {
  id: ActivityLevel;
  label: string;
  desc: string;
  factor: number;
}[] = [
  { id: "sedentary", label: "Sedentary", desc: "Desk job, little movement", factor: 1.2 },
  { id: "light", label: "Lightly Active", desc: "Light walks 1–3 days/wk", factor: 1.375 },
  { id: "moderate", label: "Moderately Active", desc: "Exercise 3–5 days/wk", factor: 1.55 },
  { id: "active", label: "Active", desc: "Hard exercise 6–7 days/wk", factor: 1.725 },
  { id: "very_active", label: "Very Active", desc: "Athlete / physical job", factor: 1.9 },
];

const goalMeta = (g: GoalId) => GOALS.find((x) => x.id === g)!;

export function bmiInfo(weightKg: number, heightCm: number) {
  const m = heightCm / 100;
  const bmi = m > 0 ? weightKg / (m * m) : 0;
  let category = "Normal";
  let note = "Healthy range — protect it with consistent habits.";
  if (bmi < 18.5) {
    category = "Underweight";
    note = "Below healthy range — a gentle surplus will help.";
  } else if (bmi >= 25 && bmi < 30) {
    category = "Overweight";
    note = "A modest 5–10% loss already improves metabolic markers.";
  } else if (bmi >= 30) {
    category = "Obese";
    note = "Prioritise deficit + movement; consult your physician too.";
  } else if (bmi >= 23) {
    category = "At-risk (Asian)";
    note = "Asian-Indian thresholds: risk rises above BMI 23 — act early.";
  }
  return { bmi: Math.round(bmi * 10) / 10, category, note };
}

export function computePrescription(p: UserProfile): Prescription | null {
  if (!p.goal || !p.pattern) return null;
  const w = p.weightKg;
  const h = p.heightCm;
  const age = p.age;

  // 1) BMR — Mifflin-St Jeor
  const bmr =
    p.sex === "male"
      ? 10 * w + 6.25 * h - 5 * age + 5
      : 10 * w + 6.25 * h - 5 * age - 161;

  // 2) TDEE
  const factor = ACTIVITY_LEVELS.find((a) => a.id === p.activity)?.factor ?? 1.375;
  const tdee = bmr * factor;

  // 3) Energy target per goal
  let kcal = tdee;
  let proteinPerKg = 1.0;
  let fatPct = 0.3;

  switch (p.goal) {
    case "muscle_gain":
      kcal = tdee + 300;
      proteinPerKg = 1.8;
      fatPct = 0.27;
      break;
    case "weight_loss":
      kcal = tdee - 500;
      proteinPerKg = 1.7;
      fatPct = 0.3;
      break;
    case "weight_gain":
      kcal = tdee + 400;
      proteinPerKg = 1.6;
      fatPct = 0.28;
      break;
    case "visceral_fat":
      kcal = tdee - 400;
      proteinPerKg = 2.0;
      fatPct = 0.35; // MUFA-forward
      break;
    case "protein_rich":
      kcal = tdee;
      proteinPerKg = 1.8;
      fatPct = 0.3;
      break;
    case "optimal_health":
      kcal = tdee;
      proteinPerKg = 1.1;
      fatPct = 0.3;
      break;
  }

  // Safety floors — never prescribe below safe minimums
  const floor = p.sex === "male" ? 1500 : 1200;
  kcal = Math.max(kcal, Math.min(floor, tdee * 0.85));
  kcal = Math.round(kcal / 10) * 10;

  // Protein: cap at 2.2 g/kg for safety, floor at RDA
  proteinPerKg = Math.min(proteinPerKg, 2.2);
  let proteinG = Math.round(w * proteinPerKg);
  proteinG = Math.min(Math.max(proteinG, Math.round(w * 0.9)), Math.round(w * 2.2));

  // Fat grams from % of energy (floor 0.7 g/kg for hormones)
  let fatG = Math.round((kcal * fatPct) / 9);
  fatG = Math.max(fatG, Math.round(w * 0.7));

  // Carbs = remainder
  let carbsG = Math.round((kcal - proteinG * 4 - fatG * 9) / 4);
  if (carbsG < 50) carbsG = 50; // never below practical minimum

  // 4) Fibre target
  let fiberG = Math.round((14 * kcal) / 1000);
  fiberG = Math.max(fiberG, p.sex === "male" ? 30 : 25);
  if (p.goal === "visceral_fat" || p.boosters.includes("high_fibre")) fiberG = Math.max(fiberG, 35);
  fiberG = Math.min(fiberG, 45);

  // 5) Micro targets
  const waterMl = Math.round((35 * w + (p.activity === "active" || p.activity === "very_active" ? 500 : 0)) / 100) * 100;
  const sugarCapG = p.goal === "visceral_fat" ? Math.round((kcal * 0.05) / 4) : Math.round((kcal * 0.1) / 4);
  const sodiumCapMg = 2300;

  const pct = (g: number, mult: number) => Math.round(((g * mult) / kcal) * 100);

  const info = bmiInfo(w, h);

  // 6) Personal rule set — the "nutritionist's notes"
  const rules: { icon: string; text: string }[] = [];
  const lowGI = p.boosters.includes("low_gi") || p.goal === "visceral_fat";
  const hiFib = p.boosters.includes("high_fibre") || p.goal === "visceral_fat" || p.goal === "weight_loss";
  const hiProtein = proteinPerKg >= 1.6;

  if (p.exclusions.includes("gluten_free"))
    rules.push({ icon: "🌾", text: "Strictly gluten-free: avoid wheat, barley, rye & malt (watch soy sauce, biscuits, maida)." });
  if (lowGI)
    rules.push({ icon: "🩸", text: "Keep meal GI ≤ 55: pair carbs with protein/fat, choose millets, dals & cooled rice." });
  if (hiFib)
    rules.push({ icon: "🥦", text: `Reach ${fiberG} g fibre: ½-plate vegetables, 2 fruits, one handful nuts/seeds daily.` });
  if (hiProtein)
    rules.push({ icon: "🍳", text: `Distribute ${proteinG} g protein across 3–4 meals (~25–35 g each) for best synthesis.` });
  if (p.goal === "weight_loss")
    rules.push({ icon: "⚖️", text: "Target ~0.5 kg/week loss; weigh weekly, not daily. Deficit comes from food, not over-training." });
  if (p.goal === "weight_gain")
    rules.push({ icon: "📈", text: "Add 2 calorie-dense snacks (nuts, nut butter, banana + milk) rather than huge meals." });
  if (p.goal === "muscle_gain")
    rules.push({ icon: "🏋️", text: "Pair this surplus with progressive resistance training 3–5×/week — food alone won't build muscle." });
  if (p.goal === "visceral_fat") {
    rules.push({ icon: "🔥", text: "Visceral-fat protocol: 150+ min Zone-2 cardio weekly + 2 HIIT or resistance sessions." });
    rules.push({ icon: "📏", text: "Track waist, not just weight: aim < 90 cm (men) / < 80 cm (women) for South-Asian risk thresholds." });
    rules.push({ icon: "🥤", text: "Eliminate sugary drinks & fruit juice — liquid fructose drives liver & visceral fat." });
  }
  if (p.goal === "optimal_health")
    rules.push({ icon: "🌈", text: "Eat 30+ different plant foods a week — diversity feeds a resilient gut microbiome." });
  rules.push({ icon: "💧", text: `Hydrate with ~${(waterMl / 1000).toFixed(1)} L water daily; start each morning with 1–2 glasses.` });
  rules.push({ icon: "😴", text: "Sleep 7–9 h. Short sleep raises ghrelin, cravings and visceral-fat storage." });
  rules.push({ icon: "🧂", text: `Keep salt < 5 g/day (≈ ${sodiumCapMg} mg sodium) and added sugar ≤ ${sugarCapG} g/day (WHO).` });

  return {
    bmi: info.bmi,
    bmiCategory: info.category,
    bmiNote: info.note,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal,
    proteinG,
    carbsG,
    fatG,
    proteinPct: pct(proteinG, 4),
    carbsPct: pct(carbsG, 4),
    fatPct: pct(fatG, 9),
    fiberG,
    waterMl,
    sugarCapG,
    sodiumCapMg,
    proteinPerKg: Math.round(proteinPerKg * 10) / 10,
    rules,
    goalLabel: goalMeta(p.goal).label,
    goalTagline: goalMeta(p.goal).tagline,
  };
}

// ─── Fit-Score Engine ────────────────────────────────────────────────────────
// Scores every food 0–100 AGAINST the user's prescription.
// The same food can score differently for different goals — the core idea.
import type { Food, FitResult } from "./types";

export function fitScore(f: Food, p: Prescription, user: UserProfile): FitResult {
  const good: string[] = [];
  const bad: string[] = [];

  // Hard exclusions
  if (user.exclusions.includes("gluten_free") && f.gluten) {
    bad.push("Contains gluten — excluded by your plan");
    return { score: 4, reasons: { good, bad } };
  }
  if (user.exclusions.includes("lactose_free") && f.lactose) {
    bad.push("Contains lactose — excluded by your plan");
    return { score: 4, reasons: { good, bad } };
  }
  if (user.exclusions.includes("nut_allergy") && f.nuts) {
    bad.push("Tree nut / peanut — excluded (allergy)");
    return { score: 4, reasons: { good, bad } };
  }
  if (user.pattern === "vegan" && !f.vegan) {
    bad.push("Animal product — excluded (vegan)");
    return { score: 4, reasons: { good, bad } };
  }
  if ((user.pattern === "vegetarian") && (!f.vegetarian || f.eggs)) {
    bad.push("Not vegetarian — excluded");
    return { score: 4, reasons: { good, bad } };
  }
  if (user.pattern === "eggetarian" && !f.vegetarian && !f.eggs) {
    bad.push("Meat/fish — excluded (eggetarian)");
    return { score: 4, reasons: { good, bad } };
  }

  let s = 55;
  const wantsProtein =
    p.proteinPerKg >= 1.6 || user.goal === "muscle_gain" || user.goal === "weight_loss" || user.goal === "visceral_fat";
  const wantsFibre = user.goal === "visceral_fat" || user.boosters.includes("high_fibre") || user.goal === "weight_loss" || user.goal === "optimal_health";
  const wantsLowGI = user.boosters.includes("low_gi") || user.goal === "visceral_fat";

  // Protein density (g / 100 kcal)
  const pd = f.kcal > 0 ? (f.protein / f.kcal) * 100 : 0;
  if (f.protein >= 5) {
    if (pd >= 10) { s += wantsProtein ? 18 : 10; good.push(`Protein-dense (${pd.toFixed(0)} g/100 kcal)`); }
    else if (pd >= 6) { s += wantsProtein ? 10 : 5; good.push("Good protein source"); }
    else if (pd >= 3) { s += 4; good.push("Adds some protein"); }
  }

  // Fibre density (g / 100 kcal)
  const fd = f.kcal > 0 ? (f.fiber / f.kcal) * 100 : 0;
  if (f.fiber >= 3) {
    if (fd >= 8) { s += wantsFibre ? 16 : 10; good.push(`Fibre powerhouse (${fd.toFixed(0)} g/100 kcal)`); }
    else if (fd >= 5) { s += wantsFibre ? 10 : 6; good.push("High in fibre"); }
    else { s += 4; good.push("Decent fibre"); }
  }

  // Glycemic impact
  if (f.gi > 0 && wantsLowGI) {
    if (f.gi <= 40) { s += 12; good.push(`Very low GI (${f.gi})`); }
    else if (f.gi <= 55) { s += 7; good.push(`Low GI (${f.gi})`); }
    else if (f.gi <= 69) { s -= 9; bad.push(`Medium GI (${f.gi}) — portion control`); }
    else { s -= 20; bad.push(`High GI (${f.gi}) — spikes blood sugar`); }
  } else if (f.gi >= 70 && user.goal !== "weight_gain") {
    s -= 8; bad.push(`High GI (${f.gi})`);
  }

  // Sugar load
  const sd = f.kcal > 0 ? (f.sugar / f.kcal) * 100 : 0;
  if (f.sugar >= 15 || sd >= 35) {
    s -= user.goal === "visceral_fat" ? 20 : 12;
    bad.push("High in sugars — keep it rare");
  } else if (f.sugar >= 5 && sd >= 15) {
    s -= 5; bad.push("Moderate sugar");
  }

  // Energy density vs goal
  const ed = f.kcal;
  if (user.goal === "weight_loss" || user.goal === "visceral_fat") {
    if (ed >= 400) { s -= 12; bad.push("Very energy-dense — small portions only"); }
    else if (ed >= 250 && f.protein < 15) { s -= 6; bad.push("Energy-dense — watch portions"); }
    else if (ed <= 120 && f.fiber + f.protein >= 2) { s += 8; good.push("Low energy density — eat freely"); }
  }
  if (user.goal === "weight_gain" && ed >= 400 && !f.processed) { s += 8; good.push("Calorie-dense — great for surplus"); }

  // Fat quality proxy
  if (user.goal === "visceral_fat" && f.fat >= 25 && f.fiber < 2) { s -= 6; bad.push("Very high fat — measure carefully"); }

  // Processing penalty
  if (f.processed) { s -= 12; bad.push("Ultra-processed — minimal role in the plan"); }

  s = Math.max(3, Math.min(99, Math.round(s)));
  return { score: s, reasons: { good, bad } };
}

export function fitLabel(score: number): { label: string; cls: string } {
  if (score >= 80) return { label: "Excellent", cls: "bg-[#DEF5E7] text-[#0E6B4E]" };
  if (score >= 65) return { label: "Good", cls: "bg-[#EAF4E2] text-[#4D8B31]" };
  if (score >= 50) return { label: "Moderate", cls: "bg-[#FBF3E2] text-[#A97715]" };
  if (score >= 25) return { label: "Limit", cls: "bg-[#FCEFD9] text-[#D96C0B]" };
  return { label: "Avoid", cls: "bg-[#FBE4E4] text-[#B3383B]" };
}

export const giClass = (gi: number) => {
  if (gi <= 0) return { label: "—", cls: "bg-stone-100 text-stone-500" };
  if (gi <= 55) return { label: `GI ${gi}`, cls: "bg-[#DEF5E7] text-[#0E6B4E]" };
  if (gi <= 69) return { label: `GI ${gi}`, cls: "bg-[#FBF3E2] text-[#A97715]" };
  return { label: `GI ${gi}`, cls: "bg-[#FBE4E4] text-[#B3383B]" };
};
