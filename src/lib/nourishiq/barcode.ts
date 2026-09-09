// ─── NourishIQ barcode-style quick-add ──────────────────────────────────────
// The app is fully offline, so packaged-food EAN lookups against external
// databases aren't possible. Instead every food in the NourishIQ library
// carries a deterministic, EAN-13-shaped "NourishIQ code" (Indian 890
// prefix + a stable FNV hash of the food id + a valid EAN check digit).
// Users can type the code, or scan any barcode with the camera — library
// hits jump straight to the portion chooser, unknown codes are told apart.

import { FOODS } from "./foods";
import type { Food } from "./types";

/** Stable base-36 FNV-1a hash → decimal digit string of `len` digits. */
function hashDigits(id: string, len: number): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let out = "";
  while (out.length < len) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    out += String(((h >>> 9) & 0x7fffffff) % 10);
  }
  return out.slice(0, len);
}

/** Valid EAN-13 check digit for a 12-digit body. */
function ean13Check(body12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(body12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

/** The 13-digit NourishIQ code for a library food (stable across devices). */
export function barcodeOf(foodId: string): string {
  const body = "890" + hashDigits(foodId, 9);
  return body + String(ean13Check(body));
}

const BY_CODE: Map<string, Food> = (() => {
  const m = new Map<string, Food>();
  for (const f of FOODS) m.set(barcodeOf(f.id), f);
  return m;
})();

/** Look up a scanned/typed code; accepts 12-digit bodies as well as full 13-digit codes. */
export function foodByBarcode(raw: string): Food | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 13) return BY_CODE.get(digits) ?? null;
  if (digits.length === 12) {
    if (ean13Check(digits) === 0) return null; // would imply wrong check digit anyway
    return BY_CODE.get(digits + String(ean13Check(digits))) ?? null;
  }
  return null;
}

/** Example codes for UI hints (a few popular pantry staples). */
export function sampleBarcodes(ids: string[]): { id: string; name: string; code: string }[] {
  return ids
    .map((id) => {
      const f = FOODS.find((x) => x.id === id);
      return f ? { id, name: f.name, code: barcodeOf(id) } : null;
    })
    .filter((x): x is { id: string; name: string; code: string } => x !== null);
}
