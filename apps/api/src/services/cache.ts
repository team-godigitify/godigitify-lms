import type Redis from "ioredis";

// Call this whenever a lead status changes, is created, or assigned
// Prevents stale analytics on the dashboard
export async function invalidateAnalyticsCache(redis: Redis): Promise<void> {
  try {
    const keys = await redis.keys("analytics:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Non-critical — cache will expire naturally
  }
}

export async function invalidateActivityCache(
  redis: Redis,
  branchId: string,
  userId?: string,
): Promise<void> {
  try {
    const keys = await redis.keys(`activity:*:${branchId}:*`);
    const notifKeys = userId ? [`notifs:${userId}`] : [];
    const all = [...keys, ...notifKeys];

    if (all.length > 0) {
      await redis.del(...all);
    }
  } catch {
    // Non-critical — cache will expire naturally
  }
}
