import { z } from "zod";

// ── Indian phone number ──
// 10 digits, starts with 6, 7, 8, or 9
export const indianPhone = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, {
    message: "Enter a valid 10-digit Indian mobile number",
  });

// ── Throwaway email domain blocklist ──
const THROWAWAY_DOMAINS = new Set([
  "yopmail.com",
  "tempmail.com",
  "guerrillamail.com",
  "mailinator.com",
  "10minutemail.com",
  "throwaway.email",
  "sharklasers.com",
  "guerrillamail.info",
  "grr.la",
  "spam4.me",
  "trashmail.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "discard.email",
  "spamgourmet.com",
  "mailnull.com",
  "mytrashmail.com",
  "tempinbox.com",
  "throwam.com",
  "getnada.com",
]);

export const validEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "Enter a valid email address" })
  .refine(
    (email) => {
      const domain = email.split("@")[1]?.toLowerCase();
      return domain ? !THROWAWAY_DOMAINS.has(domain) : true;
    },
    { message: "Please use a permanent email address" },
  );

// ── Optional email — valid if provided, absent if not ──
export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "Enter a valid email address" })
  .refine(
    (email) => {
      const domain = email.split("@")[1]?.toLowerCase();
      return domain ? !THROWAWAY_DOMAINS.has(domain) : true;
    },
    { message: "Please use a permanent email address" },
  )
  .optional();

// ── Password ──
// 8+ chars, uppercase, lowercase, number, special character
export const strongPassword = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .regex(/[A-Z]/, {
    message: "Password must contain at least one uppercase letter",
  })
  .regex(/[a-z]/, {
    message: "Password must contain at least one lowercase letter",
  })
  .regex(/[0-9]/, { message: "Password must contain at least one number" })
  .regex(/[^A-Za-z0-9]/, {
    message: "Password must contain at least one special character",
  });

// ── Upload URL validator ──
// Validates it's a real URL from our storage (local dev or R2)
export const uploadUrl = z
  .string()
  .url({ message: "Invalid file URL" })
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        const allowedHosts = [
          "localhost",
          "127.0.0.1",
          // R2 public URL domain — add when R2 is configured
          // 'pub-xxxx.r2.dev',
        ];
        const isAllowed =
          allowedHosts.some((h) => parsed.hostname.includes(h)) ||
          parsed.hostname.includes("r2.dev") ||
          parsed.hostname.includes("godigitify.com");
        return isAllowed;
      } catch {
        return false;
      }
    },
    { message: "File URL must come from an authorised upload endpoint" },
  );

// ── Optional upload URL ──
export const optionalUploadUrl = uploadUrl.optional();

// ── Pagination ──
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.enum(["20", "50", "80"]).default("20").transform(Number),
});

// ── Date string → Date ──
export const dateString = z
  .string()
  .datetime({ message: "Invalid date format. Use ISO 8601" })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"));
