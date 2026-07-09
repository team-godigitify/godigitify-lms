"use client";

import { GlobalFilterBar } from "@/components/dashboard/GlobalFilterBar";
import { LeadSourcesChart } from "@/components/dashboard/LeadSourcesChart";
import { useSourceReport, useCampaignPerformance } from "@/hooks/useDashboard";
import {
  AnalyticsFilterProvider,
  useAnalyticsFilters,
} from "@/context/AnalyticsFilterContext";
import { formatRupees } from "@/lib/format";

type SourceRow = {
  source: { id: string; name: string };
  total: number;
  confirmed: number;
  lost: number;
  conversionRate: number;
};

function SourcesTable() {
  const { period, branchId } = useAnalyticsFilters();
  const { data, isLoading } = useSourceReport(period, branchId);
  const sources = (data as { sources?: SourceRow[] } | undefined)?.sources ?? [];

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Source Performance</h3>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-surface-100 rounded animate-pulse" />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No leads for this period</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 text-left text-xs text-gray-400">
                <th className="pb-2">Source</th>
                <th className="pb-2 text-right">Leads</th>
                <th className="pb-2 text-right">Clients</th>
                <th className="pb-2 text-right">Lost</th>
                <th className="pb-2 text-right">Conv. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
              {sources.map((s) => (
                <tr key={s.source.id}>
                  <td className="py-2 font-medium text-gray-700">{s.source.name}</td>
                  <td className="py-2 text-right text-gray-600">{s.total}</td>
                  <td className="py-2 text-right text-green-600 font-semibold">{s.confirmed}</td>
                  <td className="py-2 text-right text-red-500">{s.lost}</td>
                  <td className="py-2 text-right font-semibold text-gray-800">{s.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CampaignRoiTable() {
  const { branchId } = useAnalyticsFilters();
  const { data, isLoading } = useCampaignPerformance(branchId);
  const campaigns = data?.campaigns ?? [];

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Campaign ROI</h3>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-surface-100 rounded animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          No campaigns yet — add one in Settings → Campaigns
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 text-left text-xs text-gray-400">
                <th className="pb-2">Campaign</th>
                <th className="pb-2 text-right">Leads</th>
                <th className="pb-2 text-right">Conv. Rate</th>
                <th className="pb-2 text-right">Revenue</th>
                <th className="pb-2 text-right">Spend</th>
                <th className="pb-2 text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
              {campaigns.map((c) => (
                <tr key={c.campaign.id}>
                  <td className="py-2">
                    <p className="font-medium text-gray-700">{c.campaign.name}</p>
                    <p className="text-xs text-gray-400">{c.source.name}</p>
                  </td>
                  <td className="py-2 text-right text-gray-600">{c.totalLeads}</td>
                  <td className="py-2 text-right text-gray-600">{c.conversionRate}%</td>
                  <td className="py-2 text-right font-semibold text-green-600">
                    {formatRupees(c.revenue)}
                  </td>
                  <td className="py-2 text-right text-gray-600">
                    {c.campaign.spend !== null ? formatRupees(c.campaign.spend) : "—"}
                  </td>
                  <td className="py-2 text-right font-semibold">
                    {c.roi === null ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <span className={c.roi >= 0 ? "text-green-600" : "text-red-500"}>
                        {c.roi > 0 ? "+" : ""}
                        {c.roi}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SourcesPageContent() {
  return (
    <div className="space-y-6">
      <GlobalFilterBar />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadSourcesChart />
        <SourcesTable />
      </div>
      <CampaignRoiTable />
    </div>
  );
}

export default function SourcesPage() {
  return (
    <AnalyticsFilterProvider>
      <SourcesPageContent />
    </AnalyticsFilterProvider>
  );
}
