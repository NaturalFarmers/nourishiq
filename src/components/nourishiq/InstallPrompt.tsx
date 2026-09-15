"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "nourishiq-install-dismissed";

type NavigatorStandalone = Navigator & { standalone?: boolean };

/**
 * "Install NourishIQ" card.
 *  • Android/desktop Chromium: captures beforeinstallprompt and drives the
 *    native install dialog.
 *  • iOS Safari: no install event exists — shows the manual Add to Home Screen
 *    hint once.
 *  • Hidden when already running installed (display-mode: standalone), when
 *    previously dismissed, and on platforms that can't install.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      return;
    }
    // already installed (Android/desktop or iOS standalone)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as NavigatorStandalone).standalone === true;
    if (standalone) return;

    const onBip = (e: Event) => {
      e.preventDefault(); // keep our in-app card instead of the browser mini-infobar
      setDeferred(e as InstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    let timer: number | undefined;
    const ua = navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    if (isIOS && isSafari) {
      timer = window.setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 2500);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode — fine, it just may show again next session */
    }
    setVisible(false);
  };

  const install = async () => {
    if (!deferred || busy) return;
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* user closed the dialog — no action needed */
    }
    setDeferred(null);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="rounded-[26px] bg-white border border-stone-200/80 p-4"
          aria-label="install app"
        >
          <div className="flex items-start gap-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#0B5C46]"
              aria-hidden
            >
              <img src="/icons/icon-192.png" alt="" className="h-11 w-11" />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-[14px] font-extrabold text-stone-900">
                Install NourishIQ{iosHint ? " on your iPhone" : ""}
              </h2>
              <p className="text-[12px] text-stone-500 mt-0.5 leading-relaxed">
                {iosHint
                  ? "Tap the Share button in Safari, then choose “Add to Home Screen” — it opens fullscreen and works like an app."
                  : "Add it to your home screen — fullscreen, no browser bar, opens instantly."}
              </p>
            </div>
            <button
              onClick={dismiss}
              className="shrink-0 grid h-7 w-7 place-items-center rounded-full text-stone-400 hover:bg-stone-100 transition-colors"
              aria-label="Dismiss install suggestion"
            >
              ✕
            </button>
          </div>
          {!iosHint && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => void install()}
                disabled={busy}
                className="flex-1 rounded-2xl bg-[#0B5C46] px-4 py-2.5 text-[12.5px] font-bold text-white active:scale-95 transition-transform disabled:opacity-60"
              >
                ⬇ Install app
              </button>
              <button
                onClick={dismiss}
                className="rounded-2xl border border-stone-200 px-4 py-2.5 text-[12.5px] font-bold text-stone-500 active:scale-95 transition-transform"
              >
                Not now
              </button>
            </div>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  );
}
