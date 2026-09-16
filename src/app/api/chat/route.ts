import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const msgSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const bodySchema = z.object({
  messages: z.array(msgSchema).min(1).max(24),
  context: z.object({
    rx: z
      .object({
        goalLabel: z.string(),
        goalTagline: z.string(),
        kcal: z.number(),
        proteinG: z.number(),
        carbsG: z.number(),
        fatG: z.number(),
        fiberG: z.number(),
        waterMl: z.number(),
        sugarCapG: z.number(),
        sodiumCapMg: z.number(),
        bmi: z.number(),
        bmiCategory: z.string(),
        proteinPerKg: z.number(),
        rules: z.array(z.string()),
      })
      .nullable(),
    profile: z.object({
      sex: z.string(),
      age: z.number(),
      heightCm: z.number(),
      weightKg: z.number(),
      activity: z.string(),
      pattern: z.string().nullable(),
      exclusions: z.array(z.string()),
      boosters: z.array(z.string()),
    }),
    today: z.object({
      kcal: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      fiber: z.number(),
      waterMl: z.number(),
      entries: z.number(),
    }),
    week: z
      .object({
        adherencePct7: z.number(),
        adherencePct28: z.number(),
        loggingDays7: z.number(),
        loggingStreak: z.number(),
        onTrackStreak: z.number(),
        avgKcal7: z.number().nullable(),
        avgProtein7: z.number().nullable(),
        avgFiber7: z.number().nullable(),
        avgWaterMl7: z.number().nullable(),
      })
      .nullable(),
  }),
});

type Ctx = z.infer<typeof bodySchema>["context"];

function buildSystemPrompt(ctx: Ctx): string {
  const { rx, profile, today, week } = ctx;
  const lines: string[] = [
    "You are the NourishIQ AI nutritionist — a warm, evidence-based clinical nutritionist inside a personalised nutrition app.",
    "You give practical, culturally-aware guidance (Indian-forward food examples: dals, millets, paneer, curd, sprouts — plus global staples).",
    "",
    "── CLIENT PROFILE ──",
    `- Sex: ${profile.sex} · Age: ${profile.age} · Height: ${profile.heightCm} cm · Weight: ${profile.weightKg} kg`,
    `- Activity: ${profile.activity}`,
    `- Diet pattern: ${profile.pattern ?? "not set"}`,
    `- Exclusions: ${profile.exclusions.length ? profile.exclusions.join(", ") : "none"}`,
    `- Focus boosters: ${profile.boosters.length ? profile.boosters.join(", ") : "none"}`,
  ];

  if (rx) {
    lines.push(
      "",
      "── TODAY'S PRESCRIPTION (from their nutritionist) ──",
      `- Goal: ${rx.goalLabel} — ${rx.goalTagline}`,
      `- Energy: ${rx.kcal} kcal/day (BMI ${rx.bmi}, ${rx.bmiCategory})`,
      `- Protein ${rx.proteinG} g (${rx.proteinPerKg} g/kg) · Carbs ${rx.carbsG} g · Fat ${rx.fatG} g`,
      `- Fibre ${rx.fiberG} g · Water ${(rx.waterMl / 1000).toFixed(1)} L · Added sugar cap ${rx.sugarCapG} g · Sodium cap ${rx.sodiumCapMg} mg`,
      `- Nutritionist's rules: ${rx.rules.join(" | ")}`,
    );
  } else {
    lines.push("", "The user has NOT completed their intake assessment yet — give general evidence-based guidance and gently suggest taking the 2-minute assessment in the app to unlock personalised numbers.");
  }

  if (week) {
    lines.push(
      "",
      "── WEEKLY ADHERENCE (last 7 / 28 days) ──",
      `- Targets met on logged days: ${week.adherencePct7}% (7-day) · ${week.adherencePct28}% (28-day)`,
      `- Days logged: ${week.loggingDays7} of last 7 · log streak ${week.loggingStreak} day(s) · on-track streak ${week.onTrackStreak} day(s)`,
      `- Daily averages when logged: ${week.avgKcal7 ?? "—"} kcal · protein ${week.avgProtein7 ?? "—"} g · fibre ${week.avgFiber7 ?? "—"} g · water ${week.avgWaterMl7 != null ? (week.avgWaterMl7 / 1000).toFixed(1) : "—"} L`,
      "When asked about progress, patterns or consistency, use these numbers — praise streaks and name the weakest macro gently.",
    );
  }

  lines.push(
    "",
    "── WHAT THEY ATE TODAY ──",
    `- ${today.entries} item(s) logged: ${Math.round(today.kcal)} kcal, protein ${Math.round(today.protein)} g, carbs ${Math.round(today.carbs)} g, fat ${Math.round(today.fat)} g, fibre ${Math.round(today.fiber)} g, water ${(today.waterMl / 1000).toFixed(2)} L.`,
    rx
      ? "When helpful, compare this against the prescription and suggest ONE or TWO concrete adjustments for the rest of the day."
      : "No prescription to compare against.",
    "",
    "── HOW TO ANSWER ──",
    "- Be concise: 60–150 words unless a list or plan is genuinely needed. Use short markdown bullets or bold for key numbers.",
    "- Always respect exclusions strictly (e.g. never suggest gluten items to a gluten-free client).",
    "- Prefer food-first advice; mention supplements only when clearly useful and flag 'ask your doctor'.",
    "- If asked about medical conditions, drug interactions, pregnancy or eating disorders: give safe general info, then clearly advise consulting their doctor/dietitian.",
    "- Never invent client data you were not given. Use the numbers above, not generic ranges.",
    "- Stay encouraging and specific — end with one actionable next step when it fits naturally.",
  );

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const { messages, context } = parsed.data;

  try {
    const zai = await ZAI.create();
    const recent = messages.slice(-12);
    const completion = await zai.chat.completions.create({
      model: process.env.ZAI_CHAT_MODEL || "glm-4.5-flash",
      messages: [
        { role: "assistant", content: buildSystemPrompt(context) },
        ...recent.map((m) => ({ role: m.role, content: m.content })),
      ],
      thinking: { type: "disabled" },
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) throw new Error("Empty completion");

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[/api/chat] nutritionist request failed:", err);
    const raw = err instanceof Error ? err.message : String(err);
    let detail = raw.slice(0, 240);
    if (raw.includes("Configuration file not found")) {
      detail =
        'Missing AI config. Create .z-ai-config in the project root: {"baseUrl":"https://api.z.ai/api/paas/v4","apiKey":"<your Z.ai API key>"}';
    } else if (raw.includes("status 401") || raw.includes("status 403")) {
      detail = "API key rejected — replace the apiKey placeholder in .z-ai-config with a real Z.ai key.";
    } else if (raw.includes("status 404")) {
      detail = "AI endpoint not found (404) — check baseUrl in .z-ai-config (expected: https://api.z.ai/api/paas/v4).";
    } else if (raw.includes("fetch failed") || raw.includes("ENOTFOUND") || raw.includes("ECONNREFUSED")) {
      detail = "Network error reaching the AI endpoint — check baseUrl spelling and your internet connection.";
    }
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Your nutritionist is unreachable right now. Please try again in a moment."
            : `Nutritionist setup issue: ${detail}`,
      },
      { status: 502 },
    );
  }
}
