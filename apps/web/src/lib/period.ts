import type { Period } from "@/hooks/useDashboard";

// Mirrors the backend's getDateRange() shape (YYYY-MM-DD) so a dashboard
// KPI's drill-down link can pass the exact same date bounds the card's
// count used — without this, "Total Leads" and the leads list it links to
// silently answer two different questions (all leads ever vs. leads in
// this period).
export function periodToDateRange(period: Period): { dateFrom?: string; dateTo?: string } {
  if (period === "custom") return {};
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);
  const days = period === "today" ? 0 : period === "week" ? 7 : period === "last30" ? 30 : 90;
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  return { dateFrom: from.toISOString().slice(0, 10), dateTo };
}
