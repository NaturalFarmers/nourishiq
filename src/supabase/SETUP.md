# NourishIQ ☁️ Supabase Setup — cloud sync in 10 minutes

Turn NourishIQ from a local-only PWA into a cloud-backed app: **free Postgres
database, passwordless auth, and row-level security**, so your diary, weight,
steps, chat history and prescription back up to the cloud and follow you
across devices (phone ↔ laptop).

---

## What you'll build

```
Browser (localStorage = fast offline store)
   │  sign in once with email + 6-digit code
   ▼
Supabase (free tier) ── Postgres tables, protected by RLS
   • user_settings   profile · reminders · passport id
   • daily_logs      one row per day (meals JSONB + water)
   • measurements    one row per day (weight · waist)
   • chat_messages   AI nutritionist history (last 40)
   • daily_steps     Health Connect / Google Fit counts
```

- **Offline still works** — the app reads/writes localStorage first, then
  syncs in the background (debounced push ~1.2 s, re-pull every 60 s / on
  tab focus).
- **First sign-in migrates everything** you already logged locally.
- **Privacy wall** — every table has Row Level Security: rows are only
  readable/writable by the signed-in owner (`auth.uid() = user_id`).
  Even with devtools open, nobody can touch another user's data.
- **Cost** — Supabase free tier (500 MB database, 50k monthly active users)
  is far beyond what one nutrition app needs.

---

## Step 1 — Create the Supabase project (2 min)

1. Go to <https://supabase.com> → **Start your project** → sign up (GitHub is easiest).
2. **New project** → name: `nourishiq` → pick a region near you (e.g. Mumbai
   `ap-south-1` for India) → generate a **database password** (save it
   somewhere — you won't need it for this setup, but keep it).
3. Wait ~1 minute for provisioning.

## Step 2 — Create the tables (1 min)

1. In the Supabase dashboard open **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this project, copy **the entire file**,
   paste it, press **Run**.
3. You should see `Success. No rows returned`. Verify under
   **Table Editor**: 5 tables appear (`user_settings`, `daily_logs`,
   `measurements`, `chat_messages`, `daily_steps`).

## Step 3 — Copy your project keys (1 min)

1. **Project Settings** (gear) → **API**.
2. Copy two values:
   - **Project URL** → `https://xxxxxxxx.supabase.co`
   - **anon public** key (the long `eyJhbGci…` string — safe for browsers,
     RLS protects the data)

## Step 4 — Wire them into the app (1 min)

Create/edit `.env.local` in the project root (same folder as `package.json`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

> `.env.local` beats `.env` and is gitignored — never commit real keys.
> The SQLite `DATABASE_URL` from `.env` can stay as is; it's unused scaffolding.

## Step 5 — Install the dependency + restart (1 min)

```bash
npm install            # picks up @supabase/supabase-js from package.json
# (or: npm install @supabase/supabase-js)
# restart the dev server:  Ctrl+C  →  npm run dev
```

## Step 6 — Sign in and migrate (2 min)

1. Open the app → tap the **👤 button** in the top bar (next to 🔔).
2. Enter your email → **Email me a code** → check your inbox (incl. spam)
   → type the **6-digit code** → **Verify & sign in**.
3. The dialog flips to **Cloud sync on · All synced**. Your existing local
   data (assessment, diary, measurements, steps, chat) is pushed to Supabase
   automatically.
4. Check **Table Editor → daily_logs** in Supabase: your rows are there. 🎉

Sign in on any other device with the **same email** → the cloud pulls down
and both devices stay in sync.

---

## How syncing behaves

| Event | What happens |
|---|---|
| Log a meal / water / weight | localStorage updates instantly → pushed ~1.2 s later |
| Second device changes something | pulled on next 60 s tick, tab focus, sign-in, or **Sync now** |
| Same day edited on two devices | last writer wins (per-day rows, `updated_at` column) |
| AI chat | merged as a union on both devices, last 40 kept |
| Sign out | syncing stops; **local data stays on the device** |
| Clear browser data | cloud copy is safe — sign in again to restore |

## Email allow-list (optional)

By default **anyone** with the URL of your app can sign up. To keep it just
you: Supabase dashboard → **Authentication → Providers → Email** → turn on
**Confirm email** is optional, but better: **Authentication → Sign In /
Providers → Email → restrict to a list**, or simply keep the app URL private.
For a family share: add their emails under
**Authentication → Users → Add user** (invite) and disable open sign-ups in
**Providers → Email → "Allow new users to sign up"**.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Dialog says "Cloud sync is off" | `.env.local` missing/typo'd, or dev server not restarted after adding it |
| "Cannot reach your Supabase project" | wrong `NEXT_PUBLIC_SUPABASE_URL`, or project paused (free projects pause after ~1 week of inactivity — Restore in dashboard) |
| "New sign-ups are disabled" | Authentication → Providers → Email → enable **Allow new users to sign up** |
| Code never arrives | check spam; Authentication → Email Templates shows the sender; rate limit is 4/hour on free tier |
| "Sync error" chip | open the dialog for the message; most often a paused project or laptop asleep during push — tap **Sync now** |
| Schema changes later | edit `schema.sql`-style migrations in SQL Editor; this app reads JSONB columns, so adding fields is easy |

## What was added to the codebase

```
src/lib/supabase/client.ts        browser client + supabaseEnabled flag
src/lib/supabase/auth-store.ts    auth state + email-OTP sign-in/out
src/lib/supabase/sync.ts          pull/merge/push engine + sync status store
src/components/nourishiq/AccountButton.tsx   👤 button + auth/sync dialog
supabase/schema.sql               tables, triggers, 20 RLS policies
```

`page.tsx` mounts `<AccountButton />` in the app bar and calls
`initSync()` + `useAuth.init()` once on load. With no env vars set, all of
it sleeps and the app behaves exactly as before (local-only mode).
