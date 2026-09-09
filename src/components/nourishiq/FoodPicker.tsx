"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNourish, dateKey } from "@/lib/nourishiq/store";
import { computePrescription, fitLabel, fitScore } from "@/lib/nourishiq/engine";
import { FOODS } from "@/lib/nourishiq/foods";
import { barcodeOf, foodByBarcode } from "@/lib/nourishiq/barcode";
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
  const logs = useNourish((s) => s.logs);
  const rx = computePrescription(profile);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [slotSel, setSlotSel] = useState<MealSlot>(slot);
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  // Frequently logged foods (by name count across all days)
  const frequent = useMemo(() => {
    const counts = new Map<string, number>();
    const lastTs = new Map<string, number>();
    for (const day of Object.values(logs)) {
      for (const m of day.meals) {
        counts.set(m.name, (counts.get(m.name) ?? 0) + 1);
        lastTs.set(m.name, Math.max(lastTs.get(m.name) ?? 0, day.date === dateKey() ? Date.now() : 0));
      }
    }
    return [...counts.entries()]
      .sort((a, b) => (b[1] - a[1]) || ((lastTs.get(b[0]) ?? 0) - (lastTs.get(a[0]) ?? 0)))
      .slice(0, 6)
      .map(([name]) => FOODS.find((f) => f.name === name))
      .filter((f): f is Food => Boolean(f));
  }, [logs]);

  const stopScan = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanOpen(false);
  };

  // stop camera whenever the sheet closes or unmounts
  useEffect(() => {
    if (!open) stopScan();
    return () => stopScan();
  }, [open]);

  // re-target the meal slot each time the sheet opens (quick-add may pick a different slot)
  useEffect(() => {
    if (open) setSlotSel(slot);
  }, [open, slot]);

  const handleCode = (raw: string) => {
    const food = foodByBarcode(raw);
    if (food) {
      setSelected(food);
      setGrams(servingGrams(food));
      setCode("");
      setCodeMsg(null);
      setScanMsg(null);
    } else {
      const digits = raw.replace(/\D/g, "");
      setCodeMsg(
        digits.length >= 8
          ? `Code ${digits} isn't in the NourishIQ library yet — search the name instead.`
          : "Enter the full 13-digit code (printed under every library food).",
      );
    }
  };

  const startScan = async () => {
    setScanOpen(true);
    setScanMsg(null);
    try {
      const w = window as unknown as { BarcodeDetector?: new (o?: { formats?: string[] }) => { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> } };
      if (!w.BarcodeDetector) {
        setScanMsg("Camera scanning needs Chrome or Edge on this device. Type the 13-digit code instead — it's printed under every library food.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const detector = new w.BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "upc_a"] });
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const found = await detector.detect(videoRef.current);
          if (found.length > 0) {
            handleCode(found[0].rawValue);
            stopScan();
            return;
          }
        } catch {
          /* frame not ready — try again */
        }
        timerRef.current = window.setTimeout(tick, 350);
      };
      tick();
    } catch {
      setScanMsg("Couldn't access the camera — type the 13-digit code instead.");
    }
  };

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
    setCode("");
    setCodeMsg(null);
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
            {/* Barcode-style quick add */}
            <div className="px-5 pt-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCode(code);
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px]" aria-hidden>🏷️</span>
                  <input
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      const digits = e.target.value.replace(/\D/g, "");
                      if (digits.length === 13) handleCode(digits);
                    }}
                    inputMode="numeric"
                    placeholder="Scan or type barcode…"
                    aria-label="Scan or type barcode"
                    className="w-full rounded-2xl border border-stone-200 bg-white pl-9 pr-3 py-3 text-[13.5px] font-semibold tracking-wider outline-none focus:ring-2 focus:ring-[#0B5C46]/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={startScan}
                  className="shrink-0 grid w-12 place-items-center rounded-2xl bg-[#0B5C46] text-lg text-white active:scale-95 transition-transform"
                  aria-label="Scan barcode with camera"
                  title="Scan with camera"
                >
                  📷
                </button>
              </form>
              {codeMsg && (
                <p className="mt-1.5 text-[11.5px] font-semibold text-red-500" role="status">{codeMsg}</p>
              )}
              {scanOpen && (
                <div className="mt-2 rounded-2xl border border-stone-200 bg-black overflow-hidden">
                  <div className="relative">
                    <video ref={videoRef} muted playsInline className="w-full h-36 object-cover" aria-label="Camera viewfinder" />
                    <div className="absolute inset-6 border-2 border-white/70 rounded-xl pointer-events-none" aria-hidden />
                  </div>
                  <button
                    onClick={stopScan}
                    className="w-full bg-stone-900 text-white text-[12px] font-bold py-2"
                    aria-label="Stop camera scanning"
                  >
                    ⏹ Stop camera
                  </button>
                </div>
              )}
              {scanMsg && (
                <p className="mt-1.5 text-[11.5px] font-semibold text-stone-500" role="status">{scanMsg}</p>
              )}
              {/* Frequently logged quick-add chips */}
              {frequent.length > 0 && (
                <div className="mt-2.5">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-stone-400 mb-1.5">
                    ⚡ Quick add — often logged
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300">
                    {frequent.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setSelected(f);
                          setGrams(servingGrams(f));
                        }}
                        className="shrink-0 flex items-center gap-1.5 rounded-full bg-white border border-stone-200 pl-2.5 pr-3 py-1.5 text-[12px] font-bold text-stone-700 hover:border-[#0B5C46]/40 active:scale-95 transition-all"
                        aria-label={`Quick add ${f.name}`}
                      >
                        <span aria-hidden>{f.emoji}</span>
                        {f.name.split(" ").slice(0, 2).join(" ")}
                        <span className="text-[10px] font-semibold text-stone-400">{f.kcal} kcal/100g</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
                  <p className="text-[10px] font-mono tracking-widest text-stone-400 mt-0.5">
                    Code {barcodeOf(selected.id)}
                  </p>
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
