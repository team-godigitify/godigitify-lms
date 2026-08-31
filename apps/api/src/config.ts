import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

for (const envPath of [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "src/.env"),
]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

// null = omit thinkingConfig entirely and let the model apply its own default.
function parseThinkingBudget(raw: string): number | null {
  if (raw.trim().toLowerCase() === "auto") return null;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export const config = {
  env: optionalEnv("NODE_ENV", "development"),
  port: parseInt(optionalEnv("PORT", "5000"), 10),

  // Database
  databaseUrl: requireEnv("DATABASE_URL"),

  // Redis
  redisUrl: requireEnv("REDIS_URL"),

  // JWT
  jwtSecret: requireEnv("JWT_SECRET"),
  jwtAccessExpiresIn: "15m",
  jwtRefreshExpiresIn: "7d",

  // CORS
  // Default to localhost web origin in development to support credentials
  corsOrigin: optionalEnv("CORS_ORIGIN", "http://localhost:3000"),

  // Cloudflare R2 — optional in development
  r2AccountId: optionalEnv("R2_ACCOUNT_ID", ""),
  r2AccessKeyId: optionalEnv("R2_ACCESS_KEY_ID", ""),
  r2SecretAccessKey: optionalEnv("R2_SECRET_ACCESS_KEY", ""),
  r2BucketName: optionalEnv("R2_BUCKET_NAME", "local"),
  r2PublicUrl: optionalEnv("R2_PUBLIC_URL", "http://localhost:5000/uploads"),

  // App
  apiBaseUrl: optionalEnv("API_BASE_URL", "https://api.godigitify.com"),

  // Email — set ONE of these three (priority: Resend → Brevo API → SMTP)
  resendApiKey: optionalEnv("RESEND_API_KEY", ""),
  brevoApiKey:  optionalEnv("BREVO_API_KEY", ""),
  smtp: {
    host: optionalEnv("SMTP_HOST", "smtp.gmail.com"),
    port: parseInt(optionalEnv("SMTP_PORT", "587"), 10),
    user: optionalEnv("SMTP_USER", ""),
    pass: optionalEnv("SMTP_PASS", ""),
    from: optionalEnv("SMTP_FROM", "Godigitify CRM <noreply@godigitify.com>"),
  },

  // ── Intel Brief — Google AI Studio / Gemini (Phase 5) ──
  // Each generation is its own stateless conversation — no history is carried
  // between briefs. Key comes from aistudio.google.com → Get API key.
  // GEMINI_API_KEY is accepted as an alias because that is the name Google's
  // own docs and SDK samples use.
  googleAiApiKey: optionalEnv("GOOGLE_AI_API_KEY", "") || optionalEnv("GEMINI_API_KEY", ""),
  geminiModel: optionalEnv("GEMINI_MODEL", "gemini-2.5-flash"),
  // Thinking tokens share the output budget with the function call carrying the
  // brief, so this is 0 (disabled) by default. Set to `auto` to let the model
  // decide, or a token count to allow a fixed amount.
  geminiThinkingBudget: parseThinkingBudget(
    optionalEnv("GEMINI_THINKING_BUDGET", "0"),
  ),

  // ── Intel Brief — Data Collection APIs (Phase 5) ──
  googlePlacesApiKey:    optionalEnv("GOOGLE_PLACES_API_KEY", ""),
  googlePagespeedApiKey: optionalEnv("GOOGLE_PAGESPEED_API_KEY", ""),
  // Third-party Instagram scraper — confirm vendor + budget before Phase 5
  instagramScraperUrl:   optionalEnv("INSTAGRAM_SCRAPER_URL", ""),
  instagramScraperKey:   optionalEnv("INSTAGRAM_SCRAPER_KEY", ""),
  frontendUrl: optionalEnv("FRONTEND_URL", "http://localhost:3000"),

  isProd: process.env["NODE_ENV"] === "production",
  isDev: process.env["NODE_ENV"] !== "production",

  // ── Meta (shared for Lead Forms + WhatsApp) ──
  // All optional — system degrades gracefully when not set
  meta: {
    appId:                   optionalEnv("META_APP_ID", ""),
    appSecret:               optionalEnv("META_APP_SECRET", ""),
    webhookVerifyToken:      optionalEnv("META_WEBHOOK_VERIFY_TOKEN", ""),
    pageAccessToken:         optionalEnv("META_PAGE_ACCESS_TOKEN", ""),
    pageId:                  optionalEnv("META_PAGE_ID", ""),
    whatsappPhoneNumberId:   optionalEnv("META_WHATSAPP_PHONE_NUMBER_ID", ""),
    whatsappBusinessAccountId: optionalEnv("META_WHATSAPP_BUSINESS_ACCOUNT_ID", ""),
    whatsappAutoReply:       optionalEnv("META_WHATSAPP_AUTO_REPLY", "true") === "true",
    // Comma-separated form IDs whitelist — empty = accept all forms
    allowedFormIds:          optionalEnv("META_ALLOWED_FORM_IDS", "")
                               .split(",")
                               .map((s) => s.trim())
                               .filter(Boolean),
  },
} as const;
