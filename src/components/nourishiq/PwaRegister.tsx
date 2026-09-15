"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker once, shortly after mount. Silent no-op on
 * unsupported browsers (or non-secure contexts) — registration failures are
 * swallowed so they can never affect the app itself.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;
    const t = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* PWA is progressive enhancement — ignore */
      });
    }, 1200);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
