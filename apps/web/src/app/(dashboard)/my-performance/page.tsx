"use client";

import { useState } from "react";
import { useMyPerformance } from "@/hooks/useDashboard";
import { EmployeePerformanceView, type EmployeeDetail } from "@/components/dashboard/EmployeePerformanceView";
import type { Period } from "@/hooks/useDashboard";

// An employee's own version of the manager-facing employee detail page —
// same view, same underlying calculation (getEmployeePerformance), scoped
// to the caller's own id via GET /analytics/me. No ADMIN/SUB_ADMIN role
// requirement: an employee may always see their own performance data.
export default function MyPerformancePage() {
  const [period, setPeriod] = useState<Period>("last30");
  const { data, isLoading } = useMyPerformance(period);

  return (
    <EmployeePerformanceView
      data={data as EmployeeDetail | undefined}
      isLoading={isLoading}
      period={period}
      onPeriodChange={setPeriod}
      backHref="/dashboard"
      backLabel="Dashboard"
      isSelf
    />
  );
}
