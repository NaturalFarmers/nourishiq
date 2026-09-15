// ─── Real Health Connect bridge (Android / iOS native shell) ────────────────
// This is the production wiring that turns the "ESTIMATED" steps card into
// real, sensor-backed data inside the Capacitor shell.
//
// How it works, with zero compile-time dependencies: a Capacitor shell always
// exposes its installed plugins on `window.Capacitor.Plugins`. When the app is
// built as an Android/iOS binary with a Health plugin included (recommended:
//   npm i @capacitor-community/health
//   npx cap init && npx cap add android
//   # add READ_STEPS to AndroidManifest + Health Connect declaration, then
//   npx cap sync && npx cap run android ),
// `window.Capacitor.Plugins.Health` appears here at runtime and every call
// below becomes a live Health Connect (Android) / HealthKit (iOS) query.
// On the web build — or if the plugin is missing from that shell — every
// function degrades gracefully (null / "unavailable") and the UI keeps using
// deterministic estimates + the Takeout CSV import.
//
// Two response shapes are understood because the plugin ecosystem varies:
//   • scalar  `{ value: 6123 }`            (@capacitor-community/health, no bucket)
//   • bucket  `{ aggregations: [{value}…] }` (day-bucketed replies)
// Anything else resolves as "no data" — never throws into the UI.

import { dateKey } from "./store";

/** Minimal structural type for the runtime-registered Health plugin. */
export interface HealthPlugin {
  requestAuthorization?: (args: { readTypes: string[]; writeTypes?: string[] }) => Promise<unknown>;
  /** capawesome-style permission call (accepted as a fallback shape) */
  requestHealthPermissions?: (args: { readPermissions: string[] }) => Promise<unknown>;
  queryAggregated?: (args: {
    dataType?: string;
    metric?: string;
    startDate: Date | string;
    endDate: Date | string;
    bucket?: string;
  }) => Promise<unknown>;
}

type CapWindow = {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
    Plugins?: Record<string, unknown>;
  };
};

/** The registered Health plugin inside a native shell, else null (web / SSR). */
export function getHealthPlugin(): HealthPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as CapWindow).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  const reg = cap.Plugins ?? {};
  for (const name of ["Health", "HealthConnect"]) {
    const p = reg[name] as HealthPlugin | undefined;
    if (p && typeof p.queryAggregated === "function") return p;
  }
  return null;
}

/** True only inside a native shell that actually carries a usable Health plugin. */
export function hasNativeHealth(): boolean {
  return getHealthPlugin() != null;
}

/**
 * Ask the OS permission dialog for step read access. Tries the known call
 * shapes of the mainstream plugins; any successful resolution counts as
 * granted, a rejection on all shapes counts as denied.
 */
export async function ensureStepsPermission(
  p: HealthPlugin,
): Promise<"granted" | "denied" | "unsupported"> {
  const attempts: Array<() => Promise<unknown>> = [];
  if (typeof p.requestAuthorization === "function")
    attempts.push(() => p.requestAuthorization!({ readTypes: ["steps"], writeTypes: [] }));
  if (typeof p.requestHealthPermissions === "function")
    attempts.push(() =>
      p.requestHealthPermissions!({ readPermissions: ["android.permission.health.READ_STEPS"] }),
    );
  if (attempts.length === 0) return "unsupported";
  for (const go of attempts) {
    try {
      await go();
      return "granted";
    } catch {
      // try the next call shape before giving up
    }
  }
  return "denied";
}

/**
 * One day's real step count from Health Connect. Understands both the scalar
 * and the bucketed response shapes. Returns null when the day has no usable
 * aggregate (no data, negative garbage); THROWS only on bridge/plugin errors —
 * callers decide whether that is fatal (syncRecentSteps catches per day;
 * steps.fetchNativeSteps swallows).
 */
export async function fetchNativeStepsFor(dateStr: string, p: HealthPlugin): Promise<number | null> {
  if (typeof p.queryAggregated !== "function") return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  const res = (await p.queryAggregated({
    dataType: "steps",
    metric: "steps",
    startDate: start,
    endDate: end,
  })) as { value?: unknown; steps?: unknown; aggregations?: unknown } | null | undefined;
  if (!res) return null;
  if (Array.isArray(res.aggregations)) {
    let sum = 0;
    let saw = false;
    for (const it of res.aggregations as Array<{ value?: unknown }>) {
      const v = Number(it?.value);
      if (Number.isFinite(v) && v >= 0) {
        sum += v;
        saw = true;
      }
    }
    return saw ? Math.round(sum) : null;
  }
  const v = Number(res.value ?? res.steps);
  return Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
}

export interface NativeSyncResult {
  status: "unavailable" | "denied" | "error" | "empty" | "ok";
  /** distinct days that received a real value */
  imported: number;
  /** YYYY-MM-DD → real steps; empty unless status "ok" */
  byDate: Record<string, number>;
  /** human line for the status chip */
  message: string;
}

/**
 * Full backfill: request permission once, then pull the last `days` days of
 * aggregated steps and return them as a date map ready for setDailySteps().
 * Days the platform has no data for are simply absent from the map (the UI
 * keeps its estimates for those). Pure fallback everywhere else.
 */
export async function syncRecentSteps(
  days = 35,
  plugin?: HealthPlugin | null,
  now: Date = new Date(),
): Promise<NativeSyncResult> {
  const p = plugin === undefined ? getHealthPlugin() : plugin;
  if (!p)
    return {
      status: "unavailable",
      imported: 0,
      byDate: {},
      message: "Health Connect lives in the Android app — on the web, import a Takeout CSV instead.",
    };
  const perm = await ensureStepsPermission(p);
  if (perm === "unsupported")
    return {
      status: "unavailable",
      imported: 0,
      byDate: {},
      message: "This app build can't talk to Health Connect (no permission method) — update the app.",
    };
  if (perm === "denied")
    return {
      status: "denied",
      imported: 0,
      byDate: {},
      message: "Health Connect permission was declined — allow Steps access for NourishIQ in Android settings.",
    };

  const byDate: Record<string, number> = {};
  let errs = 0;
  const n = Math.max(1, Math.min(400, days));
  for (let i = 0; i < n; i++) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - i);
    const dk = dateKey(dt);
    let v: number | null;
    try {
      v = await fetchNativeStepsFor(dk, p);
    } catch {
      errs++; // bridge/plugin failure — distinct from "no data"
      continue;
    }
    if (v == null) continue; // day simply has no data → estimates keep it
    byDate[dk] = v;
  }
  const imported = Object.keys(byDate).length;
  if (imported === 0)
    return {
      status: errs > 0 ? "error" : "empty",
      imported: 0,
      byDate: {},
      message:
        errs > 0
          ? "Couldn't read steps from Health Connect — try Sync again."
          : `Connected to Health Connect, but no step data in the last ${n} days.`,
    };
  return {
    status: "ok",
    imported,
    byDate,
    message: `Synced ${imported} day${imported === 1 ? "" : "s"} of real steps from Health Connect.`,
  };
}
