"use client";

import { useState, use } from "react";
import { useEmployeeDetail } from "@/hooks/useDashboard";
import { EmployeePerformanceView, type EmployeeDetail } from "@/components/dashboard/EmployeePerformanceView";
import type { Period } from "@/hooks/useDashboard";

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [period, setPeriod] = useState<Period>("last30");
  const { data, isLoading } = useEmployeeDetail(id, period);

  return (
    <EmployeePerformanceView
      data={data as EmployeeDetail | undefined}
      isLoading={isLoading}
      period={period}
      onPeriodChange={setPeriod}
      backHref="/analytics"
      backLabel="Analytics"
    />
  );
}
