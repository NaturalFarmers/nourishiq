"use client";

import { useEffect, useRef } from "react";
import { useNourish, dateKey, totalsOf } from "@/lib/nourishiq/store";
import { computePrescription } from "@/lib/nourishiq/engine";
import type { ReminderSettings } from "@/lib/nourishiq/types";

export interface FiredReminder {
  kind: string;
  title: string;
  body: string;
}

/** Fire a browser notification when the user has granted permission. */
function systemNotify(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body, tag: "nourishiq" });
    }
  } catch {
    /* notifications unavailable — in-app banner already shows the message */
  }
}

function minutesOf(hhmm: string): number | null {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/**
 * Client-side reminder scheduler. Polls every 20 s while the app is open;
 * fires each enabled reminder at most once per day (water: once per interval
 * block). Skips meal reminders for slots already logged and the weigh-in if
 * today's weight exists. Always also calls `onFire` so the in-app banner can
 * render regardless of Notification permission.
 */
export function useReminders(onFireCb: (r: FiredReminder) => void) {
  const reminders = useNourish((s) => s.reminders);
  const firedKeys = useNourish((s) => s.firedKeys);
  const markFired = useNourish((s) => s.markFired);
  const logs = useNourish((s) => s.logs);
  const measurements = useNourish((s) => s.measurements);
  const profile = useNourish((s) => s.profile);

  const fireRef = useRef(onFireCb);
  useEffect(() => {
    fireRef.current = onFireCb;
  }, [onFireCb]);

  useEffect(() => {
    if (!reminders.enabled) return;
    let stopped = false;

    const check = () => {
      if (stopped) return;
      const now = new Date();
      const dk = dateKey(now);
      const mins = now.getHours() * 60 + now.getMinutes();
      const day = logs[dk];
      const waterMl = day?.waterMl ?? 0;
      const rx = computePrescription(profile);
      const waterTarget = rx?.waterMl ?? 2500;

      const due: { key: string; r: FiredReminder }[] = [];

      // ── meal reminders (skipped if the slot is already logged) ──
      const slots: { kind: keyof ReminderSettings; label: string; emoji: string }[] = [
        { kind: "breakfast", label: "Breakfast", emoji: "🌅" },
        { kind: "lunch", label: "Lunch", emoji: "🍛" },
        { kind: "snack", label: "Snacks", emoji: "🍎" },
        { kind: "dinner", label: "Dinner", emoji: "🌙" },
      ];
      for (const s of slots) {
        const time = reminders[s.kind as "breakfast" | "lunch" | "snack" | "dinner"];
        const at = minutesOf(time);
        if (at === null || mins < at) continue;
        const key = `${dk}:${s.kind}`;
        if (firedKeys.includes(key)) continue;
        const loggedCount = (day?.meals ?? []).filter((m) => m.slot === s.kind).length;
        if (loggedCount > 0) continue;
        due.push({
          key,
          r: {
            kind: s.kind,
            title: `${s.emoji} ${s.label} time`,
            body: `Log your ${s.label.toLowerCase()} in the Diary to keep your streak alive.`,
          },
        });
      }

      // ── water nudge (waking hours, per interval block) ──
      if (reminders.water && mins >= 8 * 60 && mins <= 22 * 60) {
        const block = Math.floor(mins / Math.max(30, reminders.waterEveryMin));
        const key = `${dk}:water:${block}`;
        if (!firedKeys.includes(key) && waterMl < waterTarget * 0.95) {
          const inL = (waterMl / 1000).toFixed(1);
          const goalL = (waterTarget / 1000).toFixed(1);
          due.push({
            key,
            r: {
              kind: "water",
              title: "💧 Sip check",
              body: `${inL} L of your ${goalL} L so far — grab a 250 ml glass now.`,
            },
          });
        }
      }

      // ── weigh-in ──
      if (reminders.weighIn) {
        const at = minutesOf(reminders.weighInTime);
        const key = `${dk}:weighin`;
        if (at !== null && mins >= at && !firedKeys.includes(key) && !measurements[dk]?.weightKg) {
          due.push({
            key,
            r: {
              kind: "weighin",
              title: "⚖️ Weigh-in time",
              body: "Step on the scale and log today's weight & waist in Progress.",
            },
          });
        }
      }

      // ── end-of-day review ──
      if (reminders.dayReview) {
        const at = minutesOf(reminders.dayReviewTime);
        const key = `${dk}:dayreview`;
        if (at !== null && mins >= at && !firedKeys.includes(key)) {
          const t = totalsOf(day);
          due.push({
            key,
            r: {
              kind: "dayreview",
              title: "🌙 Close your day",
              body:
                t.kcal > 0
                  ? `You've logged ${Math.round(t.kcal)} kcal today — check your rings and add anything missed.`
                  : "Nothing logged today. A 30-second dinner entry keeps your streak alive.",
            },
          });
        }
      }

      for (const { key, r } of due) {
        markFired(key);
        fireRef.current(r);
        systemNotify(r.title, r.body);
      }
    };

    check();
    const id = window.setInterval(check, 20000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // re-check whenever any dependency changes (cheap: pure array/map reads)
  }, [reminders, firedKeys, logs, measurements, profile, markFired]);
}
