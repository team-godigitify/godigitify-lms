"use client";

import Link from "next/link";
import { useClientsReport } from "@/hooks/useDashboard";
import { useAnalyticsFilters } from "@/context/AnalyticsFilterContext";
import { formatRupees } from "@/lib/format";
import { Handshake, TrendingUp, IndianRupee, ExternalLink } from "lucide-react";
import dayjs from "dayjs";

type ClientLead = {
  id: string;
  name: string | null;
  phone: string;
  confirmedAt: string | null;
  assignedTo: { id: string; name: string } | null;
  dealValue: number;
  servicesSold: string[];
  contractStartDate: string | null;
};

type ReportData = {
  summary: { totalClients: number; totalDealValue: number };
  leads: ClientLead[];
};

export function ClientDealsReport() {
  const { period, branchId } = useAnalyticsFilters();
  const { data, isLoading } = useClientsReport(period, branchId);

  const report = data as ReportData | undefined;
  const leads = report?.leads ?? [];
  const summary = report?.summary;

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center">
            <Handshake size={14} className="text-green-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Client Deals</h3>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-50 rounded-lg px-3 py-2.5 flex items-center gap-2">
          <TrendingUp size={14} className="text-green-600 shrink-0" />
          <div>
            <p className="text-[11px] text-green-600">Total Clients</p>
            <p className="text-lg font-bold text-green-700">
              {isLoading ? "—" : (summary?.totalClients ?? 0)}
            </p>
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg px-3 py-2.5 flex items-center gap-2">
          <IndianRupee size={14} className="text-blue-600 shrink-0" />
          <div>
            <p className="text-[11px] text-blue-600">Total Deal Value</p>
            <p className="text-lg font-bold text-blue-700">
              {isLoading ? "—" : formatRupees(summary?.totalDealValue ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-surface-100 rounded animate-pulse" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          No client deals closed in this period
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-3">
                  Client
                </th>
                <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-3">
                  Services
                </th>
                <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-3">
                  Closed By
                </th>
                <th className="text-right text-xs font-medium text-gray-400 pb-2 pr-3">
                  Deal Value
                </th>
                <th className="text-right text-xs font-medium text-gray-400 pb-2">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
              {leads.slice(0, 8).map((lead) => (
                <tr key={lead.id} className="hover:bg-surface-50 transition-colors group">
                  <td className="py-2 pr-3">
                    <a
                      href={`/leads/${lead.id}`}
                      className="flex items-center gap-1 font-medium text-gray-800 hover:text-primary group-hover:underline"
                    >
                      {lead.name ?? lead.phone}
                      <ExternalLink size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                    </a>
                    <p className="text-[11px] text-gray-400">{lead.phone}</p>
                  </td>
                  <td className="py-2 pr-3">
                    {lead.servicesSold.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {lead.servicesSold.slice(0, 2).map((s) => (
                          <span
                            key={s}
                            className="inline-block text-[10px] bg-primary-50 text-primary px-1.5 py-0.5 rounded"
                          >
                            {s}
                          </span>
                        ))}
                        {lead.servicesSold.length > 2 && (
                          <span className="text-[10px] text-gray-400">
                            +{lead.servicesSold.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-xs text-gray-500">
                    {lead.assignedTo?.name ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {lead.dealValue > 0 ? (
                      <span className="text-sm font-semibold text-green-600">
                        {formatRupees(lead.dealValue)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2 text-right text-xs text-gray-400">
                    {lead.confirmedAt
                      ? dayjs(lead.confirmedAt).format("DD MMM")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length > 8 && (
            <p className="text-center text-xs text-gray-400 mt-2 pt-2 border-t border-surface-100">
              Showing 8 of {leads.length} deals —{" "}
              <Link href="/leads?status=CLIENT" className="text-primary hover:underline">
                view all
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
