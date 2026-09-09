"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HomeView, { type ViewId } from "@/components/nourishiq/HomeView";
import AssessmentView from "@/components/nourishiq/AssessmentView";
import PlanView from "@/components/nourishiq/PlanView";
import FoodsView from "@/components/nourishiq/FoodsView";
import RecipesView from "@/components/nourishiq/RecipesView";
import ActivityView from "@/components/nourishiq/ActivityView";
import GuidelinesView from "@/components/nourishiq/GuidelinesView";
import LogView from "@/components/nourishiq/LogView";
import ProgressView from "@/components/nourishiq/ProgressView";
import ReportView from "@/components/nourishiq/ReportView";
import NutritionistChat from "@/components/nourishiq/NutritionistChat";
import RemindersSheet from "@/components/nourishiq/RemindersSheet";
import { useReminders, type FiredReminder } from "@/components/nourishiq/useReminders";
import { useHydrated } from "@/components/nourishiq/primitives";
import { useNourish } from "@/lib/nourishiq/store";

const NAV: { id: ViewId; label: string; emoji: string }[] = [
  { id: "home", label: "Home", emoji: "🏠" },
  { id: "plan", label: "Plan", emoji: "📋" },
  { id: "log", label: "Diary", emoji: "📔" },
  { id: "progress", label: "Progress", emoji: "📈" },
  { id: "foods", label: "Foods", emoji: "🥗" },
  { id: "recipes", label: "Recipes", emoji: "👨‍🍳" },
];

const TITLES: Record<ViewId, string> = {
  home: "",
  assessment: "Assessment",
  plan: "My Prescription",
  foods: "Food Library",
  recipes: "Recipes",
  activity: "Energy Burn",
  guides: "Guidelines",
  log: "Food Diary",
  progress: "Your Progress",
  report: "Nutritionist Report",
  chat: "Ask Your Nutritionist",
};

export default function Page() {
  const [view, setView] = useState<ViewId>("home");
  const hydrated = useHydrated();
  const remindersEnabled = useNourish((s) => s.reminders.enabled);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [banner, setBanner] = useState<FiredReminder | null>(null);

  const go = (v: ViewId) => {
    setView(v);
    window.scrollTo({ top: 0 });
  };

  const onReminder = useCallback((r: FiredReminder) => setBanner(r), []);
  useReminders(onReminder);

  // auto-dismiss the banner after 10 s
  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => setBanner(null), 10000);
    return () => window.clearTimeout(id);
  }, [banner]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      {/* App bar */}
      <div className="sticky top-0 z-40 bg-[#FAF9F6]/90 backdrop-blur border-b border-stone-200/60">
        <div className="mx-auto max-w-2xl px-5 h-14 flex items-center justify-between">
          <button onClick={() => go("home")} className="flex items-center gap-2" aria-label="NourishIQ home">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#0B5C46] text-[15px]" aria-hidden>🌿</span>
            <span className="text-[15px] font-extrabold text-[#0B5C46] tracking-tight">
              {TITLES[view] || "NourishIQ"}
            </span>
          </button>
          <div className="flex items-center gap-2">
            {hydrated && (
              <button
                onClick={() => setRemindersOpen(true)}
                className="relative grid h-9 w-9 place-items-center rounded-full border border-stone-200 bg-white text-[15px] active:scale-95 transition-transform"
                aria-label="Reminder settings"
                title="Reminders"
              >
                🔔
                {remindersEnabled && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#0F766E] ring-2 ring-[#FAF9F6]" aria-hidden />
                )}
              </button>
            )}
            {view !== "home" && (
              <button
                onClick={() => go("home")}
                className="rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-[12px] font-bold text-stone-600 active:scale-95 transition-transform"
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reminder banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-16 inset-x-4 z-50 mx-auto max-w-md"
            role="alert"
          >
            <div className="rounded-2xl bg-white shadow-xl ring-1 ring-[#0B5C46]/10 px-4 py-3.5 flex items-start gap-3">
              <div className="flex-1">
                <p className="text-[13.5px] font-extrabold text-stone-900">{banner.title}</p>
                <p className="text-[12px] text-stone-500 mt-0.5 leading-relaxed">{banner.body}</p>
              </div>
              <button
                onClick={() => {
                  setBanner(null);
                  go("log");
                }}
                className="shrink-0 rounded-full bg-[#0B5C46] px-3.5 py-1.5 text-[11.5px] font-bold text-white active:scale-95 transition-transform"
              >
                Log now
              </button>
              <button
                onClick={() => setBanner(null)}
                className="shrink-0 grid h-7 w-7 place-items-center rounded-full text-stone-400 hover:bg-stone-100 transition-colors"
                aria-label="Dismiss reminder"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <main className="flex-1 w-full">
        <div className="mx-auto max-w-2xl">
          {!hydrated ? (
            <div className="px-5 pt-10 space-y-4" aria-busy="true">
              <div className="h-9 w-40 animate-pulse rounded-xl bg-stone-200/70" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-[26px] bg-stone-200/70" />
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {view === "home" && <HomeView go={go} />}
                {view === "assessment" && <AssessmentView go={go} />}
                {view === "plan" && <PlanView go={go} />}
                {view === "foods" && <FoodsView />}
                {view === "recipes" && <RecipesView />}
                {view === "activity" && <ActivityView />}
                {view === "guides" && <GuidelinesView />}
                {view === "log" && <LogView go={go} />}
                {view === "progress" && <ProgressView go={go} />}
                {view === "report" && <ReportView go={go} />}
                {view === "chat" && <NutritionistChat />}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Reminders settings sheet */}
      {hydrated && <RemindersSheet open={remindersOpen} onClose={() => setRemindersOpen(false)} />}

      {/* Floating AI-nutritionist button */}
      {hydrated && view !== "chat" && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => go("chat")}
          className="fixed right-4 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-40 grid h-14 w-14 place-items-center rounded-full bg-[#BE185D] text-[22px] shadow-lg shadow-pink-900/20 hover:scale-105 active:scale-95 transition-transform"
          aria-label="Ask your AI nutritionist"
          title="Ask your nutritionist"
        >
          💬
        </motion.button>
      )}

      {/* Bottom nav (hidden in focused chat view) */}
      {view !== "chat" && (
        <nav
          className="sticky bottom-0 z-40 mt-auto bg-white/95 backdrop-blur border-t border-stone-200/80 pb-[env(safe-area-inset-bottom)]"
          aria-label="Primary"
        >
          <div className="mx-auto max-w-2xl grid grid-cols-6">
            {NAV.map((n) => {
              const active =
                view === n.id ||
                (view === "assessment" && n.id === "plan") ||
                (view === "activity" && n.id === "plan");
              return (
                <button
                  key={n.id}
                  onClick={() => go(n.id)}
                  className={`flex flex-col items-center gap-0.5 py-2.5 text-[9.5px] font-bold transition-colors ${active ? "text-[#0B5C46]" : "text-stone-400 hover:text-stone-600"}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className={`text-[18px] transition-transform ${active ? "scale-110" : ""}`} aria-hidden>{n.emoji}</span>
                  {n.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
