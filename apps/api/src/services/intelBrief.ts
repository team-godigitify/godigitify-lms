import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";
import type { IntelBriefValidatedOutput } from "@lms/types";

const MODEL = "claude-haiku-4-5-20251001"; // fast + cheap for structured extraction

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!config.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return client;
}

export type IntelBriefInput = {
  name: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  industry: string | null;
  dealSizeEstimate: number | null;
};

const SYSTEM_PROMPT = `You are a senior digital marketing strategist at Godigitify.
Your job is to analyse a prospect's digital presence and produce a pre-call intelligence brief.

You will receive basic prospect details and must return a JSON object with EXACTLY this shape — no extra keys, no markdown:

{
  "executive_summary": "2–3 sentence overview of this prospect's digital maturity",
  "email_hook": "One compelling opening sentence for a cold outreach email",
  "recommended_next_action": "Specific next step the salesperson should take",
  "strengths": [
    { "finding": "short title (3–6 words)", "evidence": "1–2 sentences of supporting evidence", "confidence_score": 85 }
  ],
  "gaps": [
    { "finding": "short title (3–6 words)", "evidence": "1–2 sentences explaining the gap", "confidence_score": 80, "priority": "P1" }
  ],
  "awkward_moments": [
    { "finding": "short title (3–6 words)", "evidence": "1–2 sentences preparing the salesperson", "confidence_score": 75 }
  ]
}

Rules:
- strengths: 3–5 items. Things the business already does well digitally. confidence_score 0–100.
- gaps: 3–5 items sorted P1 (most urgent) → P2 → P3. Clear service opportunities for Godigitify.
- awkward_moments: 3–5 items. Potential objections or sensitive points to handle carefully.
- Be specific. No vague filler.
- Do NOT wrap in markdown or code blocks — return raw JSON only.
- If any field is null/unknown, make reasonable inferences from the industry.`;

export async function generateIntelBrief(
  input: IntelBriefInput,
): Promise<{ output: IntelBriefValidatedOutput; modelUsed: string }> {
  const userMessage = `Prospect details:
Name: ${input.name ?? "Unknown"}
Industry: ${input.industry ?? "Unknown"}
Instagram: ${input.instagramUrl ?? "Not provided"}
Website: ${input.websiteUrl ?? "Not provided"}
Deal size estimate: ${input.dealSizeEstimate ? `₹${input.dealSizeEstimate.toLocaleString("en-IN")}` : "Unknown"}

Generate the pre-call intelligence brief.`;

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // Strip markdown code fences Claude sometimes adds despite instructions
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  const parsed = JSON.parse(text) as IntelBriefValidatedOutput;

  // Structural validation before storing
  if (
    !Array.isArray(parsed.strengths) ||
    !Array.isArray(parsed.gaps) ||
    !Array.isArray(parsed.awkward_moments) ||
    typeof parsed.executive_summary !== "string"
  ) {
    throw new Error("AI output missing required fields");
  }

  return { output: parsed, modelUsed: MODEL };
}
