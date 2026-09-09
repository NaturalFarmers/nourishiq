"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNourish } from "@/lib/nourishiq/store";
import { Switch } from "@/components/ui/switch";

const MEALS: { key: "breakfast" | "lunch" | "snack" | "dinner"; label: string; emoji: string }[] = [
  { key: "breakfast", label: "Breakfast", emoji: "🌅" },
  { key: "lunch", label: "Lunch", emoji: "🍛" },
  { key: "snack", label: "Snacks", emoji: "🍎" },
  { key: "dinner", label: "Dinner", emoji: "🌙" },
];

const WATER_OPTIONS = [45, 60, 90, 120, 180];

export default function RemindersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reminders = useNourish((s) => s.reminders);
  const setReminders = useNourish((s) => s.setReminders);
  const [perm, setPerm] = useState<string>("default");

  useEffect(() => {
    if (!open) return;
    // async read avoids synchronous setState-in-effect cascades
    const id = window.setTimeout(() => {
      try {
        if (typeof Notification !== "undefined") setPerm(Notification.permission);
        else setPerm("unsupported");
      } catch {
        setPerm("unsupported");
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  if (!open) return null;

  const requestPermission = async () => {
    try {
      if (typeof Notification !== "undefined") setPerm(await Notification.requestPermission());
    } catch {
      setPerm("denied");
    }
  };

  const timeInput = (key: "breakfast" | "lunch" | "snack" | "dinner" | "weighInTime" | "dayReviewTime", label: string, emoji: string) => (
    <div key={key} className="flex items-center justify-between gap-3 rounded-2xl bg-white border border-stone-200/80 px-3.5 py-2.5">
      <label htmlFor={`rem-${key}`} className="text-[13px] font-bold text-stone-700">
        <span className="mr-1.5" aria-hidden>{emoji}</span>{label}
      </label>
      <input
        id={`rem-${key}`}
        type="time"
        value={reminders[key]}
        onChange={(e) => setReminders({ [key]: e.target.value })}
        className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[13px] font-semibold text-stone-700 outline-none focus:ring-2 focus:ring-[#0B5C46]/30"
      />
    </div>
  );

  const toggle = (checked: boolean, key: "water" | "weighIn" | "dayReview") =>
    setReminders({ [key]: checked });

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Reminder settings">
      <button aria-label="Close reminders" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
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
            <h3 className="text-[16px] font-extrabold text-stone-900">🔔 Reminders</h3>
            <button
              onClick={onClose}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[12px] font-bold text-stone-600 active:scale-95 transition-transform"
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300">
          {/* Master switch */}
          <div className="rounded-2xl bg-[#E4F6EE] border border-[#0E6B4E]/20 px-4 py-3.5 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[14px] font-extrabold text-[#0B5C46]">Enable reminders</p>
              <p className="text-[11.5px] text-[#0B5C46]/70 mt-0.5">Gentle nudges while NourishIQ is open in a tab</p>
            </div>
            <Switch
              checked={reminders.enabled}
              onCheckedChange={(v) => {
                setReminders({ enabled: v });
                if (v && typeof Notification !== "undefined" && Notification.permission === "default") {
                  void requestPermission();
                }
              }}
              aria-label="Enable reminders"
            />
          </div>

          <fieldset disabled={!reminders.enabled} className={!reminders.enabled ? "opacity-50 pointer-events-none space-y-3" : "space-y-3"}>
            {/* Meals */}
            <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-stone-400 pt-1">Meal times</p>
            {MEALS.map((m) => timeInput(m.key, m.label, m.emoji))}

            {/* Water */}
            <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-stone-400 pt-2">Hydration</p>
            <div className="rounded-2xl bg-white border border-stone-200/80 px-3.5 py-2.5 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[13px] font-bold text-stone-700">💧 Water nudge</p>
                <p className="text-[11px] text-stone-400">8 am – 10 pm, if you're behind on your goal</p>
              </div>
              <Switch checked={reminders.water} onCheckedChange={(v) => toggle(v, "water")} aria-label="Water reminders" />
            </div>
            {reminders.water && (
              <div className="flex flex-wrap gap-2">
                {WATER_OPTIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setReminders({ waterEveryMin: m })}
                    className={`rounded-full px-3.5 py-2 text-[12px] font-bold border transition-colors ${
                      reminders.waterEveryMin === m
                        ? "bg-[#0F766E] text-white border-[#0F766E]"
                        : "bg-white text-stone-600 border-stone-200"
                    }`}
                    aria-pressed={reminders.waterEveryMin === m}
                  >
                    every {m} min
                  </button>
                ))}
              </div>
            )}

            {/* Weigh-in + day review */}
            <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-stone-400 pt-2">Check-ins</p>
            <div className="rounded-2xl bg-white border border-stone-200/80 px-3.5 py-2.5 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[13px] font-bold text-stone-700">⚖️ Daily weigh-in</p>
                <p className="text-[11px] text-stone-400">Skipped automatically once today's weight is logged</p>
              </div>
              <Switch checked={reminders.weighIn} onCheckedChange={(v) => toggle(v, "weighIn")} aria-label="Weigh-in reminder" />
            </div>
            {reminders.weighIn && timeInput("weighInTime", "Weigh-in at", "⏰")}
            <div className="rounded-2xl bg-white border border-stone-200/80 px-3.5 py-2.5 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[13px] font-bold text-stone-700">🌙 Close-your-day review</p>
                <p className="text-[11px] text-stone-400">End-of-day nudge to finish your rings</p>
              </div>
              <Switch checked={reminders.dayReview} onCheckedChange={(v) => toggle(v, "dayReview")} aria-label="Day review reminder" />
            </div>
            {reminders.dayReview && timeInput("dayReviewTime", "Review at", "⏰")}
          </fieldset>

          {/* Permission */}
          <div className={`rounded-2xl border px-4 py-3 mt-1 ${perm === "granted" ? "bg-[#E4F6EE] border-[#0E6B4E]/20" : "bg-white border-stone-200"}`}>
            <p className="text-[12.5px] font-bold text-stone-700">
              {perm === "granted"
                ? "✅ Browser notifications on — nudges pop even in another tab"
                : perm === "denied"
                  ? "🔕 Notifications blocked in this browser — in-app banners still work"
                  : "Allow browser notifications for nudges even in another tab"}
            </p>
            {perm !== "granted" && perm !== "denied" && (
              <button
                onClick={requestPermission}
                className="mt-2 rounded-full bg-[#0B5C46] px-4 py-2 text-[12px] font-bold text-white active:scale-95 transition-transform"
              >
                Enable notifications
              </button>
            )}
          </div>
          <p className="pb-2 text-center text-[10.5px] text-stone-400">
            Reminders fire while NourishIQ is open in a browser tab — your data never leaves the device.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
