"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  UserProfile,
  DayLog,
  LogEntry,
  ChatMessage,
  Measurement,
  ReminderSettings,
} from "./types";

export const DEFAULT_PROFILE: UserProfile = {
  goal: null,
  pattern: null,
  exclusions: [],
  boosters: [],
  sex: "male",
  age: 30,
  heightCm: 170,
  weightKg: 70,
  activity: "light",
};

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  breakfast: "08:30",
  lunch: "13:00",
  snack: "16:30",
  dinner: "20:00",
  water: true,
  waterEveryMin: 120,
  weighIn: true,
  weighInTime: "07:30",
  dayReview: true,
  dayReviewTime: "21:30",
};

interface NourishState {
  passportId: string;
  profile: UserProfile;
  seenWelcome: boolean;
  /** food diary keyed by local date YYYY-MM-DD */
  logs: Record<string, DayLog>;
  /** body measurements keyed by local date YYYY-MM-DD */
  measurements: Record<string, Measurement>;
  /** AI nutritionist conversation (last 40 messages kept) */
  chat: ChatMessage[];
  /** reminder schedule + notification preferences */
  reminders: ReminderSettings;
  /** de-duplication keys for reminders already shown, e.g. "2026-09-09:breakfast" */
  firedKeys: string[];
  /** real daily step counts from Health Connect / Google Fit (keyed YYYY-MM-DD); wins over estimates */
  dailySteps: Record<string, number>;
  setPassport: (id: string) => void;
  setProfile: (p: Partial<UserProfile>) => void;
  setSeenWelcome: () => void;
  addLogEntry: (date: string, entry: LogEntry) => void;
  removeLogEntry: (date: string, id: string) => void;
  addWater: (date: string, ml: number) => void;
  setWater: (date: string, ml: number) => void;
  clearDay: (date: string) => void;
  setMeasurement: (date: string, patch: { weightKg?: number; waistCm?: number }) => void;
  pushChat: (m: ChatMessage) => void;
  clearChat: () => void;
  setReminders: (patch: Partial<ReminderSettings>) => void;
  markFired: (key: string) => void;
  setDailySteps: (map: Record<string, number>) => void;
  reset: () => void;
}

function makePassportId(): string {
  const hex = () => Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, "0");
  return `NP-${hex()}${hex()}`.slice(0, 10);
}

function emptyDay(date: string): DayLog {
  return { date, meals: [], waterMl: 0 };
}

export const useNourish = create<NourishState>()(
  persist(
    (set) => ({
      passportId: "",
      profile: DEFAULT_PROFILE,
      seenWelcome: false,
      logs: {},
      measurements: {},
      chat: [],
      reminders: DEFAULT_REMINDERS,
      firedKeys: [],
      dailySteps: {},
      setPassport: (id) => set({ passportId: id }),
      setProfile: (p) =>
        set((s) => ({ profile: { ...s.profile, ...p }, seenWelcome: true })),
      setSeenWelcome: () => set({ seenWelcome: true }),
      addLogEntry: (date, entry) =>
        set((s) => {
          const day = s.logs[date] ?? emptyDay(date);
          return { logs: { ...s.logs, [date]: { ...day, meals: [...day.meals, entry] } } };
        }),
      removeLogEntry: (date, id) =>
        set((s) => {
          const day = s.logs[date];
          if (!day) return s;
          return { logs: { ...s.logs, [date]: { ...day, meals: day.meals.filter((m) => m.id !== id) } } };
        }),
      addWater: (date, ml) =>
        set((s) => {
          const day = s.logs[date] ?? emptyDay(date);
          return { logs: { ...s.logs, [date]: { ...day, waterMl: Math.max(0, day.waterMl + ml) } } };
        }),
      setWater: (date, ml) =>
        set((s) => {
          const day = s.logs[date] ?? emptyDay(date);
          return { logs: { ...s.logs, [date]: { ...day, waterMl: Math.max(0, ml) } } };
        }),
      clearDay: (date) =>
        set((s) => ({ logs: { ...s.logs, [date]: emptyDay(date) } })),
      setMeasurement: (date, patch) =>
        set((s) => {
          const m = s.measurements[date] ?? { date };
          const next: Measurement = { ...m, ...patch };
          // drop keys explicitly cleared
          if (patch.weightKg === undefined && m.weightKg !== undefined) next.weightKg = m.weightKg;
          if (patch.waistCm === undefined && m.waistCm !== undefined) next.waistCm = m.waistCm;
          return { measurements: { ...s.measurements, [date]: next } };
        }),
      pushChat: (m) =>
        set((s) => ({ chat: [...s.chat, m].slice(-40) })),
      clearChat: () => set({ chat: [] }),
      setReminders: (patch) =>
        set((s) => ({ reminders: { ...s.reminders, ...patch } })),
      markFired: (key) =>
        set((s) =>
          s.firedKeys.includes(key) ? s : { firedKeys: [...s.firedKeys, key].slice(-80) },
        ),
      setDailySteps: (map) =>
        set((s) => ({ dailySteps: { ...s.dailySteps, ...map } })),
      reset: () =>
        set({
          profile: DEFAULT_PROFILE,
          seenWelcome: false,
          logs: {},
          measurements: {},
          chat: [],
          reminders: DEFAULT_REMINDERS,
          firedKeys: [],
          dailySteps: {},
        }),
    }),
    {
      name: "nourishiq-passport",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // ensure every visitor has a passport id
        if (state && !state.passportId) state.setPassport(makePassportId());
      },
    },
  ),
);

export function ensurePassport(id: string, setter: (id: string) => void) {
  if (!id) setter(makePassportId());
}

// ─── Diary helpers ────────────────────────────────────────────────────────

/** Local YYYY-MM-DD key (not UTC — avoids off-by-one for IST mornings). */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function totalsOf(day?: DayLog) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };
  if (!day) return t;
  for (const m of day.meals) {
    t.kcal += m.kcal;
    t.protein += m.protein;
    t.carbs += m.carbs;
    t.fat += m.fat;
    t.fiber += m.fiber;
    t.sugar += m.sugar;
  }
  return t;
}
