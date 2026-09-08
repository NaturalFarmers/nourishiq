"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useNourish } from "@/lib/nourishiq/store";
import {
  UNIVERSAL_PRINCIPLES,
  GOAL_GUIDES,
  BOOSTER_GUIDES,
  EXCLUSION_GUIDES,
  NIN_RDA,
  GI_REFERENCE,
  type GuideSection,
} from "@/lib/nourishiq/guidelines";
import { useHydrated, Skeleton } from "./primitives";

export default function GuidelinesView() {
  const hydrated = useHydrated();
  const profile = useNourish((s) => s.profile);

  const personal: GuideSection[] = hydrated
    ? [
        profile.goal ? GOAL_GUIDES[profile.goal] : null,
        ...profile.boosters.map((b) => BOOSTER_GUIDES[b]),
        ...profile.exclusions.map((e) => EXCLUSION_GUIDES[e]),
      ].filter((x): x is GuideSection => x !== null)
    : [];

  if (!hydrated) {
    return (
      <div className="px-5 pt-6 space-y-3">
        <Skeleton className="h-12 w-full" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 pb-8">
      <header className="mb-4">
        <h1 className="text-[26px] font-extrabold text-stone-900 tracking-tight">Guidelines</h1>
        <p className="text-[13px] text-stone-500 mt-0.5">
          Evidence-based playbooks — ICMR-NIN 2024, WHO, ADA. {personal.length > 0 ? "Your personalised guides appear first." : "Take the assessment to unlock personalised protocols."}
        </p>
      </header>

      <div className="space-y-3">
        {[...personal, UNIVERSAL_PRINCIPLES, NIN_RDA, GI_REFERENCE].map((s) => (
          <GuideCard key={s.id} section={s} />
        ))}
      </div>

      <p className="mt-5 text-center text-[10.5px] text-stone-400 leading-relaxed px-2">
        Summaries of published guidance for education. For medical conditions
        (pregnancy, kidney disease, diabetes medication, eating disorders), work with
        your physician and a registered dietitian.
      </p>
    </div>
  );
}

function GuideCard({ section }: { section: GuideSection }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.section
      layout
      className={`${section.tint} rounded-[26px] ring-1 ring-black/5 overflow-hidden`}
      aria-expanded={open}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center gap-3 text-left"
        aria-expanded={open}
      >
        <span className="flex-1">
          <span className="block text-[15.5px] font-extrabold text-stone-900 leading-tight">{section.title}</span>
          <span className="block text-[11.5px] text-stone-500 mt-0.5">{section.subtitle}</span>
        </span>
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70 text-stone-600 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          ⌄
        </span>
      </button>
      {open && (
        <motion.ul
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="px-5 pb-5 space-y-2.5"
        >
          {section.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[13px] leading-relaxed text-stone-700">
              <span className="shrink-0 grid h-6 w-6 place-items-center rounded-full bg-white/80 text-[11px] font-extrabold text-stone-600">{i + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </motion.ul>
      )}
    </motion.section>
  );
}
