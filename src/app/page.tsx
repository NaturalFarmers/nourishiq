"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HomeView, { type ViewId } from "@/components/nourishiq/HomeView";
import AssessmentView from "@/components/nourishiq/AssessmentView";
import PlanView from "@/components/nourishiq/PlanView";
import FoodsView from "@/components/nourishiq/FoodsView";
import RecipesView from "@/components/nourishiq/RecipesView";
import ActivityView from "@/components/nourishiq/ActivityView";
import GuidelinesView from "@/components/nourishiq/GuidelinesView";
import LogView from "@/components/nourishiq/LogView";
import NutritionistChat from "@/components/nourishiq/NutritionistChat";
import { useHydrated } from "@/components/nourishiq/primitives";

const NAV: { id: ViewId; label: string; emoji: string }[] = [
  { id: "home", label: "Home", emoji: "🏠" },
  { id: "plan", label: "Plan", emoji: "📋" },
  { id: "log", label: "Diary", emoji: "📔" },
  { id: "foods", label: "Foods", emoji: "🥗" },
  { id: "recipes", label: "Recipes", emoji: "👨‍🍳" },
  { id: "guides", label: "Guides", emoji: "📖" },
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
  chat: "Ask Your Nutritionist",
};

export default function Page() {
  const [view, setView] = useState<ViewId>("home");
  const hydrated = useHydrated();

  const go = (v: ViewId) => {
    setView(v);
    window.scrollTo({ top: 0 });
  };

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
                {view === "chat" && <NutritionistChat />}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

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
