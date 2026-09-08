// ─── NourishIQ Sample-Day Meal Plan Generator ────────────────────────────────
// Picks 4 goal-aligned recipes (breakfast / lunch / snack / dinner) that obey
// the user's dietary pattern & exclusions, and scales portions toward targets.

import type { Prescription, Recipe, UserProfile } from "./types";
import { RECIPES } from "./recipes";

export interface PlannedMeal {
  recipe: Recipe;
  mealLabel: string;
  kcal: number;
  portions: string;
}

function patternAllows(recipe: Recipe, pattern: UserProfile["pattern"]): boolean {
  switch (pattern) {
    case "vegan":
      return recipe.diet === "vegan";
    case "vegetarian":
      return recipe.diet === "vegetarian" || recipe.diet === "vegan";
    case "eggetarian":
      return recipe.diet !== "nonveg";
    default:
      return true;
  }
}

export function sampleDay(rx: Prescription, user: UserProfile): PlannedMeal[] {
  const pool = RECIPES.filter(
    (r) =>
      (!user.exclusions.includes("gluten_free") || r.glutenFree) &&
      patternAllows(r, user.pattern),
  );

  // deterministic pick: highest goal-match count, tie-broken by id for stability
  const scored = pool
    .map((r) => ({
      r,
      match: r.goals.filter((g) => g === user.goal || (user.boosters.includes("low_gi") && r.gi <= 55) || (user.boosters.includes("high_fibre") && r.fiber >= 7)).length,
    }))
    .sort((a, b) => b.match - a.match || a.r.id.localeCompare(b.r.id));

  const slots: { label: string; keys: ("breakfast" | "lunch" | "snack" | "dinner")[]; share: number }[] = [
    { label: "Breakfast", keys: ["breakfast"], share: 0.25 },
    { label: "Lunch", keys: ["lunch"], share: 0.35 },
    { label: "Smart snack", keys: ["snack"], share: 0.1 },
    { label: "Dinner", keys: ["dinner"], share: 0.3 },
  ];

  const used = new Set<string>();
  const plan: PlannedMeal[] = [];

  for (const slot of slots) {
    const target = rx.kcal * slot.share;
    let pick = scored.find(({ r }) => !used.has(r.id) && r.meal.some((m) => slot.keys.includes(m)));
    if (!pick) pick = scored.find(({ r }) => !used.has(r.id)) ?? scored[0];
    used.add(pick.r.id);

    const factor = target / pick.r.kcal;
    const rounded = Math.max(0.5, Math.round(factor * 2) / 2);
    const portions =
      rounded === 1 ? "1 serving" : rounded === 0.5 ? "½ serving" : `${rounded} servings`;

    plan.push({
      recipe: pick.r,
      mealLabel: slot.label,
      kcal: Math.round(pick.r.kcal * rounded / 5) * 5,
      portions,
    });
  }
  return plan;
}
