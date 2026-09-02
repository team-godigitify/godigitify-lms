// ─────────────────────────────────────────
// Dial codes for the lead phone field
// ─────────────────────────────────────────
// Leads are stored as a dial code plus the national significant number (the
// digits a local would dial, without the trunk "0"). The dial code is persisted
// on the lead rather than looked up, so tel:/wa.me links keep working even if a
// country is later dropped from this table.
//
// min/max are national-significant-number lengths. Only India carries a
// stricter `pattern` — it is the default market and the rule (mobiles start
// 6-9) is stable; elsewhere a length range avoids rejecting valid numbers on a
// rule we cannot keep current.

export type Country = {
  iso2: string;
  name: string;
  dial: string;
  min: number;
  max: number;
  pattern?: RegExp;
  example: string;
  /** Owner of a dial code shared by several countries (+1 goes to US, not CA). */
  primary?: boolean;
};

export const COUNTRIES: readonly Country[] = [
  // Default market first so it heads the picker.
  { iso2: "IN", name: "India", dial: "+91", min: 10, max: 10, pattern: /^[6-9]\d{9}$/, example: "9876543210", primary: true },

  { iso2: "AE", name: "United Arab Emirates", dial: "+971", min: 9, max: 9, example: "501234567", primary: true },
  { iso2: "SA", name: "Saudi Arabia", dial: "+966", min: 9, max: 9, example: "501234567", primary: true },
  { iso2: "QA", name: "Qatar", dial: "+974", min: 8, max: 8, example: "33123456", primary: true },
  { iso2: "KW", name: "Kuwait", dial: "+965", min: 8, max: 8, example: "51234567", primary: true },
  { iso2: "BH", name: "Bahrain", dial: "+973", min: 8, max: 8, example: "36001234", primary: true },
  { iso2: "OM", name: "Oman", dial: "+968", min: 8, max: 8, example: "92123456", primary: true },

  { iso2: "US", name: "United States", dial: "+1", min: 10, max: 10, example: "2015550123", primary: true },
  { iso2: "CA", name: "Canada", dial: "+1", min: 10, max: 10, example: "4165550123" },
  { iso2: "GB", name: "United Kingdom", dial: "+44", min: 10, max: 10, example: "7400123456", primary: true },
  { iso2: "IE", name: "Ireland", dial: "+353", min: 9, max: 9, example: "851234567", primary: true },
  { iso2: "AU", name: "Australia", dial: "+61", min: 9, max: 9, example: "412345678", primary: true },
  { iso2: "NZ", name: "New Zealand", dial: "+64", min: 8, max: 10, example: "211234567", primary: true },

  { iso2: "SG", name: "Singapore", dial: "+65", min: 8, max: 8, example: "81234567", primary: true },
  { iso2: "MY", name: "Malaysia", dial: "+60", min: 9, max: 10, example: "123456789", primary: true },
  { iso2: "ID", name: "Indonesia", dial: "+62", min: 9, max: 12, example: "81234567890", primary: true },
  { iso2: "TH", name: "Thailand", dial: "+66", min: 9, max: 9, example: "812345678", primary: true },
  { iso2: "PH", name: "Philippines", dial: "+63", min: 10, max: 10, example: "9171234567", primary: true },
  { iso2: "VN", name: "Vietnam", dial: "+84", min: 9, max: 9, example: "912345678", primary: true },
  { iso2: "CN", name: "China", dial: "+86", min: 11, max: 11, example: "13123456789", primary: true },
  { iso2: "HK", name: "Hong Kong", dial: "+852", min: 8, max: 8, example: "51234567", primary: true },
  { iso2: "JP", name: "Japan", dial: "+81", min: 10, max: 10, example: "9012345678", primary: true },
  { iso2: "KR", name: "South Korea", dial: "+82", min: 9, max: 10, example: "1012345678", primary: true },

  { iso2: "PK", name: "Pakistan", dial: "+92", min: 10, max: 10, example: "3012345678", primary: true },
  { iso2: "BD", name: "Bangladesh", dial: "+880", min: 10, max: 10, example: "1712345678", primary: true },
  { iso2: "LK", name: "Sri Lanka", dial: "+94", min: 9, max: 9, example: "712345678", primary: true },
  { iso2: "NP", name: "Nepal", dial: "+977", min: 10, max: 10, example: "9812345678", primary: true },
  { iso2: "BT", name: "Bhutan", dial: "+975", min: 8, max: 8, example: "17123456", primary: true },
  { iso2: "MV", name: "Maldives", dial: "+960", min: 7, max: 7, example: "7712345", primary: true },

  { iso2: "DE", name: "Germany", dial: "+49", min: 10, max: 11, example: "15123456789", primary: true },
  { iso2: "FR", name: "France", dial: "+33", min: 9, max: 9, example: "612345678", primary: true },
  { iso2: "IT", name: "Italy", dial: "+39", min: 9, max: 10, example: "3123456789", primary: true },
  { iso2: "ES", name: "Spain", dial: "+34", min: 9, max: 9, example: "612345678", primary: true },
  { iso2: "PT", name: "Portugal", dial: "+351", min: 9, max: 9, example: "912345678", primary: true },
  { iso2: "NL", name: "Netherlands", dial: "+31", min: 9, max: 9, example: "612345678", primary: true },
  { iso2: "BE", name: "Belgium", dial: "+32", min: 8, max: 9, example: "470123456", primary: true },
  { iso2: "CH", name: "Switzerland", dial: "+41", min: 9, max: 9, example: "781234567", primary: true },
  { iso2: "AT", name: "Austria", dial: "+43", min: 10, max: 13, example: "6641234567", primary: true },
  { iso2: "SE", name: "Sweden", dial: "+46", min: 9, max: 9, example: "701234567", primary: true },
  { iso2: "NO", name: "Norway", dial: "+47", min: 8, max: 8, example: "40612345", primary: true },
  { iso2: "DK", name: "Denmark", dial: "+45", min: 8, max: 8, example: "20123456", primary: true },
  { iso2: "FI", name: "Finland", dial: "+358", min: 9, max: 10, example: "412345678", primary: true },
  { iso2: "PL", name: "Poland", dial: "+48", min: 9, max: 9, example: "512345678", primary: true },
  { iso2: "RU", name: "Russia", dial: "+7", min: 10, max: 10, example: "9123456789", primary: true },
  { iso2: "TR", name: "Turkey", dial: "+90", min: 10, max: 10, example: "5321234567", primary: true },
  { iso2: "IL", name: "Israel", dial: "+972", min: 9, max: 9, example: "501234567", primary: true },

  { iso2: "ZA", name: "South Africa", dial: "+27", min: 9, max: 9, example: "711234567", primary: true },
  { iso2: "NG", name: "Nigeria", dial: "+234", min: 10, max: 10, example: "8021234567", primary: true },
  { iso2: "KE", name: "Kenya", dial: "+254", min: 9, max: 9, example: "712345678", primary: true },
  { iso2: "EG", name: "Egypt", dial: "+20", min: 10, max: 10, example: "1012345678", primary: true },
  { iso2: "GH", name: "Ghana", dial: "+233", min: 9, max: 9, example: "231234567", primary: true },
  { iso2: "TZ", name: "Tanzania", dial: "+255", min: 9, max: 9, example: "712345678", primary: true },

  { iso2: "BR", name: "Brazil", dial: "+55", min: 10, max: 11, example: "11912345678", primary: true },
  { iso2: "MX", name: "Mexico", dial: "+52", min: 10, max: 10, example: "5512345678", primary: true },
  { iso2: "AR", name: "Argentina", dial: "+54", min: 10, max: 10, example: "1123456789", primary: true },
  { iso2: "CL", name: "Chile", dial: "+56", min: 9, max: 9, example: "912345678", primary: true },
  { iso2: "CO", name: "Colombia", dial: "+57", min: 10, max: 10, example: "3211234567", primary: true },
  { iso2: "PE", name: "Peru", dial: "+51", min: 9, max: 9, example: "912345678", primary: true },
];

/** India — what every lead predating the picker is backfilled to. */
export const DEFAULT_DIAL_CODE = "+91";

/** Widest national number this table accepts, for input maxLength caps. */
export const MAX_NATIONAL_DIGITS = COUNTRIES.reduce((n, c) => Math.max(n, c.max), 0);

const BY_DIAL = new Map<string, Country>();
for (const c of COUNTRIES) {
  const held = BY_DIAL.get(c.dial);
  if (!held || (c.primary && !held.primary)) BY_DIAL.set(c.dial, c);
}

/** Resolves a stored dial code to its owning country (+1 gives United States). */
export function countryByDial(dial: string): Country | undefined {
  return BY_DIAL.get(dial);
}

export function countryByIso2(iso2: string): Country | undefined {
  return COUNTRIES.find((c) => c.iso2 === iso2);
}

export function isSupportedDialCode(dial: string): boolean {
  return BY_DIAL.has(dial);
}

/**
 * Validates a national significant number against its dial code. An unknown
 * dial code falls back to the E.164 envelope (4-15 digits) rather than
 * rejecting — a lead imported with a code we do not list is still a real phone
 * number, and hard-failing would strand it.
 */
export function isValidNationalNumber(dial: string, national: string): boolean {
  if (!/^\d+$/.test(national)) return false;
  const country = countryByDial(dial);
  if (!country) return national.length >= 4 && national.length <= 15;
  if (country.pattern) return country.pattern.test(national);
  return national.length >= country.min && national.length <= country.max;
}

/** Hint rendered under the number input, e.g. "10-digit India number". */
export function nationalNumberHint(dial: string): string {
  const country = countryByDial(dial);
  if (!country) return "Enter the number without the country code";
  const digits =
    country.min === country.max
      ? `${country.min}-digit`
      : `${country.min}-${country.max} digit`;
  return `${digits} ${country.name} number, e.g. ${country.example}`;
}

/** Message shown when the entered number fails its country rule. */
export function nationalNumberError(dial: string): string {
  const country = countryByDial(dial);
  if (!country) return "Enter a valid phone number";
  if (country.iso2 === "IN") {
    return "Enter a valid 10-digit Indian mobile number (starts with 6-9)";
  }
  const digits =
    country.min === country.max
      ? `${country.min}-digit`
      : `${country.min}-${country.max} digit`;
  return `Enter a valid ${digits} ${country.name} number`;
}

/** Digits for tel: and wa.me links — E.164 without the leading "+". */
export function toE164Digits(dial: string, national: string): string {
  return `${dial.replace(/\D/g, "")}${national.replace(/\D/g, "")}`;
}

/** Display form for lead headers, tables and cards. */
export function formatPhone(dial: string, national: string): string {
  return `${dial} ${national}`;
}
