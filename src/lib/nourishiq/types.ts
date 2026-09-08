// ─── NourishIQ Core Types ────────────────────────────────────────────────────

export type GoalId =
  | "muscle_gain"
  | "weight_loss"
  | "weight_gain"
  | "visceral_fat"
  | "protein_rich"
  | "optimal_health";

export type DietaryPattern = "vegan" | "vegetarian" | "eggetarian" | "nonveg";

export type ExclusionId = "gluten_free" | "lactose_free" | "nut_allergy";

export type BoosterId = "low_gi" | "high_fibre";

export type Sex = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export interface UserProfile {
  goal: GoalId | null;
  pattern: DietaryPattern | null;
  exclusions: ExclusionId[];
  boosters: BoosterId[];
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
}

export interface Prescription {
  bmi: number;
  bmiCategory: string;
  bmiNote: string;
  bmr: number;
  tdee: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  fiberG: number;
  waterMl: number;
  sugarCapG: number;
  sodiumCapMg: number;
  proteinPerKg: number;
  rules: { icon: string; text: string }[];
  goalLabel: string;
  goalTagline: string;
}

/** Serializable snapshot of the prescription sent to the AI nutritionist. */
export interface RxContext {
  goalLabel: string;
  goalTagline: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  waterMl: number;
  sugarCapG: number;
  sodiumCapMg: number;
  bmi: number;
  bmiCategory: string;
  proteinPerKg: number;
  rules: string[];
}

// ─── Foods ───────────────────────────────────────────────────────────────────

export type FoodCategory =
  | "Grains & Millets"
  | "Legumes & Pulses"
  | "Vegetables"
  | "Fruits"
  | "Dairy & Alternatives"
  | "Eggs, Meat & Fish"
  | "Nuts & Seeds"
  | "Fats & Oils"
  | "Drinks"
  | "Snacks & Sweets";

export interface Food {
  id: string;
  name: string;
  emoji: string;
  category: FoodCategory;
  /** per 100 g of food as commonly consumed */
  kcal: number;
  protein: number;
  carbs: number;
  sugar: number;
  fiber: number;
  fat: number;
  /** glycemic index; 0 = not applicable (negligible carbs) */
  gi: number;
  gluten: boolean;
  lactose: boolean;
  nuts: boolean;
  vegan: boolean;
  vegetarian: boolean;
  eggs: boolean;
  processed: boolean;
  serving: string;
  note: string;
}

// ─── Recipes ─────────────────────────────────────────────────────────────────

export type DietType = "vegan" | "vegetarian" | "egg" | "nonveg";

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  meal: ("breakfast" | "lunch" | "snack" | "dinner")[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  gi: number;
  glutenFree: boolean;
  diet: DietType;
  timeMin: number;
  goals: GoalId[];
  hue: string; // pastel background class
  ingredients: string[];
  steps: string[];
  tip: string;
}

// ─── Activity ────────────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  name: string;
  emoji: string;
  met: number;
  hint: string;
}

// ─── Fit score ───────────────────────────────────────────────────────────────

export interface FitResult {
  score: number;
  reasons: { good: string[]; bad: string[] };
}

// ─── Food logging ─────────────────────────────────────────────────────────

export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";

/** One logged item, already scaled to the eaten amount (grams). */
export interface LogEntry {
  id: string;
  slot: MealSlot;
  name: string;
  emoji: string;
  grams: number;
  /** nutrition scaled to `grams` */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  offPlan?: string; // reason shown if item clashes with the prescription
}

export interface DayLog {
  date: string; // YYYY-MM-DD (local)
  meals: LogEntry[];
  waterMl: number;
}

export interface DayTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

// ─── Body measurements ──────────────────────────────────────────────────────

/** One day's optional body measurements (upserted per local date). */
export interface Measurement {
  date: string; // YYYY-MM-DD (local)
  weightKg?: number;
  waistCm?: number;
}

// ─── AI chat ────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ts: number;
}
