"use client";

// ─── Pure-SVG charts (no chart lib — deterministic, tiny, brandable) ────────

import { motion } from "framer-motion";
import type { SeriesPoint } from "@/lib/nourishiq/progress";

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

// ─── 7-day adherence dots ────────────────────────────────────────────────────

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
