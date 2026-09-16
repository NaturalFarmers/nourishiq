"use client";

/**
 * NourishIQ ↔ Supabase browser client.
 *
 * Deliberately lazy + optional: with no NEXT_PUBLIC_SUPABASE_* env vars the
 * app stays in 100 % local-only mode (exactly as before cloud sync existed).
 * Everything downstream must go through supabaseEnabled / getSupabase().
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True only when BOTH env vars are present (checked at module load). */
export const supabaseEnabled = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/**
 * Returns the shared browser client, or null when cloud sync is not
 * configured. Sessions persist in localStorage and auto-refresh; we do our
 * own auth-state plumbing so URL detection stays off.
 */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseEnabled) return null;
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
