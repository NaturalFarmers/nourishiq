"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserProfile } from "./types";

export const DEFAULT_PROFILE: UserProfile = {
  goal: null,
  pattern: null,
  exclusions: [],
  boosters: [],
  sex: "male",
  age: 30,
  heightCm: 170,
  weightKg: 70,
  activity: "light",
};

interface NourishState {
  passportId: string;
  profile: UserProfile;
  seenWelcome: boolean;
  setPassport: (id: string) => void;
  setProfile: (p: Partial<UserProfile>) => void;
  setSeenWelcome: () => void;
  reset: () => void;
}

function makePassportId(): string {
  const hex = () => Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, "0");
  return `NP-${hex()}${hex()}`.slice(0, 10);
}

export const useNourish = create<NourishState>()(
  persist(
    (set) => ({
      passportId: "",
      profile: DEFAULT_PROFILE,
      seenWelcome: false,
      setPassport: (id) => set({ passportId: id }),
      setProfile: (p) =>
        set((s) => ({ profile: { ...s.profile, ...p }, seenWelcome: true })),
      setSeenWelcome: () => set({ seenWelcome: true }),
      reset: () => set({ profile: DEFAULT_PROFILE, seenWelcome: false }),
    }),
    {
      name: "nourishiq-passport",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // ensure every visitor has a passport id
        if (state && !state.passportId) state.setPassport(makePassportId());
      },
    },
  ),
);

export function ensurePassport(id: string, setter: (id: string) => void) {
  if (!id) setter(makePassportId());
}
