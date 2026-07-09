"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@lms/types";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/analytics/revenue", label: "Revenue" },
  { href: "/analytics/pipeline", label: "Pipeline" },
  { href: "/analytics/sources", label: "Sources" },
  { href: "/analytics/employees", label: "Employees" },
  { href: "/analytics/branches", label: "Branches", adminOnly: true },
  { href: "/analytics/targets", label: "Targets" },
];

// The /analytics hub — a research surface ("help me understand a trend"),
// deliberately distinct from /dashboard ("what do I need to know right
// now"). Each tab below is its own route with its own unique charts/tables,
// not the dashboard re-rendered under a different header (PRD §2, §7).
export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const tabs = TABS.filter((t) => !t.adminOnly || user?.role === Role.ADMIN);

  return (
    <AuthGuard allowedRoles={[Role.ADMIN, Role.SUB_ADMIN]}>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Trends, forecasts, and reports</p>
        </div>

        <div className="flex items-center gap-1 border-b border-surface-200 overflow-x-auto">
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </AuthGuard>
  );
}
