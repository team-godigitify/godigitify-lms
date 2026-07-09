"use client";

import { TrendingUp, Wallet, Percent, Flame } from "lucide-react";
import { StatCard } from "./StatCard";
import { GlobalFilterBar } from "./GlobalFilterBar";
import { PipelineChart } from "./PipelineChart";
import { LeadSourcesChart } from "./LeadSourcesChart";
import { EmployeePerformanceTable } from "./EmployeePerformanceTable";
import { NeedsHelpList } from "./NeedsHelpList";
import { WorkloadChart } from "./WorkloadChart";
import { StalledLeadsList } from "./StalledLeadsList";
import { ClientsAtRiskList } from "./ClientsAtRiskList";
import { FollowUpComplianceSummary } from "./FollowUpComplianceSummary";
import {
  useDashboardOverview,
  useClientsReport,
  useLeadsAtRisk,
} from "@/hooks/useDashboard";
import {
  AnalyticsFilterProvider,
  useAnalyticsFilters,
} from "@/context/AnalyticsFilterContext";
import { formatRupees } from "@/lib/format";

// Sub Admin's own dashboard — single-branch operations view. Deliberately
// narrower than AdminDashboard: no cross-branch comparison, no company-wide
// leaderboard, no target-setting UI (PRD §4). Every query is transparently
// branch-locked server-side via effectiveBranchId(), regardless of what
// branchId (if any) the frontend sends — SUB_ADMIN can't override it.
function BranchDashboardContent() {
  const { period, branchId } = useAnalyticsFilters();
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview(period, branchId);
  const { data: clients, isLoading: clientsLoading } = useClientsReport(period, branchId);
  const { data: atRisk } = useLeadsAtRisk(branchId ? { branchId } : undefined);

  const summary = (overview as { summary?: Record<string, number> } | undefined)?.summary;
  const revenue = (clients as { summary?: { totalDealValue?: number } } | undefined)?.summary
    ?.totalDealValue;

  return (
    <div className="space-y-6">
      <GlobalFilterBar />

      {/* Branch command strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Branch Revenue"
          value={formatRupees(revenue ?? 0)}
          subtitle="this period"
          icon={<Wallet size={16} className="text-green-600" />}
          colorVariant="green"
          loading={clientsLoading}
          href="/leads?status=CLIENT"
        />
        <StatCard
          title="Pipeline Value"
          value={formatRupees(summary?.pipelineValue ?? 0)}
          subtitle="open deals"
          icon={<TrendingUp size={16} className="text-indigo-600" />}
          colorVariant="indigo"
          loading={overviewLoading}
          href="/leads"
        />
        <StatCard
          title="Win Rate"
          value={`${summary?.conversionRate ?? 0}%`}
          subtitle="this period"
          icon={<Percent size={16} className="text-blue-600" />}
          colorVariant="blue"
          loading={overviewLoading}
          href="/leads?status=CLIENT"
        />
        <StatCard
          title="Leads at Risk"
          value={atRisk?.totalAtRisk ?? 0}
          subtitle="gone quiet 5+ days"
          icon={<Flame size={16} className="text-orange-600" />}
          colorVariant="orange"
          loading={!atRisk}
          href="/leads?overdue=true"
        />
      </div>

      {/* My Team */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EmployeePerformanceTable />
        </div>
        <NeedsHelpList />
      </div>

      {/* Workload */}
      <WorkloadChart />

      {/* Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineChart />
        <StalledLeadsList />
      </div>

      {/* Sources */}
      <LeadSourcesChart />

      {/* Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClientsAtRiskList />
        <FollowUpComplianceSummary />
      </div>
    </div>
  );
}

export function BranchDashboard() {
  return (
    <AnalyticsFilterProvider>
      <BranchDashboardContent />
    </AnalyticsFilterProvider>
  );
}
