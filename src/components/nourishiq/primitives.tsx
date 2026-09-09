"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** Gate client-only rendering until the client has mounted (avoids SSR mismatch with zustand-persist). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-stone-200/70 ${className}`} />;
}
