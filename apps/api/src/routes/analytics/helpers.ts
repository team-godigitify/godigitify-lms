import type Redis from "ioredis";

// ── Date range builder ──
export type Period = "today" | "week" | "last30" | "last90" | "custom";

export function getDateRange(
  period: Period,
  dateFrom?: string,
  dateTo?: string,
): { from: Date; to: Date } {
  const now = new Date();

  switch (period) {
    case "today": {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    case "week": {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      return { from, to: now };
    }
    case "last30": {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { from, to: now };
    }
    case "last90": {
      const from = new Date(now);
      from.setDate(from.getDate() - 90);
      return { from, to: now };
    }
    case "custom": {
      return {
        from: dateFrom ? new Date(dateFrom) : new Date(0),
        to: dateTo ? new Date(dateTo) : now,
      };
    }
    default: {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { from, to: now };
    }
  }
}

// ── Redis cache helper ──
// Every analytics query goes through this.
// Cache hit = zero DB queries.
export async function getCached<T>(
  redis: Redis,
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
  } catch {
    // Redis unavailable — fall through to DB
  }

  const data = await fetcher();

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch {
    // Cache write failed — still return data
  }

  return data;
}

// ── Cache key builder — deterministic per params ──
export function buildCacheKey(
  report: string,
  params: Record<string, string | undefined>,
): string {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
  return `analytics:${report}:${sorted}`;
}
