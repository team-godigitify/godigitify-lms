import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";
import type { IntelBriefValidatedOutput } from "@lms/types";

const MODEL = "claude-sonnet-4-6";
const MAX_TOOL_ITERATIONS = 8;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_CONTENT_CHARS = 40_000;

async function fetchUrlContent(url: string): Promise<string> {
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
      return `[HTTP ${res.status} ${res.statusText} from ${url} — page may require login or does not exist]`;
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text") &&
      !contentType.includes("html") &&
      !contentType.includes("json")
    ) {
      return `[Non-text response (${contentType}) from ${url}]`;
    }

    const raw = await res.text();

    // Extract <head> — this contains og: / twitter: meta tags which are
    // server-side rendered by Instagram and most websites (follower counts live here)
    const headMatch = raw.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const headSection = headMatch
      ? `=== HEAD / META TAGS ===\n${headMatch[0].slice(0, 8_000)}\n\n`
      : "";

    // Strip JS/CSS, collapse whitespace, get readable page text
    const bodyText = raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, MAX_CONTENT_CHARS - headSection.length);

    return `${headSection}=== PAGE TEXT ===\n${bodyText}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `[Fetch failed for ${url}: ${msg}]`;
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

Return ONLY a raw JSON object with this exact shape — no markdown, no code fences, no extra keys:

{
  "executive_summary": "2–3 sentences summarising this prospect's digital maturity based on REAL data found. Mention actual numbers.",
  "prospect_snapshot": {
    "instagram_followers": 21000,
    "instagram_following": 450,
    "instagram_posts": 312,
    "instagram_bio": "Exact bio text copied from their profile",
    "instagram_engagement_quality": "High | Medium | Low — your honest assessment with a one-line reason",
    "website_exists": true,
    "website_summary": "One sentence on what they actually sell, from real page content"
  },
  "brand_audit": {
    "positioning": {
      "brand_promise": "Their stated or implied brand promise, copied or closely paraphrased from real content — or null if absent",
      "target_audience_clarity": "Clear",
      "differentiation_score": 35,
      "differentiation_assessment": "They claim 'results-driven digital marketing' — same claim made by every agency on the first page of Google. No owned idea.",
      "tone_of_voice": "Casual-aspirational on Instagram, formal-corporate on website — jarring disconnect",
      "tone_consistency": "Inconsistent",
      "visual_identity_strength": "Developing",
      "positioning_gap": "No single ownable idea. Anyone could be their customer, which means no one feels spoken to."
    },
    "visibility": {
      "seo_signals": "Website has no blog, thin meta descriptions, no structured content — effectively invisible to organic search",
      "content_strategy_present": false,
      "content_strategy_assessment": "Posting 2x/week but no content pillar strategy — promotional posts mixed with random lifestyle content. Building no category authority.",
      "social_proof_present": false,
      "social_proof_details": null,
      "thought_leadership_present": false,
      "thought_leadership_details": null,
      "overall_digital_visibility": "Low"
    },
    "foundation_gaps": [
      {
        "gap": "No differentiation — generic positioning",
        "business_impact": "Price becomes the only decision lever. Prospects compare them to cheaper alternatives because they see no unique reason to pay more.",
        "priority": "Critical",
        "quick_win": false
      },
      {
        "gap": "Zero social proof on website",
        "business_impact": "Trust deficit at the bottom of the funnel — prospects who visit the site before a call have no reason to believe the claims.",
        "priority": "Critical",
        "quick_win": true
      }
    ],
    "brand_maturity_score": 32,
    "brand_maturity_label": "Developing",
    "consulting_verdict": "This brand has an Instagram following but no brand equity — they're renting attention, not building an asset. The core problem is that they stand for 'digital marketing', which every 21-year-old freelancer also claims. Until they own a specific idea for a specific audience, growth will remain follower-count-dependent and price-sensitive."
  },
  "ice_breakers": [
    {
      "topic": "Specific thing from their actual content — e.g. 'Their 15-second reel on Diwali discounts'",
      "opener": "Exact conversational line the salesperson says: 'Hey, I noticed your Diwali reel got really strong engagement — did that drive actual footfall?'",
      "why_it_works": "Shows you did homework. Prospects open up when they feel seen, not sold to."
    }
  ],
  "email_hook": "One sentence cold outreach opener that references something SPECIFIC and REAL from their profile — not generic flattery.",
  "recommended_next_action": "Specific, concrete next step with timing. E.g.: 'Send voice note on WhatsApp within 2 hours referencing their latest post, then follow up by EOD.'",
  "negotiation_angles": [
    {
      "angle": "Short title (3–5 words)",
      "script_line": "Exact line to say when the price objection comes: 'You're currently spending ₹X on ads but your profile shows no CTA — we can fix the leaky funnel before increasing spend.'",
      "when_to_use": "The trigger: e.g. 'They say the budget is tight but they're clearly running paid ads.'"
    }
  ],
  "loop_in_hooks": [
    {
      "trigger": "The situation — e.g. 'They opened the proposal but went silent for 3 days'",
      "message_template": "Ready-to-send WhatsApp/email message personalised with their name and details. No placeholders — use what you found."
    }
  ],
  "strengths": [
    { "finding": "Short title 3–6 words", "evidence": "Cite REAL content or numbers you found", "confidence_score": 85 }
  ],
  "gaps": [
    { "finding": "Short title 3–6 words", "evidence": "Specific gap observed — cite what is missing or weak", "confidence_score": 80, "priority": "P1" }
  ],
  "awkward_moments": [
    { "finding": "Short title 3–6 words", "evidence": "Potential objection or sensitive area — prepare the rep", "confidence_score": 75 }
  ]
}

Counts: ice_breakers 2–3, negotiation_angles 2–3, loop_in_hooks 2–3, strengths 3–5, gaps 3–5 sorted P1→P3, awkward_moments 2–3.
confidence_score: 90–100 = confirmed from page data, 60–89 = reasonably inferred, below 60 = speculative (still include — UI hides below 50).
Be brutally specific. Vague filler is useless to a salesperson on a live call.`;

const FETCH_TOOL: Anthropic.Tool = {
  name: "fetch_url",
  description:
    "Fetch the full HTML content of a URL. Use this on the Instagram profile URL and the website URL to get real data — follower counts, bio, post count, services, pricing, testimonials. Always fetch before generating the brief.",
  input_schema: {
    type: "object" as const,
    properties: {
      url: {
        type: "string",
        description: "The full URL to fetch, starting with https://",
      },
    },
    required: ["url"],
  },
};

export async function generateIntelBrief(
  input: IntelBriefInput,
): Promise<{ output: IntelBriefValidatedOutput; modelUsed: string }> {
  if (!config.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

  const userMessage = `Prospect details:
Name: ${input.name ?? "Unknown"}
Industry: ${input.industry ?? "Unknown"}
Instagram URL: ${input.instagramUrl ?? "Not provided"}
Website URL: ${input.websiteUrl ?? "Not provided"}
Deal size estimate: ${input.dealSizeEstimate ? `₹${input.dealSizeEstimate.toLocaleString("en-IN")}` : "Unknown"}

Step 1: Use fetch_url on the Instagram URL, then on the website URL.
Step 2: Extract all real data (followers, bio, services, pricing, content themes).
Step 3: Generate the full intelligence brief as raw JSON.`;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [FETCH_TOOL],
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const raw = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const parsed = JSON.parse(raw) as IntelBriefValidatedOutput;

      if (
        !parsed.executive_summary ||
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

      return { output: parsed, modelUsed: MODEL };
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        if (block.name === "fetch_url") {
          const { url } = block.input as { url: string };
          console.log(`[INTEL BRIEF] Fetching: ${url}`);
          const content = await fetchUrlContent(url);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    throw new Error(`Unexpected stop_reason: ${response.stop_reason}`);
  }

  throw new Error("Intel Brief exceeded maximum tool iterations");
}
