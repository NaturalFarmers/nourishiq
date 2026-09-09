// Sanity-validate NourishIQ recipe data after the regional expansion.
import { RECIPES } from "../src/lib/nourishiq/recipes";
import type { GoalId } from "../src/lib/nourishiq/types";

const GOALS: GoalId[] = ["muscle_gain", "weight_loss", "weight_gain", "visceral_fat", "protein_rich", "optimal_health"];
const MEALS = ["breakfast", "lunch", "snack", "dinner"];
const DIETS = ["vegan", "vegetarian", "egg", "nonveg"];

let errors = 0;
const err = (m: string) => { console.error("✗ " + m); errors++; };

// 1. unique ids
const ids = new Set<string>();
for (const r of RECIPES) {
  if (ids.has(r.id)) err(`duplicate id: ${r.id}`);
  ids.add(r.id);
}

// 2. field validity + macro coherence
for (const r of RECIPES) {
  const tag = r.id;
  if (!r.region?.trim()) err(`${tag}: missing region`);
  if (!r.name?.trim()) err(`${tag}: missing name`);
  if (!r.meal?.length || r.meal.some((m) => !MEALS.includes(m))) err(`${tag}: bad meal ${JSON.stringify(r.meal)}`);
  if (r.meal?.length !== new Set(r.meal).size) err(`${tag}: duplicate meal slots`);
  if (!r.goals?.length) err(`${tag}: no goals`);
  if (r.goals?.some((g) => !GOALS.includes(g))) err(`${tag}: invalid goal in ${JSON.stringify(r.goals)}`);
  if (!DIETS.includes(r.diet)) err(`${tag}: bad diet ${r.diet}`);
  if (![r.kcal, r.protein, r.carbs, r.fat, r.fiber, r.gi, r.timeMin].every((n) => typeof n === "number" && n >= 0)) err(`${tag}: non-numeric/NEG macro`);
  if (r.gi > 100) err(`${tag}: GI > 100`);
  // Atwater check: kcal ≈ 4P + 4C + 9F (within ±15 or ±8% — recipes are estimates)
  const est = 4 * r.protein + 4 * r.carbs + 9 * r.fat;
  const tol = Math.max(15, r.kcal * 0.08);
  if (Math.abs(est - r.kcal) > tol) err(`${tag}: kcal ${r.kcal} vs Atwater ${Math.round(est)} (P${r.protein}/C${r.carbs}/F${r.fat})`);
  if (!r.ingredients?.length || r.ingredients.length < 3) err(`${tag}: too few ingredients`);
  if (!r.steps?.length || r.steps.length < 3) err(`${tag}: too few steps`);
  if (!r.tip?.trim()) err(`${tag}: missing tip`);
  if (!/^bg-\[#[0-9A-Fa-f]{6}\]$/.test(r.hue)) err(`${tag}: bad hue ${r.hue}`);
}

// 3. hue palette — only the 5 design-system pastels
const HUES = new Set(["bg-[#EAF4E2]", "bg-[#FBF3E2]", "bg-[#FCEFD9]", "bg-[#E4F6EE]", "bg-[#F3EAF8]"]);
for (const r of RECIPES) if (!HUES.has(r.hue)) err(`${r.id}: hue off-palette ${r.hue}`);

// 4. regional coverage report
const byRegion = new Map<string, number>();
for (const r of RECIPES) byRegion.set(r.region, (byRegion.get(r.region) ?? 0) + 1);
console.log(`\nTotal recipes: ${RECIPES.length}  (unique ids: ${ids.size})`);
console.log("Regional coverage:");
[...byRegion.entries()].sort((a, b) => b[1] - a[1]).forEach(([rg, n]) => console.log(`  ${rg.padEnd(20)} ${n}`));

const south = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra & Telangana", "South India"]
  .reduce((s, rg) => s + (byRegion.get(rg) ?? 0), 0);
console.log(`\nSouth Indian total: ${south} (${Math.round((south / RECIPES.length) * 100)}% of library)`);
console.log(`Vegan: ${RECIPES.filter(r => r.diet === "vegan").length} · Vegetarian: ${RECIPES.filter(r => r.diet === "vegetarian").length} · Non-veg: ${RECIPES.filter(r => r.diet === "nonveg").length}`);
console.log(`Gluten-containing: ${RECIPES.filter(r => !r.glutenFree).map(r => r.id).join(", ") || "none"}`);
console.log(`Breakfast slots: ${RECIPES.filter(r => r.meal.includes("breakfast")).length} · Lunch: ${RECIPES.filter(r => r.meal.includes("lunch")).length} · Snack: ${RECIPES.filter(r => r.meal.includes("snack")).length} · Dinner: ${RECIPES.filter(r => r.meal.includes("dinner")).length}`);

if (errors) { console.error(`\nFAILED with ${errors} error(s)`); process.exit(1); }
console.log("\n✓ ALL CHECKS PASSED");
