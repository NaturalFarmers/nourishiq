"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNourish } from "@/lib/nourishiq/store";
import { computePrescription, fitScore, fitLabel, giClass } from "@/lib/nourishiq/engine";
import { FOODS, FOOD_CATEGORIES } from "@/lib/nourishiq/foods";
import type { Food, FitResult } from "@/lib/nourishiq/types";
import { useHydrated, Skeleton } from "./primitives";

type TagFilter = "all" | "protein" | "fibre" | "lowgi" | "gf";
type SortKey = "fit" | "protein" | "kcal" | "name";

export default function FoodsView() {
  const hydrated = useHydrated();
  const profile = useNourish((s) => s.profile);
  const rx = hydrated ? computePrescription(profile) : null;

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [tag, setTag] = useState<TagFilter>("all");
  const [sort, setSort] = useState<SortKey>(rx ? "fit" : "name");
  const [detail, setDetail] = useState<Food | null>(null);

  const list = useMemo(() => {
    let items = FOODS.map((f) => ({ f, fit: rx ? fitScore(f, rx, profile) : null }));
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      items = items.filter(({ f }) => f.name.toLowerCase().includes(needle) || f.category.toLowerCase().includes(needle));
    }
    if (cat !== "all") items = items.filter(({ f }) => f.category === cat);
    if (tag === "protein") items = items.filter(({ f }) => f.protein >= 15);
    if (tag === "fibre") items = items.filter(({ f }) => f.fiber >= 6);
    if (tag === "lowgi") items = items.filter(({ f }) => f.gi > 0 && f.gi <= 55);
    if (tag === "gf") items = items.filter(({ f }) => !f.gluten);

    switch (sort) {
      case "fit": items.sort((a, b) => (b.fit?.score ?? 0) - (a.fit?.score ?? 0)); break;
      case "protein": items.sort((a, b) => b.f.protein - a.f.protein); break;
      case "kcal": items.sort((a, b) => a.f.kcal - b.f.kcal); break;
      default: items.sort((a, b) => a.f.name.localeCompare(b.f.name));
    }
    return items;
  }, [q, cat, tag, sort, rx, profile]);

  if (!hydrated) {
    return (
      <div className="px-5 pt-6 space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-8 w-full" />
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 pb-8">
      <header className="mb-4">
        <h1 className="text-[26px] font-extrabold text-stone-900 tracking-tight">Food library</h1>
        <p className="text-[13px] text-stone-500 mt-0.5">
          {rx
            ? `Ranked by how well each food fits your ${rx.goalLabel.toLowerCase()} prescription.`
            : "Nutrition per 100 g. Take the assessment to unlock personal fit-scores."}
        </p>
      </header>

      {/* Search */}
      <div className="relative mb-3">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden>🔍</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 90+ foods — paneer, ragi, salmon…"
          aria-label="Search foods"
          className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-[14px] outline-none focus:border-[#0B5C46] focus:ring-2 focus:ring-[#0B5C46]/15 placeholder:text-stone-400"
        />
      </div>

      {/* Tag filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filters">
        {([
          ["all", "All"],
          ["protein", "💪 High protein"],
          ["fibre", "🥦 High fibre"],
          ["lowgi", "🩸 Low GI"],
          ["gf", "🌾 Gluten-free"],
        ] as [TagFilter, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTag(k)}
            className={`shrink-0 rounded-full border-2 px-3.5 py-1.5 text-[12.5px] font-bold transition-all active:scale-95 ${tag === k ? "border-[#0B5C46] bg-[#E4F6EE] text-[#0E6B4E]" : "border-stone-200 bg-white text-stone-500"}`}
            aria-pressed={tag === k}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Category + sort row */}
      <div className="flex gap-2 mb-4">
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="Food category"
          className="flex-1 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-stone-700 outline-none focus:border-[#0B5C46]"
        >
          <option value="all">All categories</option>
          {FOOD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort foods"
          className="rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-stone-700 outline-none focus:border-[#0B5C46]"
        >
          {rx && <option value="fit">Best fit</option>}
          <option value="protein">Most protein</option>
          <option value="kcal">Fewest kcal</option>
          <option value="name">A–Z</option>
        </select>
      </div>

      <p className="text-[11.5px] text-stone-400 mb-2" aria-live="polite">{list.length} foods</p>

      {/* List */}
      <div className="space-y-2">
        {list.map(({ f, fit }) => {
          const gi = giClass(f.gi);
          return (
            <button
              key={f.id}
              onClick={() => setDetail(f)}
              className="w-full rounded-3xl bg-white border border-stone-200/80 p-4 flex items-center gap-3.5 text-left hover:border-stone-300 active:scale-[0.99] transition-all shadow-sm"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-stone-50 text-[22px]" aria-hidden>{f.emoji}</span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[14.5px] font-extrabold text-stone-900 truncate">{f.name}</span>
                  {f.gluten && <span className="shrink-0 rounded-md bg-[#FBE4E4] px-1.5 py-0.5 text-[9.5px] font-bold text-[#B3383B]">GLUTEN</span>}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
                  <span className="font-bold text-stone-700">{f.kcal} kcal</span>
                  <span>· P {f.protein} g</span>
                  <span>· Fib {f.fiber} g</span>
                  <span className={`rounded-md px-1.5 py-0.5 font-bold ${gi.cls}`}>{gi.label}</span>
                </span>
              </span>
              {fit ? (
                <span className={`shrink-0 grid h-11 w-11 place-items-center rounded-full text-[13px] font-extrabold ${fit.score >= 80 ? "bg-[#DEF5E7] text-[#0E6B4E]" : fit.score >= 65 ? "bg-[#EAF4E2] text-[#4D8B31]" : fit.score >= 50 ? "bg-[#FBF3E2] text-[#A97715]" : fit.score >= 25 ? "bg-[#FCEFD9] text-[#D96C0B]" : "bg-[#FBE4E4] text-[#B3383B]"}`} title="Fit score for your prescription">
                  {fit.score}
                </span>
              ) : (
                <span className="shrink-0 text-stone-300" aria-hidden>›</span>
              )}
            </button>
          );
        })}
        {list.length === 0 && (
          <div className="py-14 text-center">
            <span className="text-4xl" aria-hidden>🔎</span>
            <p className="text-[14px] text-stone-500 mt-3">No foods match that search.</p>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-[420px] rounded-[26px] p-0 gap-0 overflow-hidden max-h-[85vh] overflow-y-auto">
          {detail && (
            <FoodDetail food={detail} fit={rx ? fitScore(detail, rx, profile) : null} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FoodDetail({ food: f, fit }: { food: Food; fit: FitResult | null }) {
  const gi = giClass(f.gi);
  const rows: [string, string][] = [
    ["Energy", `${f.kcal} kcal`],
    ["Protein", `${f.protein} g`],
    ["Carbs", `${f.carbs} g`],
    ["— of which sugars", `${f.sugar} g`],
    ["Fibre", `${f.fiber} g`],
    ["Fat", `${f.fat} g`],
    ["Glycemic index", f.gi > 0 ? `${f.gi} (${f.gi <= 55 ? "low" : f.gi <= 69 ? "medium" : "high"})` : "n/a"],
    ["Typical serving", f.serving],
  ];
  const flags: string[] = [];
  if (f.gluten) flags.push("Contains gluten");
  else flags.push("Gluten-free");
  if (f.lactose) flags.push("Contains lactose");
  if (f.nuts) flags.push("Tree nut / peanut");
  if (f.vegan) flags.push("Vegan");
  else if (f.eggs) flags.push("Eggetarian OK");
  else if (f.vegetarian) flags.push("Vegetarian");
  if (f.processed) flags.push("Ultra-processed");

  return (
    <div>
      <div className="bg-[#E4F6EE] p-5 pb-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-left">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm text-[28px]" aria-hidden>{f.emoji}</span>
            <span>
              <span className="block text-[19px] font-extrabold text-stone-900 leading-tight">{f.name}</span>
              <span className="text-[12px] font-medium text-stone-500">{f.category} · per 100 g</span>
            </span>
          </DialogTitle>
          {fit && (
            <DialogDescription asChild>
              <div className="mt-3 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[12px] font-extrabold ${fitLabel(fit.score).cls}`}>
                  Fit {fit.score}/100 · {fitLabel(fit.score).label} for your plan
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${gi.cls}`}>{gi.label}</span>
              </div>
            </DialogDescription>
          )}
          {fit === null && (
            <DialogDescription className="mt-3 text-[12.5px] text-stone-500 text-left">
              Take the assessment to see how this food scores for your goals.
            </DialogDescription>
          )}
        </DialogHeader>
      </div>

      <div className="p-5">
        {fit && (
          <FitExplainer fit={fit} />
        )}

        <dl className="rounded-2xl border border-stone-100 divide-y divide-stone-100 overflow-hidden">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between px-4 py-2.5 text-[13px]">
              <dt className="text-stone-500">{k}</dt>
              <dd className="font-bold text-stone-800">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 rounded-2xl bg-[#FBF3E2] p-3.5 text-[12.5px] leading-relaxed text-stone-700">
          <b className="text-[#A97715]">Nutritionist&apos;s note · </b>{f.note}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {flags.map((fl) => (
            <span key={fl} className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-600">{fl}</span>
          ))}
        </div>

        <p className="mt-3 text-[10.5px] text-stone-400 leading-relaxed">
          Values are indicative averages (IFCT-2017 / USDA / ICMR-NIN); actuals vary by variety & cooking.
        </p>
      </div>
    </div>
  );
}

function FitExplainer({ fit }: { fit: FitResult }) {
  const score = fit.score;
  return (
    <div className="mb-4">
      <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${score >= 80 ? "bg-[#0E6B4E]" : score >= 65 ? "bg-[#4D8B31]" : score >= 50 ? "bg-[#C4881C]" : score >= 25 ? "bg-[#D96C0B]" : "bg-[#B3383B]"}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {(fit.reasons.good.length > 0 || fit.reasons.bad.length > 0) && (
        <ul className="mt-3 space-y-1.5">
          {fit.reasons.good.map((r) => (
            <li key={r} className="flex gap-2 text-[12.5px] leading-relaxed text-stone-700">
              <span className="font-bold text-[#0E6B4E]" aria-hidden>＋</span>{r}
            </li>
          ))}
          {fit.reasons.bad.map((r) => (
            <li key={r} className="flex gap-2 text-[12.5px] leading-relaxed text-stone-700">
              <span className="font-bold text-[#B3383B]" aria-hidden>−</span>{r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
