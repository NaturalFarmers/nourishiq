"use client";

/**
 * NourishIQ auth store — passwordless email-OTP sign-in via Supabase.
 *
 * Flow: email → 6-digit code from inbox → session. No passwords anywhere.
 * Signing out NEVER deletes local data; the sync engine simply stops.
 */
import { create } from "zustand";
import { getSupabase, supabaseEnabled } from "./client";

export type AuthStatus =
  | "idle" // cloud not configured, or waiting for the user
  | "sending" // OTP email on its way
  | "awaiting-code" // code sent, user typing it
  | "verifying"
  | "signed-in"
  | "error";

interface AuthState {
  userId: string | null;
  email: string | null;
  status: AuthStatus;
  error: string | null;
  /** one-time bootstrap: restore session + subscribe to auth changes */
  init: () => void;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

/** Map raw Supabase errors to short, actionable sentences. */
function friendlyError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("signups not allowed") || s.includes("sign-up"))
    return "New sign-ups are disabled for this project — enable them under Authentication → Providers → Email.";
  if (s.includes("rate limit") || s.includes("too many"))
    return "Too many codes requested — wait a few minutes (free tier allows ~4 per hour).";
  if (s.includes("invalid") && (s.includes("token") || s.includes("otp") || s.includes("code")))
    return "That code didn't match — check the latest email and try again.";
  if (s.includes("expired"))
    return "The code expired — request a fresh one.";
  if (s.includes("failed to fetch") || s.includes("network"))
    return "Cannot reach your Supabase project — check the URL in .env.local (or the project is paused).";
  if (s.includes("anonymous"))
    return "Email sign-in is required — anonymous sessions are not supported here.";
  return raw.length > 140 ? raw.slice(0, 140) + "…" : raw;
}

let booted = false;

export const useAuth = create<AuthState>()((set, get) => ({
  userId: null,
  email: null,
  status: "idle",
  error: null,

  init: () => {
    if (booted || !supabaseEnabled) return;
    const sb = getSupabase();
    if (!sb) return;
    booted = true;

    // restore an existing session (page reload)
    sb.auth
      .getSession()
      .then(({ data }) => {
        const user = data.session?.user;
        if (user) {
          set({
            userId: user.id,
            email: user.email ?? null,
            status: "signed-in",
          });
        }
      })
      .catch(() => {
        /* offline — stay signed out, local mode still works */
      });

    // keep the store in step with token refreshes / other tabs
    sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        const user = session?.user;
        if (user) {
          // avoid clobbering the "verifying → signed-in" transition
          if (get().userId !== user.id) {
            set({ userId: user.id, email: user.email ?? null, status: "signed-in", error: null });
          } else if (get().status !== "signed-in") {
            set({ status: "signed-in" });
          }
        }
      } else if (event === "SIGNED_OUT") {
        set({ userId: null, email: null, status: "idle", error: null });
      }
    });
  },

  sendCode: async (email) => {
    const sb = getSupabase();
    if (!sb) {
      set({ status: "error", error: "Cloud sync is not configured (missing .env.local keys)." });
      return;
    }
    const trimmed = email.trim();
    set({ status: "sending", error: null, email: trimmed });
    const { error } = await sb.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });
    if (error) {
      set({ status: "error", error: friendlyError(error.message) });
      return;
    }
    set({ status: "awaiting-code" });
  },

  verifyCode: async (email, token) => {
    const sb = getSupabase();
    if (!sb) return;
    set({ status: "verifying", error: null });
    const { error } = await sb.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: "email",
    });
    if (error) {
      set({ status: "error", error: friendlyError(error.message) });
      return;
    }
    const { data } = await sb.auth.getSession();
    set({
      userId: data.session?.user.id ?? null,
      email: email.trim(),
      status: "signed-in",
      error: null,
    });
  },

  signOut: async () => {
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.auth.signOut();
      } catch {
        /* session may already be gone */
      }
    }
    // local data intentionally kept — sync engine stops itself on userId=null
    set({ userId: null, email: null, status: "idle", error: null });
  },

  clearError: () => set({ error: null, status: get().userId ? "signed-in" : "idle" }),
}));
