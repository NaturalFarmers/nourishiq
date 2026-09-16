"use client";

/**
 * NourishIQ cloud-sync engine (Supabase Postgres ↔ localStorage).
 *
 * Model: localStorage stays the single source of truth for the running app;
 * Supabase holds a durable per-user mirror. All writes hit the store first,
 * then flow out; cloud rows flow in and are applied through the same store,
 * so the UI never needs to know where data came from.
 *
 * Conflict policy
 *  • daily tables (logs / measurements / steps): one row per local date —
 *    last-writer-wins per day using the DB `updated_at` column.
 *  • user_settings: whole-row last-writer-wins.
 *  • chat: union-merge by "ts:role" key on both devices, newest 40 kept.
 *
 * Cadence
 *  • push: debounced 1.2 s after any store change (dirty rows only)
 *  • pull: every 60 s, on tab focus, on sign-in, and on manual "Sync now"
 *
 * Signing out stops everything; local data is never deleted here.
 */
import { create } from "zustand";
import { useNourish } from "@/lib/nourishiq/store";
import type { DayLog, Measurement, ChatMessage, UserProfile, ReminderSettings } from "@/lib/nourishiq/types";
import { getSupabase, supabaseEnabled } from "./client";
import { useAuth } from "./auth-store";

// ─── sync status store (consumed by AccountButton) ─────────────────────────

export type SyncStatus = "off" | "local" | "syncing" | "synced" | "error";

interface SyncState {
  status: SyncStatus;
  lastSync: number | null;
  error: string | null;
}

export const useSync = create<SyncState>()(() => ({
  status: supabaseEnabled ? "local" : "off",
  lastSync: null,
  error: null,
}));

const setSync = (patch: Partial<SyncState>) => useSync.setState(patch);

// ─── helpers ────────────────────────────────────────────────────────────────

function stableHash(v: unknown): string {
  const s = JSON.stringify(v);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

/** Per-row sync memory: last cloud timestamp + hash of what we last saw. */
type RowMeta = { updatedAt: number; hash: string };
type MetaMap = Record<string, RowMeta>;

const meta: {
  settings: MetaMap | null; // single pseudo-row keyed "settings"
  logs: MetaMap;
  meas: MetaMap;
  steps: MetaMap;
} = { settings: null, logs: {}, meas: {}, steps: {} };

function cloudTime(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function friendly(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const s = raw.toLowerCase();
  if (s.includes("failed to fetch") || s.includes("network"))
    return "Cannot reach your Supabase project — check the URL, or the project may be paused.";
  if (s.includes("jwt") || s.includes("401") || s.includes("token"))
    return "Session expired — sign in again from the account button.";
  return raw.length > 140 ? raw.slice(0, 140) + "…" : raw;
}

// ─── engine state ───────────────────────────────────────────────────────────

let running = false; // engine active for the current user
let activeUser: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pullTimer: ReturnType<typeof setInterval> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeStore: (() => void) | null = null;
let onFocus: (() => void) | null = null;
let cycleBusy = false;

const PUSH_DEBOUNCE_MS = 1200;
const PULL_INTERVAL_MS = 60_000;
const RETRY_DELAY_MS = 8000;

// ─── local snapshots ────────────────────────────────────────────────────────

type LocalSnapshot = {
  passportId: string;
  profile: UserProfile;
  seenWelcome: boolean;
  reminders: ReminderSettings;
  logs: Record<string, DayLog>;
  measurements: Record<string, Measurement>;
  chat: ChatMessage[];
  dailySteps: Record<string, number>;
};

function readLocal(): LocalSnapshot {
  const s = useNourish.getState();
  return {
    passportId: s.passportId,
    profile: s.profile,
    seenWelcome: s.seenWelcome,
    reminders: s.reminders,
    logs: s.logs,
    measurements: s.measurements,
    chat: s.chat,
    dailySteps: s.dailySteps,
  };
}

// ─── pull ───────────────────────────────────────────────────────────────────

async function pullAll(userId: string) {
  const sb = getSupabase();
  if (!sb) return;

  // 1. user_settings (whole-row LWW)
  const { data: settingsRows } = await sb
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (settingsRows) {
    const cloud = {
      passportId: settingsRows.passport_id as string | null,
      profile: settingsRows.profile as UserProfile,
      seenWelcome: settingsRows.seen_welcome as boolean,
      reminders: settingsRows.reminders as ReminderSettings,
    };
    const hash = stableHash(cloud);
    const m = meta.settings?.["settings"];
    if (!m || m.updatedAt < cloudTime(settingsRows.updated_at)) {
      meta.settings = {
        settings: { updatedAt: cloudTime(settingsRows.updated_at) || Date.now(), hash },
      };
      const cur = readLocal();
      const localHash = stableHash({
        passportId: cur.passportId,
        profile: cur.profile,
        seenWelcome: cur.seenWelcome,
        reminders: cur.reminders,
      });
      if (localHash !== hash) {
        useNourish.setState((s) => ({
          passportId: cloud.passportId || s.passportId,
          profile: { ...s.profile, ...cloud.profile },
          seenWelcome: s.seenWelcome || cloud.seenWelcome,
          reminders: { ...s.reminders, ...cloud.reminders },
        }));
      }
    }
  }

  // 2. daily_logs (per-day LWW)
  const { data: logRows } = await sb.from("daily_logs").select("*").eq("user_id", userId);
  for (const r of logRows ?? []) {
    const date = r.log_date as string;
    const day = r.day as DayLog;
    const t = cloudTime(r.updated_at);
    const m = meta.logs[date];
    if (m && m.updatedAt >= t) continue;
    const hash = stableHash(day);
    meta.logs[date] = { updatedAt: t || Date.now(), hash };
    if (stableHash(readLocal().logs[date]) !== hash) {
      useNourish.setState((s) => ({ logs: { ...s.logs, [date]: day } }));
    }
  }

  // 3. measurements (per-day LWW)
  const { data: measRows } = await sb.from("measurements").select("*").eq("user_id", userId);
  for (const r of measRows ?? []) {
    const date = r.log_date as string;
    const meas: Measurement = { date };
    if (r.weight_kg !== null && r.weight_kg !== undefined) meas.weightKg = Number(r.weight_kg);
    if (r.waist_cm !== null && r.waist_cm !== undefined) meas.waistCm = Number(r.waist_cm);
    const t = cloudTime(r.updated_at);
    const m = meta.meas[date];
    if (m && m.updatedAt >= t) continue;
    const hash = stableHash(meas);
    meta.meas[date] = { updatedAt: t || Date.now(), hash };
    if (stableHash(readLocal().measurements[date]) !== hash) {
      useNourish.setState((s) => ({ measurements: { ...s.measurements, [date]: meas } }));
    }
  }

  // 4. daily_steps (per-day LWW)
  const { data: stepRows } = await sb.from("daily_steps").select("*").eq("user_id", userId);
  for (const r of stepRows ?? []) {
    const date = r.log_date as string;
    const steps = Number(r.steps) || 0;
    const t = cloudTime(r.updated_at);
    const m = meta.steps[date];
    if (m && m.updatedAt >= t) continue;
    const hash = stableHash(steps);
    meta.steps[date] = { updatedAt: t || Date.now(), hash };
    if (readLocal().dailySteps[date] !== steps) {
      useNourish.setState((s) => ({ dailySteps: { ...s.dailySteps, [date]: steps } }));
    }
  }

  // 5. chat — union merge by "ts:role" key, newest 40 kept
  const { data: chatRows } = await sb
    .from("chat_messages")
    .select("msg_key, role, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (chatRows && chatRows.length > 0) {
    const local = readLocal().chat;
    const byKey = new Map<string, ChatMessage>();
    for (const m of local) byKey.set(`${m.ts}:${m.role}`, m);
    for (const r of chatRows) {
      const key = r.msg_key as string;
      if (!byKey.has(key)) {
        const [tsStr] = key.split(":");
        byKey.set(key, { role: r.role as "user" | "assistant", content: r.content as string, ts: Number(tsStr) || 0 });
      }
    }
    const merged = [...byKey.values()].sort((a, b) => a.ts - b.ts).slice(-40);
    if (stableHash(merged) !== stableHash(local)) {
      useNourish.setState({ chat: merged });
    }
  }
}

// ─── push ───────────────────────────────────────────────────────────────────

async function pushDirty(userId: string) {
  const sb = getSupabase();
  if (!sb) return;
  const cur = readLocal();

  // settings — push when local differs from what we last synced
  const settingsHash = stableHash({
    passportId: cur.passportId,
    profile: cur.profile,
    seenWelcome: cur.seenWelcome,
    reminders: cur.reminders,
  });
  const sm = meta.settings?.["settings"];
  if (!sm || sm.hash !== settingsHash) {
    const { error, data } = await sb
      .from("user_settings")
      .upsert({
        user_id: userId,
        passport_id: cur.passportId || null,
        profile: cur.profile,
        seen_welcome: cur.seenWelcome,
        reminders: cur.reminders,
      })
      .select("updated_at")
      .single();
    if (error) throw error;
    meta.settings = { settings: { updatedAt: cloudTime(data?.updated_at) || Date.now(), hash: settingsHash } };
  }

  // daily logs — dirty days only
  const dirtyLogs: string[] = [];
  for (const [date, day] of Object.entries(cur.logs)) {
    const hash = stableHash(day);
    if (meta.logs[date]?.hash !== hash) dirtyLogs.push(date);
  }
  if (dirtyLogs.length > 0) {
    const payload = dirtyLogs.map((date) => ({
      user_id: userId,
      log_date: date,
      day: cur.logs[date],
    }));
    const { error, data } = await sb
      .from("daily_logs")
      .upsert(payload, { onConflict: "user_id,log_date" })
      .select("log_date, updated_at");
    if (error) throw error;
    for (const r of data ?? []) {
      meta.logs[r.log_date] = { updatedAt: cloudTime(r.updated_at) || Date.now(), hash: stableHash(cur.logs[r.log_date]) };
    }
  }

  // measurements — dirty days only
  const dirtyMeas: string[] = [];
  for (const [date, meas] of Object.entries(cur.measurements)) {
    const hash = stableHash(meas);
    if (meta.meas[date]?.hash !== hash) dirtyMeas.push(date);
  }
  if (dirtyMeas.length > 0) {
    const payload = dirtyMeas.map((date) => ({
      user_id: userId,
      log_date: date,
      weight_kg: cur.measurements[date].weightKg ?? null,
      waist_cm: cur.measurements[date].waistCm ?? null,
    }));
    const { error, data } = await sb
      .from("measurements")
      .upsert(payload, { onConflict: "user_id,log_date" })
      .select("log_date, updated_at");
    if (error) throw error;
    for (const r of data ?? []) {
      meta.meas[r.log_date] = { updatedAt: cloudTime(r.updated_at) || Date.now(), hash: stableHash(cur.measurements[r.log_date]) };
    }
  }

  // daily steps — dirty days only
  const dirtySteps: string[] = [];
  for (const [date, steps] of Object.entries(cur.dailySteps)) {
    const hash = stableHash(steps);
    if (meta.steps[date]?.hash !== hash) dirtySteps.push(date);
  }
  if (dirtySteps.length > 0) {
    const payload = dirtySteps.map((date) => ({
      user_id: userId,
      log_date: date,
      steps: cur.dailySteps[date],
    }));
    const { error, data } = await sb
      .from("daily_steps")
      .upsert(payload, { onConflict: "user_id,log_date" })
      .select("log_date, updated_at");
    if (error) throw error;
    for (const r of data ?? []) {
      meta.steps[r.log_date] = { updatedAt: cloudTime(r.updated_at) || Date.now(), hash: stableHash(cur.dailySteps[r.log_date]) };
    }
  }

  // chat — idempotent upsert of everything local (≤40 rows), dupes skipped
  if (cur.chat.length > 0) {
    const payload = cur.chat.map((m) => ({
      user_id: userId,
      msg_key: `${m.ts}:${m.role}`,
      role: m.role,
      content: m.content,
    }));
    const { error } = await sb
      .from("chat_messages")
      .upsert(payload, { onConflict: "user_id,msg_key", ignoreDuplicates: true });
    if (error) throw error;
  }
}

// ─── full cycle ─────────────────────────────────────────────────────────────

async function fullCycle(userId: string, { pull = true }: { pull?: boolean } = {}) {
  if (cycleBusy) return;
  cycleBusy = true;
  setSync({ status: "syncing" });
  try {
    if (pull) await pullAll(userId);
    await pushDirty(userId);
    setSync({ status: "synced", lastSync: Date.now(), error: null });
  } catch (err) {
    setSync({ status: "error", error: friendly(err) });
    // single self-healing retry, then wait for the next natural trigger
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (running && activeUser === userId) void fullCycle(userId);
    }, RETRY_DELAY_MS);
  } finally {
    cycleBusy = false;
  }
}

/** Manual "Sync now" — pull + push immediately. */
export function syncNow() {
  if (running && activeUser) void fullCycle(activeUser);
}

// ─── engine lifecycle ───────────────────────────────────────────────────────

function startEngine(userId: string) {
  if (running && activeUser === userId) return;
  stopEngine();
  running = true;
  activeUser = userId;

  // any store change → debounced push of dirty rows
  unsubscribeStore = useNourish.subscribe(() => {
    if (!running) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushTimer = null;
      if (running && activeUser) void fullCycle(activeUser, { pull: false });
    }, PUSH_DEBOUNCE_MS);
  });

  // periodic re-pull (second device may have moved ahead)
  pullTimer = setInterval(() => {
    if (running && activeUser) void fullCycle(activeUser);
  }, PULL_INTERVAL_MS);

  // pull when the tab regains focus
  onFocus = () => {
    if (running && activeUser) void fullCycle(activeUser);
  };
  window.addEventListener("focus", onFocus);

  // first cycle: pull cloud, then push everything local (initial migration)
  void fullCycle(userId);
}

function stopEngine() {
  running = false;
  activeUser = null;
  if (pushTimer) clearTimeout(pushTimer);
  if (pullTimer) clearInterval(pullTimer);
  if (retryTimer) clearTimeout(retryTimer);
  pushTimer = pullTimer = retryTimer = null;
  unsubscribeStore?.();
  if (onFocus) window.removeEventListener("focus", onFocus);
  onFocus = null;
  unsubscribeStore = null;
}

// ─── public bootstrap (called once from page.tsx) ───────────────────────────

let booted = false;

export function initSync() {
  if (booted) return;
  booted = true;
  if (!supabaseEnabled) {
    setSync({ status: "off" });
    return;
  }
  setSync({ status: "local" });

  // follow the auth store: sign-in starts the engine, sign-out stops it
  subscribeAuth((state) => {
    const userId = state.userId;
    if (userId && userId !== activeUser) {
      startEngine(userId);
    } else if (!userId && running) {
      stopEngine();
      setSync({ status: "local", error: null });
    }
  });
}

// tiny indirection so the auth subscription is testable and the naming
// doesn't trip React's rules-of-hooks (this is a plain zustand subscription,
// not a hook)
function subscribeAuth(fn: (state: { userId: string | null }) => void) {
  let prev = useAuth.getState().userId;
  useAuth.subscribe((state) => {
    if (state.userId !== prev) {
      prev = state.userId;
      fn(state);
    }
  });
}
