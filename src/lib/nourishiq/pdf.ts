"use client";

import { jsPDF } from "jspdf";
import type { Prescription, UserProfile } from "./types";

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
