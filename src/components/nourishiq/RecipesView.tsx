"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNourish } from "@/lib/nourishiq/store";
import { computePrescription } from "@/lib/nourishiq/engine";
import { RECIPES } from "@/lib/nourishiq/recipes";
import type { Recipe } from "@/lib/nourishiq/types";
import { useHydrated, Skeleton } from "./primitives";

const MEAL_LABEL: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

export default function RecipesView() {
  const hydrated = useHydrated();
  const profile = useNourish((s) => s.profile);
  const rx = hydrated ? computePrescription(profile) : null;

  const [meal, setMeal] = useState<string>("all");
  const [detail, setDetail] = useState<Recipe | null>(null);

  const list = useMemo(() => {
    let items = RECIPES.map((r) => ({
      r,
      match: rx
        ? r.goals.filter((g) => g === profile.goal || (profile.boosters.includes("low_gi") && r.gi <= 55) || (profile.boosters.includes("high_fibre") && r.fiber >= 7)).length
        : 0,
    }));
    if (meal !== "all") items = items.filter(({ r }) => r.meal.includes(meal as Recipe["meal"][number]));
    if (rx && profile.exclusions.includes("gluten_free")) items = items.filter(({ r }) => r.glutenFree);
    if (rx) {
      // sort: recipes aligned with the user's goal first
      items.sort((a, b) => b.match - a.match || a.r.id.localeCompare(b.r.id));
    }
    return items;
  }, [meal, rx, profile]);

  if (!hydrated) {
    return (
      <div className="px-5 pt-6 space-y-3">
        <Skeleton className="h-12 w-full" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full" />)}
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 pb-8">
      <header className="mb-4">
        <h1 className="text-[26px] font-extrabold text-stone-900 tracking-tight">Recipes</h1>
        <p className="text-[13px] text-stone-500 mt-0.5">
          {rx ? `Sorted for your ${rx.goalLabel.toLowerCase()} plan.` : "Indian-forward, dietitian-designed meals with full macros."}
        </p>
      </header>

      {/* Meal filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Meal filter">
        {([
          ["all", "All"],
          ["breakfast", "🌅 Breakfast"],
          ["lunch", "🍛 Lunch"],
          ["snack", "🍎 Snacks"],
          ["dinner", "🌙 Dinner"],
        ] as [string, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setMeal(k)}
            className={`shrink-0 rounded-full border-2 px-3.5 py-1.5 text-[12.5px] font-bold transition-all active:scale-95 ${meal === k ? "border-[#0B5C46] bg-[#E4F6EE] text-[#0E6B4E]" : "border-stone-200 bg-white text-stone-500"}`}
            aria-pressed={meal === k}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.map(({ r }) => (
          <button
            key={r.id}
            onClick={() => setDetail(r)}
            className="w-full text-left rounded-[26px] overflow-hidden border border-stone-200/80 bg-white shadow-sm hover:border-stone-300 active:scale-[0.99] transition-all"
          >
            <div className={`${r.hue} px-4 py-3 flex items-center gap-3`}>
              <span className="text-[28px]" aria-hidden>{r.emoji}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15.5px] font-extrabold text-stone-900 leading-tight">{r.name}</span>
                <span className="text-[11px] font-semibold text-stone-500">
                  {r.meal.map((m) => MEAL_LABEL[m]).join(" · ")} · {r.timeMin} min · {r.diet === "vegan" ? "Vegan" : r.diet === "vegetarian" ? "Veg" : r.diet === "egg" ? "Egg" : "Non-veg"}
                </span>
              </span>
            </div>
            <div className="px-4 py-3 flex flex-wrap items-center gap-1.5">
              <Chip dark>{r.kcal} kcal</Chip>
              <Chip>P {r.protein} g</Chip>
              <Chip>C {r.carbs} g</Chip>
              <Chip>F {r.fat} g</Chip>
              <Chip>Fib {r.fiber} g</Chip>
              {!r.glutenFree && <Chip>contains gluten</Chip>}
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-[420px] rounded-[26px] p-0 gap-0 overflow-hidden max-h-[85vh] overflow-y-auto">
          {detail && <RecipeDetail r={detail} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Chip({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${dark ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>
      {children}
    </span>
  );
}

function RecipeDetail({ r }: { r: Recipe }) {
  return (
    <div>
      <div className={`${r.hue} p-5`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-left">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm text-[28px]" aria-hidden>{r.emoji}</span>
            <span className="text-[19px] font-extrabold text-stone-900 leading-tight">{r.name}</span>
          </DialogTitle>
          <DialogDescription className="text-left text-[12px] font-semibold text-stone-500 mt-1">
            {r.meal.map((m) => MEAL_LABEL[m]).join(" · ")} · {r.timeMin} min · serves 1
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip dark>{r.kcal} kcal</Chip>
          <Chip>P {r.protein} g</Chip>
          <Chip>C {r.carbs} g</Chip>
          <Chip>F {r.fat} g</Chip>
          <Chip>Fibre {r.fiber} g</Chip>
          {r.gi > 0 && <Chip>GI ≈ {r.gi}</Chip>}
          {r.glutenFree && <Chip>gluten-free</Chip>}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <h4 className="text-[13px] font-extrabold uppercase tracking-wide text-stone-400 mb-2">Ingredients</h4>
          <ul className="space-y-1.5">
            {r.ingredients.map((ing) => (
              <li key={ing} className="flex gap-2.5 text-[13.5px] text-stone-700 leading-relaxed">
                <span className="text-[#0B5C46] font-bold" aria-hidden>·</span>{ing}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-[13px] font-extrabold uppercase tracking-wide text-stone-400 mb-2">Method</h4>
          <ol className="space-y-2.5">
            {r.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-[13.5px] text-stone-700 leading-relaxed">
                <span className="shrink-0 grid h-6 w-6 place-items-center rounded-full bg-[#E4F6EE] text-[11px] font-extrabold text-[#0E6B4E]">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
        <p className="rounded-2xl bg-[#FBF3E2] p-3.5 text-[12.5px] leading-relaxed text-stone-700">
          <b className="text-[#A97715]">Chef-dietitian tip · </b>{r.tip}
        </p>
      </div>
    </div>
  );
}
