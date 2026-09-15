// Deterministic unit tests for the real Health Connect bridge (nativeHealth.ts).
// The bridge is exercised through dependency-injected mock plugins — exactly the
// shapes @capacitor-community/health and capawesome/capacitor-health expose.
// Run: bun scripts/test-native-health.ts

import {
  ensureStepsPermission,
  fetchNativeStepsFor,
  syncRecentSteps,
  type HealthPlugin,
} from "../src/lib/nourishiq/nativeHealth";
import { fetchNativeSteps } from "../src/lib/nourishiq/steps";

let pass = 0;
let fail = 0;
function ok(cond: boolean, name: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ ${name}`);
  }
}
function eq(a: unknown, b: unknown, name: string) {
  const A = JSON.stringify(a);
  const B = JSON.stringify(b);
  ok(A === B, `${name} (got ${A}, want ${B})`);
}

/** Fixed clock: Mon 2026-09-14 12:00 local — mirrors the other NourishIQ suites. */
const NOW = new Date(2026, 8, 14, 12, 0, 0);

console.log("── web / no-plugin fallbacks");
{
  const r = await syncRecentSteps(5, null, NOW);
  eq(r.status, "unavailable", "no plugin → status unavailable");
  eq(r.imported, 0, "no plugin → imported 0");
  eq(r.byDate, {}, "no plugin → empty map");
  ok(r.message.length > 0, "no plugin → human message present");
  eq(await fetchNativeSteps("2026-09-14"), null, "steps.fetchNativeSteps on web → null");
}

console.log("── permission flow (direct)");
{
  eq(
    await ensureStepsPermission({ requestAuthorization: async () => ({}) }),
    "granted",
    "community-plugin requestAuthorization resolves → granted",
  );
  eq(
    await ensureStepsPermission({
      requestAuthorization: async () => { throw new Error("denied"); },
      requestHealthPermissions: async () => ({}),
    }),
    "granted",
    "first shape rejects → falls through to capawesome shape → granted",
  );
  eq(
    await ensureStepsPermission({
      requestAuthorization: async () => { throw new Error("denied"); },
      requestHealthPermissions: async () => { throw new Error("denied"); },
    }),
    "denied",
    "all shapes reject → denied",
  );
  eq(await ensureStepsPermission({}), "unsupported", "no permission methods → unsupported");
}

console.log("── syncRecentSteps · scalar shape (@capacitor-community/health)");
{
  const calls: Array<Record<string, unknown>> = [];
  const p: HealthPlugin = {
    requestAuthorization: async () => ({}),
    queryAggregated: async (args) => {
      calls.push(args as Record<string, unknown>);
      return { value: 6000 };
    },
  };
  const r = await syncRecentSteps(5, p, NOW);
  eq(r.status, "ok", "scalar → ok");
  eq(r.imported, 5, "scalar → imported 5");
  eq(Object.keys(r.byDate).length, 5, "scalar → 5 map keys");
  eq(r.byDate["2026-09-14"], 6000, "today present");
  eq(r.byDate["2026-09-10"], 6000, "oldest backfill day present");
  eq(
    Object.keys(r.byDate).sort(),
    ["2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14"],
    "keys contiguous ending at fixed now",
  );
  eq(calls.length, 5, "one queryAggregated call per day");
  ok(calls[0].startDate instanceof Date, "startDate passed as Date (bridge-serialisable)");
  ok(
    typeof (calls[0] as { dataType?: string }).dataType === "string",
    "dataType field present for community plugin",
  );
  ok(r.message.includes("Synced 5 days"), "message names the day count");
}

console.log("── syncRecentSteps · bucketed aggregations shape");
{
  const p: HealthPlugin = {
    requestAuthorization: async () => ({}),
    queryAggregated: async () => ({ aggregations: [{ value: 1000 }, { value: 250 }, { value: -5 }] }),
  };
  const r = await syncRecentSteps(3, p, NOW);
  eq(r.status, "ok", "bucketed → ok");
  eq(r.byDate["2026-09-14"], 1250, "buckets summed, negative ignored (1000+250)");
}

console.log("── value edge cases");
{
  const mk = (val: unknown) =>
    ({ requestAuthorization: async () => ({}), queryAggregated: async () => val }) as HealthPlugin;

  const r1 = await syncRecentSteps(1, mk({ value: 6000.6 }), NOW);
  eq(r1.byDate["2026-09-14"], 6001, "fractional steps rounded up to nearest int");

  const r2 = await syncRecentSteps(1, mk({ value: 0 }), NOW);
  eq(r2.status, "ok", "zero-step day counts as real data");
  eq(r2.byDate["2026-09-14"], 0, "zero preserved, not dropped");

  const r3 = await syncRecentSteps(2, mk({ value: -100 }), NOW);
  eq(r3.status, "empty", "negative-only values → no usable data → empty");

  const r4 = await syncRecentSteps(2, mk({}), NOW);
  eq(r4.status, "empty", "shape-less responses → empty");
  ok(r4.message.includes("no step data"), "empty message explains no data found");

  const r5 = await syncRecentSteps(2, mk({ steps: 4321 }), NOW);
  eq(r5.byDate["2026-09-14"], 4321, "alt `steps` field accepted");
}

console.log("── failure paths");
{
  const p: HealthPlugin = {
    requestAuthorization: async () => { throw new Error("denied"); },
    queryAggregated: async () => ({ value: 6000 }),
  };
  const r1 = await syncRecentSteps(5, p, NOW);
  eq(r1.status, "denied", "denied permission short-circuits before any query");
  eq(r1.imported, 0, "denied → nothing imported");
  ok(r1.message.toLowerCase().includes("permission"), "denied message mentions permission");

  const p2: HealthPlugin = {
    requestAuthorization: async () => ({}),
    queryAggregated: async () => { throw new Error("bridge down"); },
  };
  const r2 = await syncRecentSteps(3, p2, NOW);
  eq(r2.status, "error", "query errors every day → error status");
  eq(r2.byDate, {}, "error → empty map");
  ok(r2.message.includes("try Sync again"), "error message offers retry");

  const p3: HealthPlugin = { queryAggregated: async () => ({ value: 100 }) };
  const r3 = await syncRecentSteps(2, p3, NOW);
  eq(r3.status, "unavailable", "plugin without any permission method → unavailable (can't ask)");

  const pGap: HealthPlugin = {
    requestAuthorization: async () => ({}),
    queryAggregated: async (args) => {
      const s = String((args as { startDate: Date }).startDate?.toISOString?.() ?? "");
      // only Mon 14th + Sat 12th have data → gap-tolerant merge
      if (s.includes("2026-09-14") || s.includes("2026-09-12")) return { value: 7777 };
      return {};
    },
  };
  const r4 = await syncRecentSteps(5, pGap, NOW);
  eq(r4.status, "ok", "partial coverage still ok");
  eq(r4.imported, 2, "gap-tolerant: only days with data imported");
  eq(r4.byDate["2026-09-13"], undefined, "gap day absent from map (estimates keep it)");
}

console.log("── guards");
{
  eq(await fetchNativeStepsFor("not-a-date", { queryAggregated: async () => ({ value: 1 }) }), null, "garbage date → null");
  eq(
    await fetchNativeStepsFor("2026-09-14", { requestAuthorization: async () => ({}) }),
    null,
    "plugin without queryAggregated → null",
  );
  const r = await syncRecentSteps(0, null as unknown as HealthPlugin, NOW);
  eq(r.status, "unavailable", "days=0 with null plugin still safe");
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
