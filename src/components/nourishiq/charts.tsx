"use client";

// ─── Pure-SVG charts (no chart lib — deterministic, tiny, brandable) ────────

import { motion } from "framer-motion";
import type { SeriesPoint, CalorieWeek, CalorieDay } from "@/lib/nourishiq/progress";
import type { StepsDay } from "@/lib/nourishiq/steps";

const EARNED_FILL = "#8FD6B7";
const EARNED_TEXT = "#0E6B4E";

export interface TrendChartProps {
  series: SeriesPoint[];
  height?: number;
  color: string;
  /** optional horizontal guide line, e.g. waist threshold */
  target?: { value: number; label: string; color?: string };
  /** optional shaded band, e.g. healthy-BMI weight band */
  band?: { min: number; max: number; label?: string };
  unit?: string;
  /** first/last value labels are drawn automatically when series ≥ 2 */
  ariaLabel?: string;
}

/**
 * Minimal trend line: dots + soft area fill + dashed guide.
 * Y-axis auto-scales with padding; x evenly spaced (categorical, date ticks
 * rendered for first & last points).
 */
export function TrendChart({
  series,
  height = 148,
  color,
  target,
  band,
  unit = "",
  ariaLabel,
}: TrendChartProps) {
  const W = 320;
  const H = height;
  const padL = 8;
  const padR = 8;
  const padT = 14;
  const padB = 18;
  const iw = W - padL - padR;
  const ih = H - padT - padB;

  if (series.length === 0) return null;

  const values = series.map((p) => p.value);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (target) { lo = Math.min(lo, target.value); hi = Math.max(hi, target.value); }
  if (band) { lo = Math.min(lo, band.min); hi = Math.max(hi, band.max); }
  const span = Math.max(hi - lo, Math.max(hi * 0.04, 1)); // ≥4% breathing room
  lo -= span * 0.12;
  hi += span * 0.12;
  const range = hi - lo;

  const x = (i: number) =>
    padL + (series.length === 1 ? iw / 2 : (i / (series.length - 1)) * iw);
  const y = (v: number) => padT + ih - ((v - lo) / range) * ih;

  const line = series.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const area = `${padL},${padT + ih} ${line} ${padL + iw},${padT + ih}`;
  const gid = `g-${color.replace(/[^a-z0-9]/gi, "")}-${Math.round(height)}`;

  const first = series[0];
  const last = series[series.length - 1];

  return (
    <figure aria-label={ariaLabel} className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* healthy band */}
        {band && (
          <g>
            <rect
              x={padL}
              y={y(band.max)}
              width={iw}
              height={Math.max(2, y(band.min) - y(band.max))}
              fill="#0E6B4E"
              opacity="0.08"
              rx="3"
            />
            {band.label && (
              <text x={padL + 2} y={y(band.max) - 3} fontSize="7.5" fontWeight="700" fill="#0E6B4E" opacity="0.75">
                {band.label}
              </text>
            )}
          </g>
        )}

        {/* target guide */}
        {target && (
          <g>
            <line
              x1={padL} x2={padL + iw} y1={y(target.value)} y2={y(target.value)}
              stroke={target.color ?? "#D96C0B"} strokeWidth="1.2" strokeDasharray="4 3" opacity="0.8"
            />
            <text
              x={padL + iw} y={y(target.value) - 3} fontSize="7.5" fontWeight="700"
              fill={target.color ?? "#D96C0B"} textAnchor="end"
            >
              {target.label}
            </text>
          </g>
        )}

        {/* area + line */}
        <motion.polygon
          points={area}
          fill={`url(#${gid})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
        <motion.polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* dots */}
        {series.map((p, i) => (
          <circle key={p.date + i} cx={x(i)} cy={y(p.value)} r={i === series.length - 1 ? 3.4 : 2.2} fill={color} />
        ))}
        {/* end-value tag */}
        <text
          x={x(series.length - 1)}
          y={y(last.value) - 7}
          fontSize="9"
          fontWeight="800"
          fill={color}
          textAnchor={series.length === 1 ? "middle" : "end"}
        >
          {last.value}{unit}
        </text>

        {/* x ticks: first & last date */}
        <text x={padL} y={H - 4} fontSize="7.5" fill="#78716C" fontWeight="600">{first.date.slice(5).replace("-", "/")}</text>
        <text x={padL + iw} y={H - 4} fontSize="7.5" fill="#78716C" fontWeight="600" textAnchor="end">{last.date.slice(5).replace("-", "/")}</text>
      </svg>
    </figure>
  );
}

// ─── Weekly adherence bars ───────────────────────────────────────────────────

export function WeekBars({
  weeks,
  height = 108,
}: {
  weeks: { start?: string; label: string; score: number; loggedCount: number }[];
  height?: number;
}) {
  const W = 320;
  const H = height;
  const padT = 16;
  const padB = 20;
  const ih = H - padT - padB;
  const bw = 34;
  const gap = (W - weeks.length * bw) / (weeks.length + 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weekly adherence bars">
      {/* 100% guide */}
      <line x1="6" x2={W - 6} y1={padT} y2={padT} stroke="#E7E5E4" strokeWidth="1" strokeDasharray="3 3" />
      <text x="6" y={padT - 4} fontSize="7.5" fill="#78716C" fontWeight="700">100%</text>
      {weeks.map((w, i) => {
        const h = Math.max(3, w.score * ih);
        const xx = gap + i * (bw + gap);
        const yy = padT + ih - h;
        const pct = Math.round(w.score * 100);
        const empty = w.loggedCount === 0;
        const col = empty ? "#E7E5E4" : w.score >= 0.75 ? "#0B5C46" : w.score >= 0.5 ? "#D9A40B" : "#DC6A33";
        return (
          <g key={w.start + w.label}>
            <motion.rect
              x={xx} y={yy} width={bw} height={h} rx="5"
              fill={col}
              initial={{ opacity: 0, y: padT + ih }}
              animate={{ opacity: 1, y: yy }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
            />
            <text x={xx + bw / 2} y={yy - 4} fontSize="8.5" fontWeight="800" fill={empty ? "#A8A29E" : "#292524"} textAnchor="middle">
              {empty ? "–" : `${pct}%`}
            </text>
            <text x={xx + bw / 2} y={H - 7} fontSize="7.5" fontWeight="700" fill="#78716C" textAnchor="middle">
              {w.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Weekly calories-vs-budget bars ──────────────────────────────────────────

function budgetColor(pct: number | null): string {
  if (pct == null) return "#E7E5E4";
  if (pct > 110) return "#DC6A33"; // over budget
  if (pct >= 90) return "#0B5C46"; // within ±10%
  return "#D9A40B"; // under budget
}

/**
 * One bar per week: average daily kcal as a % of the daily budget.
 * Dashed guide = 100% (budget). Green = within ±10%, orange = over, amber = under.
 */
export function BudgetWeekBars({
  weeks,
  budget,
  height = 118,
}: {
  weeks: CalorieWeek[];
  /** daily calorie budget (rx.kcal) — the 100% guide */
  budget: number;
  height?: number;
}) {
  const W = 320;
  const H = height;
  const padT = 15;
  const padB = 20;
  const ih = H - padT - padB;
  const bw = 34;
  const gap = (W - weeks.length * bw) / (weeks.length + 1);

  const pcts = weeks.map((w) =>
    w.avgKcal != null && w.avgKcal > 0 ? (w.avgKcal / budget) * 100 : null,
  );
  const maxPct = Math.max(100, ...(pcts.filter((v): v is number => v != null)));
  const yMax = Math.max(115, maxPct * 1.18); // headroom for labels + budget line
  const yPct = (p: number) => padT + ih - (p / yMax) * ih;
  const yBudget = yPct(100);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weekly average calories as a percentage of the daily budget">
      {/* budget guide at 100% */}
      <line x1="6" x2={W - 6} y1={yBudget} y2={yBudget} stroke="#0B5C46" strokeWidth="1.1" strokeDasharray="4 3" opacity="0.65" />
      <text x="6" y={yBudget - 4} fontSize="7.5" fill="#0E6B4E" fontWeight="700">budget</text>
      {weeks.map((w, i) => {
        const pct = pcts[i];
        const h = pct == null ? 3 : Math.max(3, (pct / yMax) * ih);
        const xx = gap + i * (bw + gap);
        const yy = padT + ih - h;
        const col = budgetColor(pct);
        return (
          <g key={w.start + w.label}>
            <motion.rect
              x={xx} y={yy} width={bw} height={h} rx="5"
              fill={col}
              initial={{ opacity: 0, y: padT + ih }}
              animate={{ opacity: 1, y: yy }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
            />
            <text
              x={xx + bw / 2} y={yy - 4} fontSize="8.5" fontWeight="800"
              fill={pct == null ? "#A8A29E" : "#292524"} textAnchor="middle"
            >
              {pct == null ? "–" : `${Math.round(pct)}%`}
            </text>
            <text x={xx + bw / 2} y={H - 7} fontSize="7.5" fontWeight="700" fill="#78716C" textAnchor="middle">
              {w.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * One bar per day of the selected week (Mon..Sun) with a dashed daily-budget
 * line. Value labels on top; today's label is emphasised.
 *
 * `earnedByDate` maps date → kcal earned from steps that day: drawn as a
 * light-green cap stacked on top of each consumed bar with a "+N" label —
 * earned calories live on the day bars themselves, not in a separate panel.
 * Unlogged days still show their earned cap (you earn even when you don't log).
 */
export function DayKcalBars({
  days,
  budget,
  today,
  earnedByDate,
  height = 128,
}: {
  days: CalorieDay[];
  budget: number;
  today?: string;
  earnedByDate?: Record<string, number>;
  height?: number;
}) {
  const W = 320;
  const H = height;
  const padT = 14;
  const padB = 20;
  const ih = H - padT - padB;
  const bw = 30;
  const gap = (W - days.length * bw) / (days.length + 1);

  const earnedOf = (d: CalorieDay) => Math.max(0, earnedByDate?.[d.date] ?? 0);
  const stacks = days.map((d) => (d.kcal ?? 0) + earnedOf(d));
  const maxStack = stacks.length ? Math.max(...stacks) : 0;
  const yMax = Math.max(budget * 1.28, maxStack * 1.15, 500);
  const yK = (v: number) => padT + ih - (v / yMax) * ih;
  const yBudget = yK(budget);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Calories eaten each day of the selected week against the daily budget, with calories earned from steps stacked on top">
      <line x1="6" x2={W - 6} y1={yBudget} y2={yBudget} stroke="#0B5C46" strokeWidth="1.1" strokeDasharray="4 3" opacity="0.65" />
      <text x="6" y={yBudget - 4} fontSize="7.5" fill="#0E6B4E" fontWeight="700">
        budget {budget.toLocaleString()}
      </text>
      {days.map((d, i) => {
        const xx = gap + i * (bw + gap);
        const earned = earnedOf(d);
        const base = d.kcal ?? 0;
        const stack = base + earned;
        const h = stack === 0 ? 3 : Math.max(3, (base / yMax) * ih);
        const hh = base === 0 ? 3 : h; // stub when nothing at all
        const yy = padT + ih - hh;
        const pct = d.kcal != null && d.kcal > 0 ? (d.kcal / budget) * 100 : null;
        const col = budgetColor(pct);
        const isToday = today != null && d.date === today;
        const earnH = earned > 0 ? Math.max(2.5, (earned / yMax) * ih) : 0;
        const barH = (base / yMax) * ih;
        return (
          <g key={d.date}>
            <motion.rect
              x={xx} y={yy} width={bw} height={hh} rx="4.5"
              fill={base === 0 && earned === 0 ? "#E7E5E4" : col}
              initial={{ opacity: 0, y: padT + ih }}
              animate={{ opacity: 1, y: yy }}
              transition={{ duration: 0.4, delay: i * 0.045 }}
            />
            {earnH > 0 && (
              <motion.rect
                x={xx} y={yK(stack)} width={bw} height={earnH} rx="2.5"
                fill={EARNED_FILL}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.18 + i * 0.045 }}
              />
            )}
            {earned > 0 && (
              <text
                x={xx + bw / 2} y={yK(stack) - 3} fontSize="7"
                fontWeight={isToday ? 800 : 700}
                fill={EARNED_TEXT}
                textAnchor="middle"
              >
                {`+${earned.toLocaleString()}`}
              </text>
            )}
            {d.kcal != null && (
              barH >= 18 && earned > 0 ? (
                <text
                  x={xx + bw / 2} y={yy + 9.5} fontSize="7.5" fontWeight={isToday ? 800 : 700}
                  fill="#FFFFFF" textAnchor="middle" opacity={isToday ? 1 : 0.92}
                >
                  {d.kcal.toLocaleString()}
                </text>
              ) : (
                <text
                  x={xx + bw / 2} y={earned > 0 ? yK(stack) - 12.5 : yy - 3.5} fontSize="7.5"
                  fontWeight={isToday ? 800 : 700}
                  fill={isToday ? "#292524" : "#57534E"}
                  textAnchor="middle"
                >
                  {d.kcal.toLocaleString()}
                </text>
              )
            )}
            <text
              x={xx + bw / 2} y={H - 7} fontSize="7.5"
              fontWeight={isToday ? 800 : 700}
              fill={isToday ? "#0E6B4E" : "#78716C"}
              textAnchor="middle"
            >
              {`${DOW[i]} ${Number(d.date.slice(8))}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Weekly steps trend ───────────────────────────────────────────────────

const fmtK = (v: number) => (v >= 1000 ? `${(Math.round(v / 100) / 10).toLocaleString()}k` : `${Math.round(v)}`);

/**
 * One week of steps (Mon..Sun) as a line + soft area fill, dashed average
 * line and optional dashed goal guide. Future days show as faded ticks only;
 * today gets the emphasised dot and its value label.
 */
export function StepsTrendChart({
  days,
  goalSteps,
  height = 148,
}: {
  days: StepsDay[]; // Mon..Sun of the selected week
  goalSteps?: number; // dashed reference, e.g. 10000
  height?: number;
}) {
  const W = 320;
  const H = height;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 18;
  const iw = W - padL - padR;
  const ih = H - padT - padB;

  const have = days
    .map((d, i) => ({ ...d, i }))
    .filter((d): d is StepsDay & { i: number; steps: number } => d.steps != null);
  if (have.length === 0) return null;

  let hi = Math.max(...have.map((d) => d.steps));
  if (goalSteps) hi = Math.max(hi, goalSteps);
  const yMax = Math.max(hi * 1.15, 1);
  const x = (i: number) =>
    padL + (days.length === 1 ? iw / 2 : (i / (days.length - 1)) * iw);
  const y = (v: number) => padT + ih - (v / yMax) * ih;

  const line = have.map((d) => `${x(d.i)},${y(d.steps)}`).join(" ");
  const area = `${x(have[0].i)},${padT + ih} ${line} ${x(have[have.length - 1].i)},${padT + ih}`;
  const gid = `steps-g-${Math.round(height)}`;

  const avg = have.reduce((a, b) => a + b.steps, 0) / have.length;
  const peak = have.reduce((a, b) => (b.steps > a.steps ? b : a), have[0]);
  const last = have[have.length - 1];

  return (
    <figure aria-label="Steps walked each day of the selected week" className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0B5C46" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0B5C46" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* average guide */}
        <line x1={padL} x2={padL + iw} y1={y(avg)} y2={y(avg)} stroke="#A8A29E" strokeWidth="1" strokeDasharray="4 3" opacity="0.75" />
        <text x={padL + 2} y={y(avg) - 3.5} fontSize="7.5" fontWeight="700" fill="#78716C">
          avg {fmtK(avg)}
        </text>

        {/* goal guide */}
        {goalSteps != null && (
          <g>
            <line x1={padL} x2={padL + iw} y1={y(goalSteps)} y2={y(goalSteps)} stroke="#D9A40B" strokeWidth="1.1" strokeDasharray="4 3" opacity="0.75" />
            <text x={padL + iw} y={y(goalSteps) - 3.5} fontSize="7.5" fontWeight="700" fill="#D9A40B" textAnchor="end">
              {fmtK(goalSteps)} goal
            </text>
          </g>
        )}

        {/* area + line (drawn only up to the latest real day) */}
        <motion.polygon
          points={area}
          fill={`url(#${gid})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
        <motion.polyline
          points={line}
          fill="none"
          stroke="#0B5C46"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* dots (today emphasised) */}
        {have.map((d) => (
          <circle
            key={d.date}
            cx={x(d.i)} cy={y(d.steps)}
            r={d.isToday ? 3.4 : 2.2}
            fill="#0B5C46"
            stroke={d.isToday ? "#FFFFFF" : "none"}
            strokeWidth={d.isToday ? 1.4 : 0}
          />
        ))}

        {/* value labels: peak + latest (today) */}
        {[peak, last].map((d, k) => {
          const ly = y(d.steps) - 6;
          return (
            <text
              key={d.date}
              x={x(d.i)}
              y={ly < 11 ? y(d.steps) + 11 : ly}
              fontSize="8"
              fontWeight="800"
              fill="#292524"
              textAnchor={k === 0 && d.i < days.length / 2 ? "start" : d.i > days.length / 2 ? "end" : "middle"}
            >
              {d.steps.toLocaleString()}
            </text>
          );
        })}

        {/* DOW ticks for all 7 days, faded for future days */}
        {days.map((d, i) => (
          <text
            key={d.date}
            x={x(i)} y={H - 5} fontSize="7.5"
            fontWeight={d.isToday ? 800 : 700}
            fill={d.isToday ? "#0E6B4E" : d.isFuture ? "#C7C2BD" : "#78716C"}
            textAnchor="middle"
          >
            {`${DOW[i]} ${Number(d.date.slice(8))}`}
          </text>
        ))}
      </svg>
    </figure>
  );
}

// ─── 7-day adherence dots ────────────────────────────────────────────────

const DOT_META: Record<string, { bg: string; title: string }> = {
  full: { bg: "bg-[#0B5C46]", title: "All 4 targets met" },
  partial: { bg: "bg-[#D9A40B]", title: "Some targets met" },
  missed: { bg: "bg-[#DC6A33]", title: "Logged but off-track" },
  empty: { bg: "bg-stone-200", title: "Nothing logged" },
};

export function DayDots({
  days,
}: {
  days: { date: string; status: string }[];
}) {
  return (
    <div className="flex items-end justify-between gap-1" aria-label="last 7 days adherence">
      {days.map((d) => {
        const meta = DOT_META[d.status] ?? DOT_META.empty;
        const [, m, day] = d.date.split("-");
        return (
          <div key={d.date} className="flex flex-col items-center gap-1 flex-1" title={meta.title}>
            <span className={`h-3.5 w-3.5 rounded-full ${meta.bg}`} aria-hidden />
            <span className="text-[8px] font-bold text-stone-400">
              {Number(day)}/{Number(m)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sparkline (report / small cards) ────────────────────────────────────────

export function Sparkline({
  series,
  color = "#0B5C46",
  width = 88,
  height = 26,
}: {
  series: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (series.length < 2) return null;
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const range = Math.max(hi - lo, 0.1);
  const pts = series
    .map((v, i) => `${(i / (series.length - 1)) * (width - 4) + 2},${height - 3 - ((v - lo) / range) * (height - 6)}`)
    .join(" ");
  return (
    <svg width={width} height={height} aria-hidden className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
