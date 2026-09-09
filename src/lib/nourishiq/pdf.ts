"use client";

import { jsPDF } from "jspdf";
import type { Prescription, UserProfile } from "./types";
import type { ReportData, SeriesPoint } from "./progress";

const GREEN: [number, number, number] = [11, 92, 70];
const INK: [number, number, number] = [41, 37, 36];
const MUTED: [number, number, number] = [120, 113, 108];
const LIGHT: [number, number, number] = [244, 242, 239];

/**
 * jsPDF's standard Helvetica (WinAnsi) has no "≤" glyph — it renders as a
 * broken quote glyph and corrupts letter spacing. Swap it for plain English.
 */
const clean = (s: string): string =>
  s
    .replace(/≤\s?/g, "under ")
    .replace(/≥\s?/g, "at least ")
    .replace(/≈/g, "~")
    .replace(/[“”]/g, '"');

/**
 * Builds a polished A4 prescription PDF and either shares it
 * (Web Share API where supported) or downloads it.
 */
export async function exportPrescriptionPdf(
  rx: Prescription,
  profile: UserProfile,
  passportId: string,
): Promise<"shared" | "downloaded"> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const M = 16;
  const CW = W - M * 2;

  // ── Header band ──
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text("NourishIQ", M, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Personalised Nutrition Prescription", M, 22);
  doc.setFontSize(8.5);
  doc.text(
    `Passport ${passportId || "—"}  ·  Issued ${new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`,
    W - M,
    15,
    { align: "right" },
  );
  doc.text("Evidence-based · ICMR-NIN 2024 / WHO / ADA", W - M, 22, { align: "right" });

  let y = 46;

  // ── Goal ──
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PRIMARY GOAL", M, y);
  y += 6;
  doc.setTextColor(...GREEN);
  doc.setFontSize(17);
  doc.text(rx.goalLabel.toUpperCase(), M, y);
  y += 6;
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  const tag = doc.splitTextToSize(clean(rx.goalTagline), CW);
  doc.text(tag, M, y);
  y += tag.length * 4.6 + 4;

  // ── Energy card ──
  doc.setFillColor(...LIGHT);
  doc.roundedRect(M, y, CW, 24, 3, 3, "F");
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(`${rx.kcal.toLocaleString()}`, M + 6, y + 12);
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text("kcal / day", M + 6, y + 18.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const right = [
    `BMR ${rx.bmr} kcal`,
    `Maintenance (TDEE) ${rx.tdee} kcal`,
    `BMI ${rx.bmi} — ${rx.bmiCategory}`,
    `${profile.sex === "male" ? "Male" : "Female"}, ${profile.age} y · ${profile.heightCm} cm · ${profile.weightKg} kg`,
  ];
  right.forEach((t, i) => doc.text(t, W - M - 6, y + 7 + i * 4.6, { align: "right" }));
  y += 32;

  // ── Macro table ──
  const section = (title: string) => {
    doc.setTextColor(...GREEN);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, M, y);
    y += 2;
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 6;
  };

  section("DAILY TARGETS");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("NUTRIENT", M + 2, y);
  doc.text("TARGET", M + 92, y);
  doc.text("NOTES", M + 126, y);
  y += 5.5;

  const rows: [string, string, string][] = [
    ["Protein", `${rx.proteinG} g (${rx.proteinPct}% energy)`, `${rx.proteinPerKg} g per kg body weight`],
    ["Carbohydrates", `${rx.carbsG} g (${rx.carbsPct}% energy)`, "Low-GI, whole-food first"],
    ["Fat", `${rx.fatG} g (${rx.fatPct}% energy)`, "MUFA-forward, minimal trans fat"],
    ["Fibre", `${rx.fiberG} g`, "~14 g per 1,000 kcal"],
    ["Water", `${(rx.waterMl / 1000).toFixed(1)} L`, "Sip through the day"],
    ["Added sugar", clean(`≤ ${rx.sugarCapG} g`), "WHO cap <10% energy"],
    ["Sodium", clean(`≤ ${rx.sodiumCapMg} mg`), "~1 tsp salt, all sources"],
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  rows.forEach(([a, b, c], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...LIGHT);
      doc.rect(M, y - 4, CW, 6.6, "F");
    }
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.text(a, M + 2, y);
    doc.setFont("helvetica", "normal");
    doc.text(b, M + 92, y);
    doc.setTextColor(...MUTED);
    doc.text(c, M + 126, y);
    y += 6.6;
  });
  y += 8;

  // ── Rules ──
  section("YOUR NUTRITIONIST'S NOTES");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  rx.rules.forEach((r, i) => {
    const text = doc.splitTextToSize(`${i + 1}.  ${clean(r.text)}`, CW - 4);
    if (y + text.length * 4.8 > H - 30) {
      doc.addPage();
      y = 20;
    }
    doc.setTextColor(...INK);
    doc.text(text, M, y);
    y += text.length * 4.8 + 2.5;
  });

  // ── Footer note on last page ──
  if (y > H - 36) {
    doc.addPage();
    y = 20;
  }
  y += 4;
  doc.setDrawColor(220, 216, 212);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  y += 5.5;
  doc.setTextColor(...MUTED);
  doc.setFontSize(8.2);
  const disclaimer = doc.splitTextToSize(
    "Generated by NourishIQ. Educational guidance built on ICMR-NIN 2024, WHO and ADA references — not a substitute for medical advice from your doctor or dietitian. Nutrition values are indicative averages from IFCT-2017 / USDA food tables.",
    CW,
  );
  doc.text(disclaimer, M, y);

  // ── Page footers ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`NourishIQ · ${passportId || "plan"}`, M, H - 8);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 8, { align: "right" });
  }

  // ── Share or download ──
  const fileName = `NourishIQ-Prescription-${passportId || "plan"}.pdf`;
  const blob = doc.output("blob");
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const file = new File([blob], fileName, { type: "application/pdf" });
  if (nav && "canShare" in nav && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "My NourishIQ Prescription" });
      return "shared";
    } catch {
      // user cancelled or share failed → fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}

// ─── Nutritionist progress report ────────────────────────────────────────────

type RGB = [number, number, number];
const ORANGE: RGB = [217, 108, 11];
const AMBER: RGB = [217, 164, 11];
const GREENL: RGB = [228, 246, 238]; // #E4F6EE
const TINT: RGB = [246, 245, 243];

interface TrendOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  series: SeriesPoint[];
  color: RGB;
  unit: string;
  target?: { value: number; label: string; color: RGB };
  band?: { min: number; max: number; label: string };
}

/** Draws a boxed line chart with dots, optional band & dashed target, and date ticks. */
function drawTrend(doc: jsPDF, o: TrendOpts) {
  const { x, y, w, h, series, unit } = o;
  const pad = 4;

  // frame
  doc.setFillColor(...TINT);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "F");

  if (series.length < 2) {
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.text(series.length === 0 ? "Not enough entries yet." : "One entry — add another this week.", x + w / 2, y + h / 2 + 1, { align: "center" });
    return;
  }

  const vals = series.map((p) => p.value);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (o.target) { lo = Math.min(lo, o.target.value); hi = Math.max(hi, o.target.value); }
  if (o.band) { lo = Math.min(lo, o.band.min); hi = Math.max(hi, o.band.max); }
  const span0 = Math.max(hi - lo, Math.max(hi * 0.04, 1));
  lo -= span0 * 0.12;
  hi += span0 * 0.12;
  const range = hi - lo;

  const px = (i: number) => x + pad + (i / (series.length - 1)) * (w - pad * 2);
  const py = (v: number) => y + h - pad - ((v - lo) / range) * (h - pad * 2 - 3);

  // healthy band
  if (o.band) {
    doc.setFillColor(...GREENL);
    doc.rect(x + pad, py(o.band.max), w - pad * 2, Math.max(1.5, py(o.band.min) - py(o.band.max)), "F");
    doc.setTextColor(...GREEN);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.6);
    doc.text(clean(o.band.label), x + pad + 1, py(o.band.max) - 1);
  }

  // target dashed line
  if (o.target) {
    doc.setDrawColor(...o.target.color);
    doc.setLineWidth(0.35);
    if (typeof doc.setLineDashPattern === "function") doc.setLineDashPattern([1.4, 1.1], 0);
    doc.line(x + pad, py(o.target.value), x + w - pad, py(o.target.value));
    if (typeof doc.setLineDashPattern === "function") doc.setLineDashPattern([], 0);
    doc.setTextColor(...o.target.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.6);
    doc.text(clean(o.target.label), x + w - pad, py(o.target.value) - 1, { align: "right" });
  }

  // polyline segments
  doc.setDrawColor(...o.color);
  doc.setLineWidth(0.7);
  for (let i = 1; i < series.length; i++) {
    doc.line(px(i - 1), py(series[i - 1].value), px(i), py(series[i].value));
  }
  // dots
  doc.setFillColor(...o.color);
  series.forEach((p, i) => {
    doc.circle(px(i), py(p.value), i === series.length - 1 ? 0.9 : 0.6, "F");
  });

  // labels
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.6);
  doc.text(series[0].date.slice(5).replace("-", "/"), x + pad, y + h - 1);
  doc.text(series[series.length - 1].date.slice(5).replace("-", "/"), x + w - pad, y + h - 1, { align: "right" });
  doc.setTextColor(...o.color);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(
    `${series[series.length - 1].value}${unit}`,
    px(series.length - 1),
    py(series[series.length - 1].value) - 2.2,
    { align: "right" },
  );
}

function statChip(doc: jsPDF, x: number, y: number, w: number, big: string, small: string, ink: RGB) {
  doc.setFillColor(...TINT);
  doc.roundedRect(x, y, w, 13, 2, 2, "F");
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(big, x + w / 2, y + 5.6, { align: "center" });
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  doc.text(clean(small), x + w / 2, y + 10.2, { align: "center" });
}

/**
 * Builds the branded A4 nutritionist progress report PDF and
 * shares or downloads it.
 */
export async function exportReportPdf(r: ReportData): Promise<"shared" | "downloaded"> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const M = 16;
  const CW = W - M * 2;

  // ── Header band ──
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text("NourishIQ", M, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Nutritionist Progress Report", M, 22);
  doc.setFontSize(8.5);
  doc.text(
    `Passport ${r.passportId || "—"}  ·  Generated ${r.generatedAt}`,
    W - M, 15, { align: "right" },
  );
  doc.text("Educational guidance · ICMR-NIN 2024 / WHO / ADA", W - M, 22, { align: "right" });

  let y = 44;

  const section = (title: string) => {
    if (y > H - 42) { doc.addPage(); y = 20; }
    doc.setTextColor(...GREEN);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, M, y);
    y += 2;
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 6;
  };

  // ── Patient snapshot ──
  section("PATIENT SNAPSHOT");
  const goal = r.rx.goalLabel;
  const snapLeft = [
    `${r.profile.sex === "male" ? "Male" : "Female"}, ${r.profile.age} years`,
    `${r.profile.heightCm} cm · ${r.profile.weightKg} kg (intake)`,
    `Primary goal: ${goal}`,
  ];
  const snapRight = [
    `BMI ${r.rx.bmi} — ${r.rx.bmiCategory}`,
    `BMR ${r.rx.bmr} kcal · TDEE ${r.rx.tdee} kcal`,
    `Prescription: ${r.rx.kcal.toLocaleString()} kcal / day`,
  ];
  doc.setFontSize(9.5);
  snapLeft.forEach((t, i) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(clean(t), M + 2, y + i * 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(clean(snapRight[i]), W - M - 2, y + i * 5, { align: "right" });
  });
  y += snapLeft.length * 5 + 4;

  // ── Prescription targets ──
  section("DAILY PRESCRIPTION");
  const rxRows: [string, string][] = [
    ["Protein", `${r.rx.proteinG} g (${r.rx.proteinPct}% energy)`],
    ["Carbohydrates", `${r.rx.carbsG} g (${r.rx.carbsPct}% energy)`],
    ["Fat", `${r.rx.fatG} g (${r.rx.fatPct}% energy)`],
    ["Fibre", `${r.rx.fiberG} g`],
    ["Water", `${(r.rx.waterMl / 1000).toFixed(1)} L`],
    ["Added sugar", clean(`under ${r.rx.sugarCapG} g`)],
    ["Sodium", clean(`under ${r.rx.sodiumCapMg} mg`)],
  ];
  rxRows.forEach(([a, b], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...LIGHT);
      doc.rect(M, y - 4, CW, 6.2, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(a, M + 2, y);
    doc.setFont("helvetica", "normal");
    doc.text(b, M + 92, y);
    y += 6.2;
  });
  y += 6;

  // ── Adherence ──
  section("ADHERENCE — TARGETS MET ON LOGGED DAYS");
  const chipW = (CW - 9) / 4;
  statChip(doc, M, y, chipW, `${r.adherence.adherencePct7}%`, "last 7 days", GREEN);
  statChip(doc, M + chipW + 3, y, chipW, `${r.adherence.adherencePct28}%`, "last 28 days", GREEN);
  statChip(doc, M + (chipW + 3) * 2, y, chipW, `${r.adherence.loggingStreak} d`, "log streak", AMBER);
  statChip(doc, M + (chipW + 3) * 3, y, chipW, `${r.adherence.onTrackStreak} d`, "on-track streak", AMBER);
  y += 19;

  // 7-day dot strip
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.text("LAST 7 DAYS", M + 1, y);
  y += 3;
  const dotR = 1.9;
  r.adherence.days7.forEach((d, i) => {
    const cx = M + 4 + i * ((CW - 8) / 7) + (CW - 8) / 14;
    const col: RGB =
      d.status === "full" ? GREEN : d.status === "partial" ? AMBER : d.status === "missed" ? ORANGE : [225, 222, 219];
    doc.setFillColor(...col);
    doc.circle(cx, y + dotR, dotR, "F");
    doc.setTextColor(...MUTED);
    doc.setFontSize(6.2);
    doc.setFont("helvetica", "normal");
    const [, mm, dd] = d.date.split("-");
    doc.text(`${Number(dd)}/${Number(mm)}`, cx, y + dotR + 5.4, { align: "center" });
  });
  y += 11;
  doc.setFontSize(7.2);
  doc.setTextColor(...MUTED);
  doc.text("green = all 4 targets · amber = some · orange = off-track · grey = nothing logged", M + 1, y);
  y += 7;

  // weekly bars
  const barsW = CW;
  const bw = barsW / r.adherence.weeks.length;
  const maxBarH = 22;
  doc.setFontSize(7.6);
  r.adherence.weeks.forEach((wk, i) => {
    const bx = M + i * bw + bw * 0.18;
    const bwid = bw * 0.64;
    const bh = wk.loggedCount === 0 ? 1.2 : Math.max(1.5, wk.score * maxBarH);
    const by = y + maxBarH - bh;
    const col: RGB = wk.loggedCount === 0 ? [225, 222, 219] : wk.score >= 0.75 ? GREEN : wk.score >= 0.5 ? AMBER : ORANGE;
    doc.setFillColor(...col);
    doc.roundedRect(bx, by, bwid, bh, 1.2, 1.2, "F");
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.4);
    doc.text(
      wk.loggedCount === 0 ? "–" : `${Math.round(wk.score * 100)}%`,
      bx + bwid / 2, by - 1.4, { align: "center" },
    );
    doc.setFontSize(6.4);
    doc.setFont("helvetica", "normal");
    doc.text(clean(wk.label), bx + bwid / 2, y + maxBarH + 3.4, { align: "center" });
  });
  y += maxBarH + 9;

  // averages
  const avg = r.adherence;
  const avgLine =
    `Averages on logged days (last 7): ${avg.avgKcal7 ?? "—"} kcal · protein ${avg.avgProtein7 ?? "—"} g of ${r.rx.proteinG} g · ` +
    `fibre ${avg.avgFiber7 ?? "—"} g of ${r.rx.fiberG} g · water ${avg.avgWater7 != null ? (avg.avgWater7 / 1000).toFixed(1) : "—"} L of ${(r.rx.waterMl / 1000).toFixed(1)} L`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(...INK);
  const avgLines = doc.splitTextToSize(clean(avgLine), CW);
  doc.text(avgLines, M, y);
  y += avgLines.length * 4.4 + 4;

  // ── Weight & waist trends ──
  section("BODY MEASUREMENTS");
  const chartH = 42;
  drawTrend(doc, {
    x: M, y, w: CW, h: chartH,
    series: r.weight.series,
    color: GREEN,
    unit: " kg",
    band: { min: r.weight.targetMin, max: r.weight.targetMax, label: `Healthy ${r.weight.targetMin}-${r.weight.targetMax} kg` },
  });
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.text(
    `WEIGHT — now ${r.weight.current} kg` +
      (r.weight.deltaKg !== null ? ` (${r.weight.deltaKg > 0 ? "+" : ""}${r.weight.deltaKg} kg since first entry)` : ""),
    M, y + chartH + 4.6,
  );
  y += chartH + 9;

  if (y + chartH + 14 > H - 30) { doc.addPage(); y = 20; }
  drawTrend(doc, {
    x: M, y, w: CW, h: chartH,
    series: r.waist.series,
    color: ORANGE,
    unit: " cm",
    target: { value: r.waist.target, label: `${r.waist.target} cm goal`, color: ORANGE },
  });
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.text(
    `WAIST — ` + (r.waist.current != null ? `now ${r.waist.current} cm` : "not logged yet") +
      (r.waist.deltaCm !== null ? ` (${r.waist.deltaCm > 0 ? "+" : ""}${r.waist.deltaCm} cm since first entry)` : ""),
    M, y + chartH + 4.6,
  );
  y += chartH + 10;

  // ── Top foods ──
  if (r.topFoods.length > 0) {
    section("MOST-LOGGED FOODS — LAST 28 DAYS");
    r.topFoods.forEach((f, i) => {
      if (y > H - 24) { doc.addPage(); y = 20; }
      if (i % 2 === 0) {
        doc.setFillColor(...LIGHT);
        doc.rect(M, y - 4, CW, 6, "F");
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(clean(`${i + 1}. ${f.name}`), M + 2, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(`x${f.count}`, M + 118, y);
      doc.setTextColor(...INK);
      doc.text(`${f.kcal.toLocaleString()} kcal`, W - M - 2, y, { align: "right" });
      y += 6;
    });
    y += 2;
  }

  // ── Footer note ──
  if (y > H - 36) { doc.addPage(); y = 20; }
  y += 3;
  doc.setDrawColor(220, 216, 212);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  y += 5.5;
  doc.setTextColor(...MUTED);
  doc.setFontSize(8.2);
  const disclaimer = doc.splitTextToSize(
    "Generated by NourishIQ from the user's own diary and measurement entries. Adherence = share of the four daily targets met (calories within ±10%, protein at least 85%, fibre at least 70%, water at least 75%). Educational guidance built on ICMR-NIN 2024, WHO and ADA references — not a substitute for medical advice from your doctor or dietitian.",
    CW,
  );
  doc.text(disclaimer, M, y);

  // ── Page footers ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`NourishIQ progress report · ${r.passportId || "plan"}`, M, H - 8);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 8, { align: "right" });
  }

  // ── Share or download ──
  const fileName = `NourishIQ-Report-${r.passportId || "plan"}-${new Date().toISOString().slice(0, 10)}.pdf`;
  const blob = doc.output("blob");
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const file = new File([blob], fileName, { type: "application/pdf" });
  if (nav && "canShare" in nav && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "My NourishIQ Progress Report" });
      return "shared";
    } catch {
      // cancelled → fall through
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
