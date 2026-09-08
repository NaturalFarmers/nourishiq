"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { useNourish, dateKey, totalsOf } from "@/lib/nourishiq/store";
import { computePrescription } from "@/lib/nourishiq/engine";
import { buildAdherenceSummary } from "@/lib/nourishiq/progress";
import type { RxContext } from "@/lib/nourishiq/types";

const QUICK_PROMPTS = [
  "Review my day so far",
  "How consistent was my week?",
  "High-protein dinner ideas for tonight?",
  "How do I shrink belly fat faster?",
];

function buildContext(state: ReturnType<typeof useNourish.getState>) {
  const rxFull = computePrescription(state.profile);
  const rx: RxContext | null = rxFull
    ? {
        goalLabel: rxFull.goalLabel,
        goalTagline: rxFull.goalTagline,
        kcal: rxFull.kcal,
        proteinG: rxFull.proteinG,
        carbsG: rxFull.carbsG,
        fatG: rxFull.fatG,
        fiberG: rxFull.fiberG,
        waterMl: rxFull.waterMl,
        sugarCapG: rxFull.sugarCapG,
        sodiumCapMg: rxFull.sodiumCapMg,
        bmi: rxFull.bmi,
        bmiCategory: rxFull.bmiCategory,
        proteinPerKg: rxFull.proteinPerKg,
        rules: rxFull.rules.map((r) => r.text),
      }
    : null;
  const day = state.logs[dateKey()];
  const t = totalsOf(day);
  return {
    rx,
    profile: {
      sex: state.profile.sex,
      age: state.profile.age,
      heightCm: state.profile.heightCm,
      weightKg: state.profile.weightKg,
      activity: state.profile.activity,
      pattern: state.profile.pattern,
      exclusions: state.profile.exclusions,
      boosters: state.profile.boosters,
    },
    today: {
      kcal: t.kcal,
      protein: t.protein,
      carbs: t.carbs,
      fat: t.fat,
      fiber: t.fiber,
      waterMl: day?.waterMl ?? 0,
      entries: day?.meals.length ?? 0,
    },
    week: (() => {
      if (!rxFull) return null;
      const s = buildAdherenceSummary(state.logs, rxFull, 3);
      return {
        adherencePct7: s.adherencePct7,
        adherencePct28: s.adherencePct28,
        loggingDays7: s.loggingDays7,
        loggingStreak: s.loggingStreak,
        onTrackStreak: s.onTrackStreak,
        avgKcal7: s.avgKcal7,
        avgProtein7: s.avgProtein7,
        avgFiber7: s.avgFiber7,
        avgWaterMl7: s.avgWater7,
      };
    })(),
  };
}

export default function NutritionistChat() {
  const chat = useNourish((s) => s.chat);
  const pushChat = useNourish((s) => s.pushChat);
  const clearChat = useNourish((s) => s.clearChat);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastText, setLastText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length, sending]);

  async function send(text: string, push = true) {
    const t = text.trim();
    if (!t || sending) return;
    setError(null);
    setLastText(t);
    if (push) pushChat({ role: "user", content: t, ts: Date.now() });
    setSending(true);
    try {
      const state = useNourish.getState();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...state.chat.slice(-12).map(({ role, content }) => ({ role, content }))],
          context: buildContext(state),
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error || "Could not reach your nutritionist.");
      pushChat({ role: "assistant", content: data.reply, ts: Date.now() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  const empty = chat.length === 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)]">
      {/* Message area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300"
        role="log"
        aria-live="polite"
        aria-label="Nutritionist conversation"
      >
        {empty && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-[26px] bg-[#E4F6EE] p-5 ring-1 ring-black/5">
              <p className="text-[26px]" aria-hidden>🥑</p>
              <h2 className="text-[19px] font-extrabold text-[#0B5C46] mt-1">Namaste! I&apos;m your NourishIQ nutritionist.</h2>
              <p className="text-[13px] leading-relaxed text-stone-600 mt-1.5">
                I can see your prescription, your goal and everything you logged today. Ask me anything —
                meal swaps, portion doubts, what to eat out, why the belly fat won&apos;t move.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-2xl bg-white border border-stone-200 px-4 py-3 text-left text-[13px] font-semibold text-stone-700 hover:border-[#0B5C46]/40 active:scale-[0.99] transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {chat.map((m) => (
          <motion.div
            key={m.ts + m.role}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-3xl px-4 py-3 text-[13.5px] leading-relaxed ${
                m.role === "user"
                  ? "bg-[#0B5C46] text-white rounded-br-lg"
                  : "bg-white text-stone-800 border border-stone-200/80 rounded-bl-lg shadow-sm"
              }`}
            >
              {m.role === "user" ? (
                <p className="whitespace-pre-wrap">{m.content}</p>
              ) : (
                <div className="markdown [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-extrabold [&_h3]:font-bold [&_h3]:mb-1">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {sending && (
          <div className="flex justify-start" aria-label="Nutritionist is typing">
            <div className="bg-white border border-stone-200/80 rounded-3xl rounded-bl-lg px-4 py-3.5 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-2 w-2 rounded-full bg-[#0B5C46]/70"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
                />
              ))}
            </div>
          </div>
        )}

        {!empty && (
          <div className="pt-1 text-center">
            <button
              onClick={clearChat}
              className="text-[11px] font-bold text-stone-400 hover:text-red-400 transition-colors"
            >
              Clear conversation
            </button>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-stone-200/80 bg-white/95 backdrop-blur px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {error && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
            <p className="flex-1 text-[12px] font-semibold text-red-600">{error}</p>
            {lastText && (
              <button
                onClick={() => send(lastText, false)}
                className="rounded-full bg-red-600 px-3 py-1 text-[11.5px] font-bold text-white"
              >
                Retry
              </button>
            )}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
            setInput("");
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.currentTarget.form as HTMLFormElement).requestSubmit();
              }
            }}
            rows={1}
            placeholder="Ask your nutritionist…"
            aria-label="Message your nutritionist"
            className="flex-1 resize-none max-h-28 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-[#0B5C46]/30"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0B5C46] text-white text-lg disabled:opacity-40 active:scale-95 transition-all"
            aria-label="Send message"
          >
            ➤
          </button>
        </form>
        <p className="text-[10px] text-stone-400 mt-2 text-center">
          AI guidance · double-check with your doctor for medical conditions
        </p>
      </div>
    </div>
  );
}
