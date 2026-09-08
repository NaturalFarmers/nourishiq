// ─── NourishIQ Activity Library (MET values, Compendium of Physical Activities) ──

import type { ActivityItem } from "./types";

export const ACTIVITIES: ActivityItem[] = [
  { id: "walk_slow", name: "Walking (slow stroll)", emoji: "🚶", met: 3.0, hint: "Casual pace, ~3 km/h" },
  { id: "walk_brisk", name: "Brisk walking", emoji: "🚶‍♂️", met: 4.3, hint: "4.8–6 km/h, slightly breathy" },
  { id: "jogging", name: "Jogging", emoji: "🏃", met: 7.0, hint: "Slow-to-moderate jog" },
  { id: "running", name: "Running (8 km/h)", emoji: "🏃‍♀️", met: 8.3, hint: "Comfortable run" },
  { id: "cycling", name: "Cycling (moderate)", emoji: "🚴", met: 6.8, hint: "12–16 km/h outdoors or gym" },
  { id: "swimming", name: "Swimming (freestyle)", emoji: "🏊", met: 8.3, hint: "Moderate laps" },
  { id: "yoga", name: "Yoga (hatha flow)", emoji: "🧘", met: 3.0, hint: "Gentle session, holds & flow" },
  { id: "hiit", name: "HIIT / circuits", emoji: "🔥", met: 8.0, hint: "Intervals with rests" },
  { id: "strength", name: "Strength training", emoji: "🏋️", met: 5.0, hint: "Weights, moderate effort" },
  { id: "badminton", name: "Badminton", emoji: "🏸", met: 5.5, hint: "Social or club play" },
  { id: "cricket", name: "Cricket", emoji: "🏏", met: 5.0, hint: "Casual match play" },
  { id: "football", name: "Football", emoji: "⚽", met: 7.0, hint: "Casual to competitive" },
  { id: "dance", name: "Dancing (aerobic)", emoji: "💃", met: 6.5, hint: "Zumba / dance fitness" },
  { id: "stairs", name: "Stair climbing", emoji: "🪜", met: 8.8, hint: "Continuous, moderate pace" },
  { id: "garden", name: "Gardening", emoji: "🪴", met: 3.8, hint: "Digging, planting, weeding" },
  { id: "chores", name: "Household chores", emoji: "🧹", met: 3.3, hint: "Sweeping, mopping, laundry" },
];

/** kcal burned = MET × 3.5 × bodyKg ÷ 200 × minutes */
export function burnedKcal(met: number, weightKg: number, minutes: number): number {
  return Math.round(((met * 3.5 * weightKg) / 200) * minutes);
}
