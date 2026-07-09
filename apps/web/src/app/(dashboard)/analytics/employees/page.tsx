"use client";

import { GlobalFilterBar } from "@/components/dashboard/GlobalFilterBar";
import { EmployeePerformanceTable } from "@/components/dashboard/EmployeePerformanceTable";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { AnalyticsFilterProvider } from "@/context/AnalyticsFilterContext";

function EmployeesPageContent() {
  return (
    <div className="space-y-6">
      <GlobalFilterBar />
      <EmployeePerformanceTable />
      <Leaderboard />
    </div>
  );
}

export default function AnalyticsEmployeesPage() {
  return (
    <AnalyticsFilterProvider>
      <EmployeesPageContent />
    </AnalyticsFilterProvider>
  );
}
