// Shared currency formatting — was previously duplicated ad hoc in
// ClientDealsReport.tsx and BranchDashboard.tsx (docs/analytics-prd.md §18).
export function formatRupees(amount: number): string {
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${amount}`;
}
