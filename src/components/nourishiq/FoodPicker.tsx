"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNourish } from "@/lib/nourishiq/store";
import { computePrescription, fitLabel, fitScore } from "@/lib/nourishiq/engine";
import { FOODS } from "@/lib/nourishiq/foods";
import type { Food, LogEntry, MealSlot } from "@/lib/nourishiq/types";

const SLOTS: { id: MealSlot; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "snack", label: "Snacks" },
  { id: "dinner", label: "Dinner" },
];

function servingGrams(f: Food): number {
  const m = f.serving.match(/([\d.]+)\s*g/i);
  return m ? parseFloat(m[1]) : 100;
}

function offPlanReason(f: Food, profile: ReturnType<typeof useNourish.getState>["profile"]): string | undefined {
  if (profile.exclusions.includes("gluten_free") && f.gluten) return "contains gluten";
  if (profile.exclusions.includes("lactose_free") && f.lactose) return "contains lactose";
  if (profile.exclusions.includes("nut_allergy") && f.nuts) return "contains nuts";
  if (profile.pattern === "vegan" && !f.vegan) return "not vegan";
  if (profile.pattern === "vegetarian" && !f.vegetarian) return "not vegetarian";
  if (profile.pattern === "eggetarian" && !f.vegetarian && !f.eggs) return "not eggetarian";
  return undefined;
}

interface FoodPickerProps {
  open: boolean;
  slot: MealSlot;
  onClose: () => void;
  onAdd: (entry: LogEntry) => void;
}

export default function FoodPicker({ open, slot, onClose, onAdd }: FoodPickerProps) {
  const profile = useNourish((s) => s.profile);
  const rx = computePrescription(profile);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [slotSel, setSlotSel] = useState<MealSlot>(slot);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? FOODS.filter((f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q))
      : FOODS;
    if (!rx) return list.slice(0, 60);
    return list
      .map((f) => ({ f, score: fitScore(f, rx, profile).score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 60)
      .map((x) => x.f);
  }, [query, rx, profile]);

  const presets = useMemo(() => {
    if (!selected) return [];
    const s = servingGrams(selected);
    return [...new Set([30, 50, Math.round(s), 100, 150, 200])]
      .filter((g) => g > 0 && g <= 500)
      .sort((a, b) => a - b);
  }, [selected]);

  if (!open) return null;

  const factor = grams / 100;
  const preview = selected
    ? {
        kcal: Math.round(selected.kcal * factor),
        protein: +(selected.protein * factor).toFixed(1),
        carbs: +(selected.carbs * factor).toFixed(1),
        fat: +(selected.fat * factor).toFixed(1),
        fiber: +(selected.fiber * factor).toFixed(1),
      }
    : null;

  const reason = selected ? offPlanReason(selected, profile) : undefined;

  const add = () => {
    if (!selected || !preview) return;
    onAdd({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      slot: slotSel,
      name: selected.name,
      emoji: selected.emoji,
      grams,
      kcal: preview.kcal,
      protein: preview.protein,
      carbs: preview.carbs,
      fat: preview.fat,
      fiber: preview.fiber,
      sugar: +(selected.sugar * factor).toFixed(1),
      offPlan: reason,
    });
    setSelected(null);
    setQuery("");
    setGrams(100);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Add food to diary">
      <button
        aria-label="Close food picker"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="absolute inset-x-0 bottom-0 mx-auto max-w-2xl bg-[#FAF9F6] rounded-t-[28px] shadow-2xl flex flex-col max-h-[86vh]"
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-stone-200/70">
          <div className="mx-auto h-1 w-10 rounded-full bg-stone-300 mb-3" aria-hidden />
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-extrabold text-stone-900">
              {selected ? "Choose portion" : "Add food"}
            </h3>
            <button
              onClick={() => (selected ? setSelected(null) : onClose())}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[12px] font-bold text-stone-600 active:scale-95 transition-transform"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {!selected ? (
          <>
            {/* Search */}
            <div className="px-5 pt-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search 90+ foods — dal, paneer, quinoa…"
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-[#0B5C46]/30"
                aria-label="Search foods"
              />
            </div>
            {/* Results */}
            <div className="flex-1 overflow-y-auto px-5 py-3 max-h-96 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300">
              <ul className="space-y-2">
                {results.map((f) => {
                  const fit = rx ? fitScore(f, rx, profile) : null;
                  const fl = fit ? fitLabel(fit.score) : null;
                  const off = offPlanReason(f, profile);
                  return (
                    <li key={f.id}>
                      <button
                        onClick={() => {
                          setSelected(f);
                          setGrams(servingGrams(f));
                        }}
                        className="w-full flex items-center gap-3 rounded-2xl bg-white border border-stone-200/80 px-3.5 py-3 text-left hover:border-[#0B5C46]/40 active:scale-[0.99] transition-all"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-50 text-xl" aria-hidden>
                          {f.emoji}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13.5px] font-bold text-stone-800 truncate">{f.name}</span>
                          <span className="block text-[11.5px] text-stone-500">
                            {f.kcal} kcal · P {f.protein}g · per 100 g
                          </span>
                        </span>
                        {off ? (
                          <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                            off-plan
                          </span>
                        ) : fl ? (
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${fl.cls}`}>
                            {fit!.score}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
                {results.length === 0 && (
                  <li className="py-10 text-center text-[13px] text-stone-400">
                    No foods match “{query}”. Try “dal”, “millet” or “curd”.
                  </li>
                )}
              </ul>
            </div>
          </>
        ) : (
          <>
            {/* Portion editor */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white border border-stone-200 text-2xl" aria-hidden>
                  {selected.emoji}
                </span>
                <div>
                  <p className="text-[15px] font-extrabold text-stone-900">{selected.name}</p>
                  <p className="text-[11.5px] text-stone-500">Usual serving: {selected.serving}</p>
                </div>
              </div>

              {reason && (
                <p className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 text-[12px] font-semibold text-red-600">
                  ⚠️ Off-plan for you ({reason}). You can still log it — your rings will show the impact.
                </p>
              )}

              {/* Gram chips */}
              <div>
                <p className="text-[12px] font-bold text-stone-500 mb-2">Portion</p>
                <div className="flex flex-wrap gap-2">
                  {presets.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGrams(g)}
                      className={`rounded-full px-3.5 py-2 text-[12.5px] font-bold border transition-colors ${
                        grams === g
                          ? "bg-[#0B5C46] text-white border-[#0B5C46]"
                          : "bg-white text-stone-600 border-stone-200 hover:border-[#0B5C46]/40"
                      }`}
                    >
                      {g} g
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={grams}
                  onChange={(e) => setGrams(Math.min(1000, Math.max(1, Number(e.target.value) || 1)))}
                  className="mt-2.5 w-28 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-semibold outline-none focus:ring-2 focus:ring-[#0B5C46]/30"
                  aria-label="Custom grams"
                />
                <span className="text-[12px] text-stone-500 ml-2">grams</span>
              </div>

              {/* Live nutrition preview */}
              {preview && (
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { k: "kcal", v: preview.kcal },
                    { k: "Protein", v: `${preview.protein}g` },
                    { k: "Carbs", v: `${preview.carbs}g` },
                    { k: "Fat", v: `${preview.fat}g` },
                    { k: "Fibre", v: `${preview.fiber}g` },
                  ].map((x) => (
                    <div key={x.k} className="rounded-xl bg-white border border-stone-200/80 py-2.5 text-center">
                      <p className="text-[13.5px] font-extrabold text-stone-800">{x.v}</p>
                      <p className="text-[10px] text-stone-400 font-semibold">{x.k}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Meal slot */}
              <div>
                <p className="text-[12px] font-bold text-stone-500 mb-2">Add to</p>
                <div className="grid grid-cols-4 gap-2">
                  {SLOTS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSlotSel(s.id)}
                      className={`rounded-xl px-2 py-2.5 text-[12px] font-bold border transition-colors ${
                        slotSel === s.id
                          ? "bg-[#E4F6EE] text-[#0E6B4E] border-[#0E6B4E]/30"
                          : "bg-white text-stone-500 border-stone-200"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-stone-200/70 bg-white rounded-b-[28px]">
              <button
                onClick={add}
                className="w-full rounded-2xl bg-[#0B5C46] py-3.5 text-[15px] font-bold text-white active:scale-[0.99] transition-transform"
              >
                + Log {grams} g to {SLOTS.find((s) => s.id === slotSel)?.label}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
