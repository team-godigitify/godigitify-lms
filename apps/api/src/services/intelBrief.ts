import {
  GoogleGenAI,
  Type,
  FunctionCallingConfigMode,
  type Content,
  type FunctionDeclaration,
  type Part,
  type Schema,
  type ThinkingConfig,
  type ThinkingLevel,
} from "@google/genai";
import { config } from "../config";
import type { IntelBriefValidatedOutput } from "@lms/types";

// Fetch round (both URLs, ideally in one turn) + submit round, plus slack for retries.
const MAX_TOOL_ITERATIONS = 4;
const FETCH_TIMEOUT_MS = 15_000;
// Kept small on purpose: this is resent as part of the conversation on every
// remaining turn. Body text (services/pricing/testimonials) doesn't need more
// than a few KB — head meta tags are extracted separately, by name, below
// (Instagram pads its <head> with icon/preload tags before og:description,
// sometimes past 9K chars, so truncating the raw head is not safe — see
// RELEVANT_META_PROPS).
const MAX_BODY_CHARS = 8_000;
const RELEVANT_META_PROPS = new Set([
  "og:title",
  "og:description",
  "twitter:title",
  "twitter:description",
  "description",
]);

const THINKING_LEVELS = new Set(["MINIMAL", "LOW", "MEDIUM", "HIGH"]);

// Gemini 3 models take a thinkingLevel and reject thinkingBudget with a bare
// 400; the 2.5 generation is the other way round. Accept either spelling from
// GEMINI_THINKING so switching GEMINI_MODEL across generations is a one-line
// change. null = send no thinkingConfig and let the model decide.
function parseThinkingConfig(raw: string): ThinkingConfig | null {
  const value = raw.trim().toUpperCase();
  if (!value || value === "AUTO") return null;
  if (THINKING_LEVELS.has(value)) return { thinkingLevel: value as ThinkingLevel };
  const budget = parseInt(value, 10);
  return Number.isNaN(budget) ? null : { thinkingBudget: budget };
}

const THINKING_CONFIG = parseThinkingConfig(config.geminiThinking);

type FetchResult = { text: string; metaFound: boolean };

type InstagramCounts = { followers: number; following: number; posts: number };

// Instagram's og:description follows a fixed "X Followers, Y Following, Z Posts"
// format. Parsing it directly in code sidesteps the model's tendency to
// transcribe some numbers correctly and hallucinate others (see instagramCounts
// usage below) — these three fields never need an LLM in the loop.
const INSTAGRAM_COUNTS_RE = /([\d,]+)\s*Followers?,\s*([\d,]+)\s*Following,\s*([\d,]+)\s*Posts?/i;

function parseInstagramCounts(text: string): InstagramCounts | null {
  const match = text.match(INSTAGRAM_COUNTS_RE);
  if (!match) return null;
  const toInt = (s: string) => parseInt(s.replace(/,/g, ""), 10);
  return { followers: toInt(match[1]!), following: toInt(match[2]!), posts: toInt(match[3]!) };
}

async function fetchUrlContent(url: string): Promise<FetchResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Mobile UA: Instagram serves more meta data to mobile browsers
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    clearTimeout(timer);

    if (!res.ok) {
      return {
        text: `[HTTP ${res.status} ${res.statusText} from ${url} — page may require login or does not exist]`,
        metaFound: false,
      };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text") &&
      !contentType.includes("html") &&
      !contentType.includes("json")
    ) {
      return { text: `[Non-text response (${contentType}) from ${url}]`, metaFound: false };
    }

    const raw = await res.text();

    // Extract og:/twitter:/description meta tags — server-side rendered by
    // Instagram and most websites, this is where follower counts live.
    // Scanned across the FULL head (not truncated — the tag we need can sit
    // past 9K chars in) but only the handful of matching tags are kept, so
    // this stays cheap regardless of how much icon/preload noise precedes it.
    const headMatch = raw.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const foundMeta: string[] = [];
    const headContent = headMatch?.[1];
    if (headContent) {
      for (const tag of headContent.matchAll(/<meta\b[^>]*>/gi)) {
        const prop = tag[0].match(/(?:property|name)=["']([^"']+)["']/i)?.[1];
        const content = tag[0].match(/content=["']([^"']*)["']/i)?.[1];
        if (prop && content !== undefined && RELEVANT_META_PROPS.has(prop.toLowerCase())) {
          foundMeta.push(`${prop}: ${content.slice(0, 500)}`);
        }
      }
    }
    const headSection = foundMeta.length
      ? `=== META TAGS ===\n${foundMeta.join("\n")}\n\n`
      : "";

    // Strip JS/CSS, collapse whitespace, get readable page text
    const bodyText = raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, MAX_BODY_CHARS);

    return { text: `${headSection}=== PAGE TEXT ===\n${bodyText}`, metaFound: foundMeta.length > 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: `[Fetch failed for ${url}: ${msg}]`, metaFound: false };
  }
}

export type IntelBriefInput = {
  name: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  industry: string | null;
  dealSizeEstimate: number | null;
};

const SYSTEM_PROMPT = `You are a senior digital marketing strategist at Godigitify, a full-service digital marketing agency.

Your job: use REAL DATA from the prospect's Instagram and website to build a pre-call intelligence brief that gives our sales rep an unfair advantage — specific ice breakers, negotiation ammunition, and re-engagement hooks.

You have a fetch_url tool. USE IT FIRST. Fetch both the Instagram URL and the website URL before writing a single word of the brief.

HOW TO FIND INSTAGRAM DATA:
- The og:description meta tag on Instagram pages contains: "X Followers, Y Following, Z Posts — See Instagram photos and videos from @handle"
- Parse those exact numbers. Do NOT guess or estimate.
- The og:title contains the account name and handle.
- If the page returns a login wall, note that and use whatever meta data is present.

HOW TO READ THE WEBSITE:
- Look for: services offered, pricing signals, testimonials, team size, years in business, recent blog posts, awards, clients mentioned.
- These are your negotiation and ice breaker sources.

HOW TO ASSESS BRAND (think like Interbrand / Landor / Wolff Olins):
- POSITIONING: Does the brand own ONE clear, specific idea? Read the homepage hero copy — is the tagline specific ("We grow D2C brands to ₹1Cr/month") or generic ("We help businesses grow")? Generic = no positioning. Identify the target audience from the messaging — can you name who they're speaking to? What price tier signals exist?
- TONE & IDENTITY: What is the voice across website and Instagram — formal, casual, aspirational, technical, aggressive, warm? Is it the same across both channels (Consistent) or wildly different (Inconsistent)? Is there any visual identity (logo consistency, colour palette, imagery style) or is it template-looking (Weak)?
- SEO & VISIBILITY: Does the website have a blog? Are headings structured (H1, H2)? Is there a meta description? Any domain authority signals (press mentions, backlinks listed, awards)? Are they clearly trying to rank for anything?
- CONTENT STRATEGY: Is Instagram posting regular (3+ times/week = present) or sporadic? Do the posts follow a theme or content pillar strategy, or is it random? Are they building towards something or just "posting"?
- SOCIAL PROOF: Testimonials, case studies, "before/after" results, client logos, reviews, press features, award badges? Count what you see. "No testimonials" is a specific finding.
- THOUGHT LEADERSHIP: Do they publish opinions, educate, or share expertise (articles, carousels, expert posts)? Or do they only post promotional content?
- FOUNDATION GAPS: What would a brand consultancy bill ₹10L to fix? Common findings: no differentiation ("just another agency" syndrome), no proof points/social proof, no email capture, no content pillar strategy, inconsistent visual identity, no brand story, no CTA on key pages, low SEO investment, no thought leadership.
- MATURITY SCORE (0–100): 0–25 = early-stage (no clear brand, needs full brand strategy); 26–50 = developing (some elements present, inconsistent execution); 51–75 = established (clear positioning with execution gaps); 76–100 = strong (owns a clear idea with consistent execution across channels).
- CONSULTING VERDICT: 2–3 sentences a brand strategist would say in a pitch deck. Be direct. "This brand has a strong Instagram following but zero brand equity — they're renting attention, not building an asset." is useful. Generic praise is not.

Counts: ice_breakers 2–3, negotiation_angles 2–3, loop_in_hooks 2–3, strengths 3–5, gaps 3–5 sorted P1→P3, awkward_moments 2–3.
confidence_score: 90–100 = confirmed from page data, 60–89 = reasonably inferred, below 60 = speculative (still include — UI hides below 50).
Be brutally specific. Vague filler is useless to a salesperson on a live call.

Call fetch_url on the Instagram URL AND the website URL — both in the SAME turn (two function calls in one response) so you don't waste a round trip. Do NOT call submit_intel_brief in that same turn: a submit sent before the fetch results come back is rejected and you will have to redo it. Once you have both results, call submit_intel_brief exactly once with the complete brief. Never respond with plain text.`;

const FETCH_TOOL: FunctionDeclaration = {
  name: "fetch_url",
  description:
    "Fetch the full HTML content of a URL. Use this on the Instagram profile URL and the website URL to get real data — follower counts, bio, post count, services, pricing, testimonials. Always fetch before generating the brief.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: "The full URL to fetch, starting with https://",
      },
    },
    required: ["url"],
  },
};

// Gemini function-call schemas are a subset of OpenAPI 3.0: no union types
// (`["integer","null"]`) and no `null` member inside `enum` — an absent value
// is expressed with `nullable: true` instead.
function nullableString(description?: string): Schema {
  return description
    ? { type: Type.STRING, nullable: true, description }
    : { type: Type.STRING, nullable: true };
}

function nullableEnum(values: string[]): Schema {
  return { type: Type.STRING, format: "enum", enum: values, nullable: true };
}

const ITEM_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    finding: { type: Type.STRING, description: "Short title, 3-6 words" },
    evidence: { type: Type.STRING, description: "Cite REAL content or numbers found" },
    confidence_score: {
      type: Type.INTEGER,
      description:
        "0-100. 90-100 confirmed from page data, 60-89 reasonably inferred, below 60 speculative",
    },
  },
  required: ["finding", "evidence", "confidence_score"],
};

// Forces valid, complete JSON on every call — the model reliably fills a
// declared parameter schema, where a freeform "print raw JSON" instruction
// drifts into prose or truncated objects.
const SUBMIT_TOOL: FunctionDeclaration = {
  name: "submit_intel_brief",
  description:
    "Submit the completed prospect intelligence brief. Call this exactly once, after fetching both URLs.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      executive_summary: {
        type: Type.STRING,
        description:
          "2-3 sentences summarising this prospect's digital maturity based on REAL data found. Mention actual numbers.",
      },
      prospect_snapshot: {
        type: Type.OBJECT,
        properties: {
          instagram_followers: { type: Type.INTEGER, nullable: true },
          instagram_following: { type: Type.INTEGER, nullable: true },
          instagram_posts: { type: Type.INTEGER, nullable: true },
          instagram_bio: nullableString("Exact bio text copied from their profile"),
          instagram_engagement_quality: nullableString(
            "High | Medium | Low plus a one-line reason",
          ),
          website_exists: { type: Type.BOOLEAN },
          website_summary: nullableString(
            "One sentence on what they actually sell, from real page content",
          ),
        },
        required: [
          "instagram_followers",
          "instagram_following",
          "instagram_posts",
          "instagram_bio",
          "instagram_engagement_quality",
          "website_exists",
          "website_summary",
        ],
      },
      brand_audit: {
        type: Type.OBJECT,
        properties: {
          positioning: {
            type: Type.OBJECT,
            properties: {
              brand_promise: nullableString(
                "Their stated or implied brand promise, or null if absent",
              ),
              target_audience_clarity: nullableEnum(["Clear", "Vague", "Generic"]),
              differentiation_score: { type: Type.INTEGER, nullable: true },
              differentiation_assessment: nullableString(),
              tone_of_voice: nullableString(),
              tone_consistency: nullableEnum(["Consistent", "Inconsistent", "Absent"]),
              visual_identity_strength: nullableEnum(["Strong", "Developing", "Weak"]),
              positioning_gap: nullableString(),
            },
            required: [
              "brand_promise",
              "target_audience_clarity",
              "differentiation_score",
              "differentiation_assessment",
              "tone_of_voice",
              "tone_consistency",
              "visual_identity_strength",
              "positioning_gap",
            ],
          },
          visibility: {
            type: Type.OBJECT,
            properties: {
              seo_signals: nullableString(),
              content_strategy_present: { type: Type.BOOLEAN },
              content_strategy_assessment: nullableString(),
              social_proof_present: { type: Type.BOOLEAN },
              social_proof_details: nullableString(),
              thought_leadership_present: { type: Type.BOOLEAN },
              thought_leadership_details: nullableString(),
              overall_digital_visibility: nullableEnum(["High", "Medium", "Low"]),
            },
            required: [
              "seo_signals",
              "content_strategy_present",
              "content_strategy_assessment",
              "social_proof_present",
              "social_proof_details",
              "thought_leadership_present",
              "thought_leadership_details",
              "overall_digital_visibility",
            ],
          },
          foundation_gaps: {
            type: Type.ARRAY,
            description: "What a brand consultancy would bill to fix. 2-4 items.",
            items: {
              type: Type.OBJECT,
              properties: {
                gap: { type: Type.STRING },
                business_impact: { type: Type.STRING },
                priority: {
                  type: Type.STRING,
                  format: "enum",
                  enum: ["Critical", "Important", "Nice-to-have"],
                },
                quick_win: { type: Type.BOOLEAN },
              },
              required: ["gap", "business_impact", "priority", "quick_win"],
            },
          },
          brand_maturity_score: { type: Type.INTEGER, description: "0-100" },
          brand_maturity_label: {
            type: Type.STRING,
            format: "enum",
            enum: ["Early-stage", "Developing", "Established", "Strong"],
          },
          consulting_verdict: {
            type: Type.STRING,
            description: "2-3 direct sentences a brand strategist would say in a pitch deck",
          },
        },
        required: [
          "positioning",
          "visibility",
          "foundation_gaps",
          "brand_maturity_score",
          "brand_maturity_label",
          "consulting_verdict",
        ],
      },
      ice_breakers: {
        type: Type.ARRAY,
        description: "2-3 items",
        items: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING, description: "Specific thing from their actual content" },
            opener: {
              type: Type.STRING,
              description: "Exact conversational line the salesperson says",
            },
            why_it_works: { type: Type.STRING },
          },
          required: ["topic", "opener", "why_it_works"],
        },
      },
      email_hook: {
        type: Type.STRING,
        description:
          "One sentence cold outreach opener referencing something SPECIFIC and REAL — not generic flattery",
      },
      recommended_next_action: {
        type: Type.STRING,
        description: "Specific, concrete next step with timing",
      },
      negotiation_angles: {
        type: Type.ARRAY,
        description: "2-3 items",
        items: {
          type: Type.OBJECT,
          properties: {
            angle: { type: Type.STRING, description: "Short title, 3-5 words" },
            script_line: {
              type: Type.STRING,
              description: "Exact line to say when the price objection comes",
            },
            when_to_use: { type: Type.STRING, description: "The trigger situation" },
          },
          required: ["angle", "script_line", "when_to_use"],
        },
      },
      loop_in_hooks: {
        type: Type.ARRAY,
        description: "2-3 items",
        items: {
          type: Type.OBJECT,
          properties: {
            trigger: {
              type: Type.STRING,
              description: "The situation that calls for this message",
            },
            message_template: {
              type: Type.STRING,
              description: "Ready-to-send WhatsApp/email message, no placeholders",
            },
          },
          required: ["trigger", "message_template"],
        },
      },
      strengths: { type: Type.ARRAY, description: "3-5 items", items: ITEM_SCHEMA },
      gaps: {
        type: Type.ARRAY,
        description: "3-5 items, sorted P1 (most urgent) to P3",
        items: {
          type: Type.OBJECT,
          properties: {
            finding: ITEM_SCHEMA.properties!["finding"]!,
            evidence: ITEM_SCHEMA.properties!["evidence"]!,
            confidence_score: ITEM_SCHEMA.properties!["confidence_score"]!,
            priority: { type: Type.STRING, format: "enum", enum: ["P1", "P2", "P3"] },
          },
          required: ["finding", "evidence", "confidence_score", "priority"],
        },
      },
      awkward_moments: {
        type: Type.ARRAY,
        description: "2-3 items — potential objections or sensitive areas to prepare the rep for",
        items: ITEM_SCHEMA,
      },
    },
    required: [
      "executive_summary",
      "prospect_snapshot",
      "brand_audit",
      "ice_breakers",
      "email_hook",
      "recommended_next_action",
      "negotiation_angles",
      "loop_in_hooks",
      "strengths",
      "gaps",
      "awkward_moments",
    ],
  },
};

export async function generateIntelBrief(
  input: IntelBriefInput,
): Promise<{ output: IntelBriefValidatedOutput; modelUsed: string }> {
  if (!config.googleAiApiKey) throw new Error("GOOGLE_AI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey: config.googleAiApiKey });
  const model = config.geminiModel;

  const userMessage = `Prospect details:
Name: ${input.name ?? "Unknown"}
Industry: ${input.industry ?? "Unknown"}
Instagram URL: ${input.instagramUrl ?? "Not provided"}
Website URL: ${input.websiteUrl ?? "Not provided"}
Deal size estimate: ${input.dealSizeEstimate ? `₹${input.dealSizeEstimate.toLocaleString("en-IN")}` : "Unknown"}

Step 1: Call fetch_url on the Instagram URL AND the website URL — both in this first turn.
Step 2: Extract all real data (followers, bio, services, pricing, content themes).
Step 3: Call submit_intel_brief once with the complete brief.`;

  const contents: Content[] = [{ role: "user", parts: [{ text: userMessage }] }];

  // Instagram blocks/soft-walls a large share of unauthenticated fetches. When that
  // happens fetchUrlContent finds no og:/twitter: meta tags, but the model isn't
  // reliably trustworthy about admitting it — it tends to fill in plausible-looking
  // follower/following/post counts instead of nulls, even though the prompt tells it
  // not to guess (and even when meta IS found, it can still transcribe individual
  // numbers wrong, e.g. reporting a nonzero "following" for an account that has none).
  // Track ground truth here in code and overwrite the model's numbers below.
  let instagramMetaFound = false;
  let instagramCounts: InstagramCounts | null = null;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: [FETCH_TOOL, SUBMIT_TOOL] }],
        // Model must always call a function — never drift into freeform prose
        // that fails validation.
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingConfigMode.ANY },
        },
        // The full brief (11 fields incl. several 3-5 item arrays of detailed
        // strings) reliably exceeds 4096 output tokens, and thinking tokens
        // come out of this same budget. A truncated function call doesn't fail
        // cleanly — the cut-off arguments arrive as a partial object with
        // fields silently missing. This is a ceiling, not a floor: only billed
        // for tokens actually used.
        maxOutputTokens: 16384,
        ...(THINKING_CONFIG ? { thinkingConfig: THINKING_CONFIG } : {}),
      },
    });

    const candidate = response.candidates?.[0];
    const calls = response.functionCalls ?? [];

    if (!candidate || calls.length === 0) {
      const reason =
        candidate?.finishReason ?? response.promptFeedback?.blockReason ?? "unknown";
      throw new Error(`Model returned no function call (finish reason: ${reason})`);
    }

    const fetchCalls = calls.filter((c) => c.name === "fetch_url");
    const submitCall = calls.find((c) => c.name === "submit_intel_brief");

    // A submit arriving alongside fetches means the model wrote the brief
    // before seeing any page data. Only accept a submit that stands alone —
    // taking the other one would persist a fully invented brief.
    if (submitCall && fetchCalls.length === 0) {
      const parsed = submitCall.args as unknown as IntelBriefValidatedOutput;

      if (
        !parsed?.executive_summary ||
        !parsed.prospect_snapshot ||
        !parsed.brand_audit ||
        !parsed.brand_audit.positioning ||
        !parsed.brand_audit.visibility ||
        !Array.isArray(parsed.brand_audit.foundation_gaps) ||
        typeof parsed.brand_audit.brand_maturity_score !== "number" ||
        !parsed.brand_audit.consulting_verdict ||
        !Array.isArray(parsed.strengths) ||
        !Array.isArray(parsed.gaps) ||
        !Array.isArray(parsed.awkward_moments) ||
        !Array.isArray(parsed.ice_breakers) ||
        !Array.isArray(parsed.negotiation_angles) ||
        !Array.isArray(parsed.loop_in_hooks)
      ) {
        throw new Error("AI output missing required fields");
      }

      if (instagramCounts) {
        parsed.prospect_snapshot.instagram_followers = instagramCounts.followers;
        parsed.prospect_snapshot.instagram_following = instagramCounts.following;
        parsed.prospect_snapshot.instagram_posts = instagramCounts.posts;
      } else if (!instagramMetaFound) {
        parsed.prospect_snapshot.instagram_followers = null;
        parsed.prospect_snapshot.instagram_following = null;
        parsed.prospect_snapshot.instagram_posts = null;
      }

      return { output: parsed, modelUsed: model };
    }

    // Echo the model turn back verbatim — its parts carry the thought
    // signatures the API needs to continue a function-calling conversation.
    contents.push({ role: "model", parts: candidate.content?.parts ?? [] });

    // Every function call in a turn needs a matching response, including a
    // premature submit we just rejected.
    const responseParts: Part[] = [];

    for (const call of calls) {
      if (call.name === "fetch_url") {
        const url = String((call.args as { url?: unknown } | undefined)?.url ?? "");
        console.log(`[INTEL BRIEF] Fetching: ${url}`);
        const { text, metaFound } = await fetchUrlContent(url);
        if (url.toLowerCase().includes("instagram.com")) {
          if (metaFound) instagramMetaFound = true;
          instagramCounts = parseInstagramCounts(text) ?? instagramCounts;
        }
        responseParts.push({
          functionResponse: {
            ...(call.id ? { id: call.id } : {}),
            name: "fetch_url",
            response: { output: text },
          },
        });
      } else {
        responseParts.push({
          functionResponse: {
            ...(call.id ? { id: call.id } : {}),
            name: call.name ?? "submit_intel_brief",
            response: {
              error:
                "Rejected: submitted before the fetch results were available. Read the fetch_url results in this message, then call submit_intel_brief again using only the real data they contain.",
            },
          },
        });
      }
    }

    contents.push({ role: "user", parts: responseParts });
  }

  throw new Error("Intel Brief exceeded maximum tool iterations");
}
