"use client";

import Link from "next/link";
import { Wallet, TrendingUp, Percent, Target as TargetIcon } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { GlobalFilterBar } from "@/components/dashboard/GlobalFilterBar";
import { TrendChart } from "@/components/dashboard/TrendChart";
import {
  useDashboardOverview,
  useClientsReport,
  useRevenueForecast,
} from "@/hooks/useDashboard";
import {
  AnalyticsFilterProvider,
  useAnalyticsFilters,
} from "@/context/AnalyticsFilterContext";
import { formatRupees } from "@/lib/format";
import { STATUS_CONFIG } from "@/config/leadStatus";
import type { LeadStatus } from "@lms/types";

function RevenuePageContent() {
  const { period, branchId } = useAnalyticsFilters();
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview(period, branchId);
  const { data: clients, isLoading: clientsLoading } = useClientsReport(period, branchId);
  const { data: forecast, isLoading: forecastLoading } = useRevenueForecast(branchId);

  const summary = (overview as { summary?: Record<string, number> } | undefined)?.summary;
  const clientSummary = (
    clients as { summary?: { totalDealValue?: number; avgDealValue?: number } } | undefined
  )?.summary;

  return (
    <div className="space-y-6">
      <GlobalFilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Revenue"
          value={formatRupees(clientSummary?.totalDealValue ?? 0)}
          subtitle="this period"
          icon={<Wallet size={16} className="text-green-600" />}
          colorVariant="green"
          loading={clientsLoading}
          href="/leads?status=CLIENT"
        />
        <StatCard
          title="Weighted Forecast"
          value={formatRupees(forecast?.weightedForecast ?? 0)}
          subtitle={`of ${formatRupees(forecast?.pipelineValue ?? 0)} pipeline`}
          icon={<TrendingUp size={16} className="text-indigo-600" />}
          colorVariant="indigo"
          loading={forecastLoading}
        />
        <StatCard
          title="Win Rate"
          value={`${summary?.conversionRate ?? 0}%`}
          subtitle="this period"
          icon={<Percent size={16} className="text-blue-600" />}
          colorVariant="blue"
          loading={overviewLoading}
        />
        <StatCard
          title="Avg Deal Value"
          value={formatRupees(clientSummary?.avgDealValue ?? 0)}
          subtitle="per closed deal"
          icon={<TargetIcon size={16} className="text-orange-600" />}
          colorVariant="orange"
          loading={clientsLoading}
        />
      </div>

      <TrendChart />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage breakdown */}
        <div className="bg-white border border-surface-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Forecast by Stage</h3>
          {forecastLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-surface-100 rounded animate-pulse" />
              ))}
            </div>
          ) : !forecast || forecast.byStage.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No open pipeline yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 text-left text-xs text-gray-400">
                  <th className="pb-2">Stage</th>
                  <th className="pb-2 text-right">Leads</th>
                  <th className="pb-2 text-right">Value</th>
                  <th className="pb-2 text-right">Win %</th>
                  <th className="pb-2 text-right">Weighted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {forecast.byStage
                  .sort((a, b) => b.weighted - a.weighted)
                  .map((s) => (
                    <tr key={s.status}>
                      <td className="py-2">{STATUS_CONFIG[s.status as LeadStatus]?.label ?? s.status}</td>
                      <td className="py-2 text-right text-gray-600">{s.count}</td>
                      <td className="py-2 text-right text-gray-600">{formatRupees(s.value)}</td>
                      <td className="py-2 text-right text-gray-600">{s.probability}%</td>
                      <td className="py-2 text-right font-semibold text-primary">
                        {formatRupees(s.weighted)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top open deals */}
        <div className="bg-white border border-surface-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Top Open Deals</h3>
          {forecastLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-surface-100 rounded animate-pulse" />
              ))}
            </div>
          ) : !forecast || forecast.topOpenDeals.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No open deals with an estimated value</p>
          ) : (
            <div className="space-y-2">
              {forecast.topOpenDeals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/leads/${deal.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-surface-100 hover:border-primary-200 hover:bg-surface-50 transition-colors"
                >
                  <span className="text-xs text-gray-500">
                    {STATUS_CONFIG[deal.status as LeadStatus]?.label ?? deal.status}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">
                    {formatRupees(deal.dealSizeEstimate)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RevenuePage() {
  return (
    <AnalyticsFilterProvider>
      <RevenuePageContent />
    </AnalyticsFilterProvider>
  );
}
