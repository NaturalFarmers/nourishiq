#!/usr/bin/env node
/**
 * NourishIQ — AI Nutritionist Doctor
 * Zero-dependency diagnostic: run `node scripts/doctor.mjs` from the project root.
 * Pinpoints exactly why the AI nutritionist chat is not working on this machine.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { platform } from "node:process";

const ok = (m) => console.log(`  \x1b[32mPASS\x1b[0m  ${m}`);
const bad = (m, fix) => {
  console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`);
  if (fix) console.log(`        \x1b[33mfix:\x1b[0m ${fix}`);
};
const info = (m) => console.log(`  \x1b[36m....\x1b[0m  ${m}`);
const head = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

const ROOT = process.cwd();
let fatal = false;
let config = null; // resolved {baseUrl, apiKey, source}

head("NourishIQ AI Nutritionist — Doctor");
console.log(`  platform : ${platform} · node ${process.version} · cwd: ${ROOT}`);

// ── 1. Dependencies ──────────────────────────────────────────────────────────
head("1. Dependencies");
if (existsSync(join(ROOT, "node_modules"))) {
  ok("node_modules present");
  if (existsSync(join(ROOT, "node_modules", "z-ai-web-dev-sdk", "dist", "index.js")))
    ok("z-ai-web-dev-sdk installed");
  else {
    bad("z-ai-web-dev-sdk missing from node_modules", "npm install");
    fatal = true;
  }
} else {
  bad("node_modules missing — dependencies not installed", "npm install");
  fatal = true;
}

// ── 2. Database ──────────────────────────────────────────────────────────────
head("2. Database");
if (existsSync(join(ROOT, ".env"))) {
  ok(".env found");
  const env = readFileSync(join(ROOT, ".env"), "utf8");
  const m = env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
  if (m) {
    ok(`DATABASE_URL = ${m[1].trim()}`);
    // resolve sqlite path: absolute → use as-is; relative → relative to prisma/ dir (Prisma convention)
    let rel = m[1].trim().replace(/^file:/, "");
    const isAbs = /^[\\/]/.test(rel) || /^[A-Za-z]:[\\/]/.test(rel);
    const abs = isAbs ? rel : join(ROOT, "prisma", rel);
    if (existsSync(abs)) ok(`db file exists: ${abs}`);
    else bad(`db file missing at ${abs}`, "mkdir -p db && npm run db:push");
  } else bad(".env has no DATABASE_URL line", 'add: DATABASE_URL="file:../db/custom.db"');
} else {
  bad(".env missing", 'create .env with: DATABASE_URL="file:../db/custom.db"');
}

// ── 3. AI config (.z-ai-config) ─────────────────────────────────────────────
head("3. AI config (.z-ai-config)");
const candidates = [
  { p: join(ROOT, ".z-ai-config"), src: "project root" },
  { p: join(homedir(), ".z-ai-config"), src: `home dir (${homedir()})` },
  { p: "/etc/.z-ai-config", src: "/etc (system-wide)" },
];
let raw = null, src = null;
for (const c of candidates) {
  if (existsSync(c.p)) { raw = readFileSync(c.p, "utf8"); src = `${c.src}: ${c.p}`; break; }
}
if (!raw) {
  bad(
    "no .z-ai-config found in project root, home dir, or /etc",
    `create ${join(ROOT, ".z-ai-config")} with:\n        { "baseUrl": "https://api.z.ai/api/paas/v4", "apiKey": "YOUR_REAL_ZAI_API_KEY" }`
  );
  fatal = true;
} else {
  ok(`config found (${src})`);
  try {
    const j = JSON.parse(raw);
    config = j;
    if (j.baseUrl) ok(`baseUrl = ${j.baseUrl}`);
    else { bad("baseUrl missing", '"baseUrl": "https://api.z.ai/api/paas/v4"'); fatal = true; }
    const key = j.apiKey || "";
    if (!key) { bad("apiKey missing", "add your real Z.ai API key"); fatal = true; }
    else if (key.length < 20 || /paste_|your_zai|_here|placeholder/i.test(key)) {
      bad(`apiKey looks like a placeholder (${key.slice(0, 12)}…)`, "get a free key at https://z.ai / https://open.bigmodel.cn and paste it");
      fatal = true;
    } else ok(`apiKey present (${key.length} chars, ends …${key.slice(-4)})`);
  } catch {
    bad("config is not valid JSON", "check for trailing commas / quotes; must be valid JSON");
    fatal = true;
  }
}

// ── 4. Live Z.ai API test (direct, no SDK) ──────────────────────────────────
head("4. Live Z.ai API test");
let apiOk = false;
if (config?.baseUrl && config?.apiKey) {
  const url = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
  info(`POST ${url} (model: glm-4.5-flash, free)`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: "glm-4.5-flash",
        messages: [{ role: "user", content: "Reply with the single word OK" }],
        max_tokens: 8,
        thinking: { type: "disabled" },
      }),
      signal: AbortSignal.timeout(30000),
    });
    const text = (await res.text()).slice(0, 400);
    if (res.ok) {
      ok(`HTTP ${res.status} — Z.ai replied (${text.match(/"content"\s*:\s*"([^"]{0,20})/)?.[1] ?? "…"}…)`);
      apiOk = true;
      fatal = false; // direct API works → config is definitively good
    } else {
      bad(`HTTP ${res.status} — ${text}`);
      if (res.status === 401 || res.status === 403)
        console.log(`        \x1b[33mfix:\x1b[0m API key rejected — re-copy the key, ensure no quotes/spaces, account has Flash access (free)`);
      else if (res.status === 404)
        console.log(`        \x1b[33mfix:\x1b[0m baseUrl wrong — must be exactly https://api.z.ai/api/paas/v4`);
      else if (res.status === 429)
        console.log(`        \x1b[33mfix:\x1b[0m rate limited — wait a minute and retry`);
      fatal = true;
    }
  } catch (e) {
    bad(`network error: ${e.message}`, "check internet / firewall / VPN; baseUrl must be https://api.z.ai/api/paas/v4");
    fatal = true;
  }
} else info("skipped — no valid config to test");

// ── 5. Local dev server /api/chat ───────────────────────────────────────────
head("5. Local dev server (http://localhost:3000)");
let chatOk = false;
const payload = {
  messages: [{ role: "user", content: "Say OK in one word" }],
  context: {
    rx: null,
    profile: { sex: "male", age: 30, heightCm: 175, weightKg: 70, activity: "moderate", pattern: null, exclusions: [], boosters: [] },
    today: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, waterMl: 0, entries: 0 },
    week: null,
  },
};
try {
  const res = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45000),
  });
  const text = (await res.text()).slice(0, 400);
  if (res.ok) { ok(`HTTP ${res.status} — /api/chat works end-to-end. Your nutritionist is ALIVE 🎉`); chatOk = true; }
  else {
    bad(`HTTP ${res.status} — ${text}`);
    console.log(`        \x1b[33mfix:\x1b[0m the red error text above says exactly what's wrong (route.ts dev diagnostics)`);
    fatal = true;
  }
} catch {
  info("dev server not reachable on :3000 — start it: npm run dev, then re-run this doctor");
}

// ── Verdict ──────────────────────────────────────────────────────────────────
head("Verdict");
if (chatOk) {
  console.log("  \x1b[32m✅ /api/chat works end-to-end — your nutritionist is LIVE. Open http://localhost:3000 → Ask the Nutritionist.\x1b[0m");
  if (!apiOk && config)
    console.log("  \x1b[36m(note: direct API probe disagreed, but the app's own endpoint is the authoritative test — likely a sandbox/gateway quirk)\x1b[0m");
} else if (!fatal)
  console.log("  \x1b[33mConfig looks good but dev server isn't running. Start it: npm run dev → then re-run: node scripts/doctor.mjs\x1b[0m");
else
  console.log("  \x1b[33mFix the FAIL items above (top to bottom), then re-run: node scripts/doctor.mjs\x1b[0m");