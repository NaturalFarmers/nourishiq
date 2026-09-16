"use client";

/**
 * Account & cloud-sync button for the app bar (👤, next to 🔔).
 *
 * One dialog, three states:
 *  • cloud not configured → setup explainer (which env vars to add)
 *  • signed out → email → 6-digit code (passwordless OTP)
 *  • signed in → sync status chip, "Sync now", "Sign out"
 *
 * Signing out never deletes data on the device — the dialog says so.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/lib/supabase/auth-store";
import { useSync, syncNow } from "@/lib/supabase/sync";
import { supabaseEnabled } from "@/lib/supabase/client";

function timeAgo(ts: number | null): string {
  if (!ts) return "";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h} h ago`;
}

export default function AccountButton() {
  const [open, setOpen] = useState(false);
  const { userId, email, status, error, sendCode, verifyCode, signOut, clearError } = useAuth();
  const syncStatus = useSync((s) => s.status);
  const lastSync = useSync((s) => s.lastSync);
  const syncError = useSync((s) => s.error);

  const [step, setStep] = useState<"email" | "code">("email");
  const [emailInput, setEmailInput] = useState("");
  const [code, setCode] = useState("");
  // bumped on dialog open so "3 min ago" style labels re-render honestly
  const [, setNow] = useState(0);

  // auto-verify once all 6 digits are in
  useEffect(() => {
    if (step === "code" && code.length === 6 && status !== "verifying") {
      void verifyCode(emailInput, code);
    }
  }, [step, code, status, verifyCode, emailInput]);

  const dot =
    syncStatus === "synced"
      ? "bg-[#22C55E]"
      : syncStatus === "syncing"
        ? "bg-amber-400 animate-pulse"
        : syncStatus === "error"
          ? "bg-rose-500"
          : null;

  const sendIt = async () => {
    clearError();
    await sendCode(emailInput);
    setStep("code");
  };

  const backToEmail = () => {
    setStep("email");
    setCode("");
    clearError();
  };

  return (
    <>
      <button
        onClick={() => {
          setNow((n) => n + 1);
          setOpen(true);
        }}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-stone-200 bg-white text-[15px] active:scale-95 transition-transform"
        aria-label="Account and cloud sync"
        title="Account & cloud sync"
      >
        {userId ? "☁️" : "👤"}
        {userId && dot && (
          <span className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${dot} ring-2 ring-[#FAF9F6]`} aria-hidden />
        )}
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) clearError(); }}>
        <DialogContent className="max-w-[22rem] rounded-3xl border-stone-200 p-6">
          {!supabaseEnabled ? (
            /* ── 1. cloud not configured ── */
            <div className="space-y-3">
              <DialogHeader>
                <DialogTitle className="text-[17px] text-stone-900">Cloud sync is off</DialogTitle>
                <DialogDescription className="text-[13px] leading-relaxed text-stone-500">
                  Your data lives only in this browser — which is fine, but clearing
                  browser data would erase it. Connect a free Supabase project to
                  back up to the cloud and sync across devices.
                </DialogDescription>
              </DialogHeader>
              <ol className="list-decimal space-y-1.5 pl-5 text-[12.5px] leading-relaxed text-stone-600">
                <li>Create a project at supabase.com (free)</li>
                <li>Run <code className="rounded bg-stone-100 px-1 py-0.5 text-[11px]">supabase/schema.sql</code> in its SQL Editor</li>
                <li>Add its URL + anon key to <code className="rounded bg-stone-100 px-1 py-0.5 text-[11px]">.env.local</code>:</li>
              </ol>
              <pre className="overflow-x-auto rounded-xl bg-stone-900 px-3 py-2.5 text-[11px] leading-relaxed text-stone-100" aria-label="Environment variables to add">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci…`}
              </pre>
              <p className="text-[11.5px] leading-relaxed text-stone-400">
                Then restart the dev server. Full walkthrough: <code className="rounded bg-stone-100 px-1 py-0.5 text-[11px]">supabase/SETUP.md</code>
              </p>
            </div>
          ) : userId ? (
            /* ── 2. signed in ── */
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-[17px] text-stone-900">Cloud sync on</DialogTitle>
                <DialogDescription className="truncate text-[13px] text-stone-500">{email}</DialogDescription>
              </DialogHeader>

              <div
                className={`flex items-center justify-between rounded-2xl px-3.5 py-3 text-[12.5px] font-bold ${
                  syncStatus === "error"
                    ? "bg-rose-50 text-rose-700"
                    : syncStatus === "syncing"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                }`}
              >
                <span>
                  {syncStatus === "syncing" && "Syncing…"}
                  {syncStatus === "synced" && `All synced${lastSync ? ` · ${timeAgo(lastSync)}` : ""}`}
                  {syncStatus === "error" && "Sync error"}
                  {syncStatus === "local" && "Waiting for sync…"}
                  {syncStatus === "off" && "Sync unavailable"}
                </span>
                <span className="text-[11px] font-semibold opacity-70">
                  {syncStatus === "synced" && "✓"}
                  {syncStatus === "error" && "!"}
                </span>
              </div>

              {syncStatus === "error" && syncError && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-[12px] leading-relaxed text-rose-700">{syncError}</p>
              )}

              <p className="text-[12px] leading-relaxed text-stone-500">
                Diary, weight, steps and chat follow you to any device you sign in
                on with the same email. Offline edits catch up automatically.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => syncNow()}
                  className="flex-1 rounded-full bg-[#0B5C46] px-4 py-2.5 text-[13px] font-bold text-white active:scale-95 transition-transform"
                >
                  Sync now
                </button>
                <button
                  onClick={() => void signOut()}
                  className="rounded-full border border-stone-200 bg-white px-4 py-2.5 text-[13px] font-bold text-stone-600 active:scale-95 transition-transform"
                >
                  Sign out
                </button>
              </div>

              <p className="text-[11.5px] leading-relaxed text-stone-400">
                Signing out keeps all data on this device.
              </p>
            </div>
          ) : (
            /* ── 3. sign-in (email → code) ── */
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-[17px] text-stone-900">
                  {step === "email" ? "Turn on cloud sync" : "Check your inbox"}
                </DialogTitle>
                <DialogDescription className="text-[13px] leading-relaxed text-stone-500">
                  {step === "email"
                    ? "Sign in with just your email — we'll send a 6-digit code. No password needed. Your existing local data uploads right after."
                    : `We emailed a 6-digit code to ${emailInput}. It may take a minute; check spam too.`}
                </DialogDescription>
              </DialogHeader>

              {step === "email" ? (
                <>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && emailInput.includes("@") && void sendIt()}
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-[14px] outline-none placeholder:text-stone-300 focus:border-[#0B5C46]"
                    aria-label="Email address"
                  />
                  {error && <p className="text-[12px] leading-relaxed text-rose-600">{error}</p>}
                  <button
                    onClick={() => void sendIt()}
                    disabled={!emailInput.includes("@") || status === "sending"}
                    className="w-full rounded-full bg-[#0B5C46] px-4 py-2.5 text-[13.5px] font-bold text-white disabled:opacity-40 active:scale-95 transition-transform"
                  >
                    {status === "sending" ? "Sending…" : "Email me a code"}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={code} onChange={setCode} disabled={status === "verifying"}>
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {error && <p className="text-center text-[12px] leading-relaxed text-rose-600">{error}</p>}
                  <button
                    onClick={() => void verifyCode(emailInput, code)}
                    disabled={code.length < 6 || status === "verifying"}
                    className="w-full rounded-full bg-[#0B5C46] px-4 py-2.5 text-[13.5px] font-bold text-white disabled:opacity-40 active:scale-95 transition-transform"
                  >
                    {status === "verifying" ? "Verifying…" : "Verify & sign in"}
                  </button>
                  <button
                    onClick={backToEmail}
                    className="w-full text-center text-[12px] font-semibold text-stone-400 hover:text-stone-600"
                  >
                    Use a different email
                  </button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
