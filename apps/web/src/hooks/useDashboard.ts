import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export type Period = "today" | "week" | "last30" | "last90" | "custom";
type ApiResponse<T = unknown> = { success: true; data: T };

// ── Dashboard overview ──
export function useDashboardOverview(period: Period, branchId?: string) {
  return useQuery({
    queryKey: ["analytics", "dashboard", period, branchId],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (branchId) params.set("branchId", branchId);
      const { data } = await api.get<ApiResponse>(
        `/analytics/dashboard?${params}`,
      );
      return data.data;
    },
    refetchInterval: 5 * 60_000, // 5 min
    staleTime: 3 * 60_000,
  });
}

// ── Employee performance ──
export function useEmployeePerformance(period: Period, branchId?: string) {
  return useQuery({
    queryKey: ["analytics", "employees", period, branchId],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (branchId) params.set("branchId", branchId);
      const { data } = await api.get<ApiResponse>(
        `/analytics/employees?${params}`,
      );
      return data.data;
    },
    staleTime: 60_000, // 1 min — keeps data fresh across period switches
  });
}

// ── Pipeline ──
export function usePipeline(branchId?: string) {
  return useQuery({
    queryKey: ["analytics", "pipeline", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const { data } = await api.get<ApiResponse>(
        `/analytics/pipeline${params}`,
      );
      return data.data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Lead sources ──
export function useSourceReport(period: Period, branchId?: string) {
  return useQuery({
    queryKey: ["analytics", "sources", period, branchId],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (branchId) params.set("branchId", branchId);
      const { data } = await api.get<ApiResponse>(
        `/analytics/sources?${params}`,
      );
      return data.data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Follow-up compliance (admin/sub-admin only) ──
export function useFollowUpCompliance(branchId?: string, enabled = true) {
  return useQuery({
    queryKey: ["analytics", "follow-ups", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const { data } = await api.get<ApiResponse>(`/analytics/follow-ups${params}`);
      return data.data;
    },
    refetchInterval: 5 * 60_000,
    enabled,
  });
}

// ── Trend data ──
export function useTrend(period: Period, branchId?: string) {
  return useQuery({
    queryKey: ["analytics", "trend", period, branchId],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (branchId) params.set("branchId", branchId);
      const { data } = await api.get<ApiResponse>(
        `/analytics/trend?${params}`,
      );
      return data.data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Leads at risk — non-terminal, no interaction in staleDays+ ──
// Available to all roles: employees are auto-scoped server-side to their
// own leads; managers may pass branchId/assignedToId.
export type LeadAtRisk = {
  id: string;
  name: string | null;
  phone: string;
  status: string;
  leadScore: number | null;
  leadPriority: string;
  assignedTo: { id: string; name: string } | null;
  createdAt: string;
};
export function useLeadsAtRisk(params?: {
  branchId?: string;
  assignedToId?: string;
  staleDays?: number;
}) {
  return useQuery({
    queryKey: ["analytics", "leads-at-risk", params],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params?.branchId) search.set("branchId", params.branchId);
      if (params?.assignedToId) search.set("assignedToId", params.assignedToId);
      if (params?.staleDays) search.set("staleDays", String(params.staleDays));
      const { data } = await api.get<
        ApiResponse<{ staleDays: number; totalAtRisk: number; leads: LeadAtRisk[] }>
      >(`/analytics/leads-at-risk?${search}`);
      return data.data;
    },
    staleTime: 3 * 60_000,
  });
}

// ── Weighted revenue forecast ──
export type StageForecast = { status: string; count: number; value: number; weighted: number; probability: number };
export type RevenueForecast = {
  pipelineValue: number;
  weightedForecast: number;
  byStage: StageForecast[];
  topOpenDeals: Array<{ id: string; status: string; dealSizeEstimate: number }>;
};
export function useRevenueForecast(branchId?: string) {
  return useQuery({
    queryKey: ["analytics", "revenue", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const { data } = await api.get<ApiResponse<RevenueForecast>>(`/analytics/revenue${params}`);
      return data.data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Branch comparison — ADMIN only ──
export type BranchComparisonRow = {
  branch: { id: string; name: string; city: string };
  revenue: number;
  totalLeads: number;
  openLeads: number;
  overdueLeads: number;
  headcount: number;
  complianceRate: number;
  healthScore: number;
  estimatedPipelineValue: number;
};
export function useBranchComparison(period: Period) {
  return useQuery({
    queryKey: ["analytics", "branches", period],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{ branches: BranchComparisonRow[] }>>(
        `/analytics/branches?period=${period}`,
      );
      return data.data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Campaign performance — revenue/ROI per campaign ──
export type CampaignPerformanceRow = {
  campaign: { id: string; name: string; isActive: boolean; spend: number | null };
  source: { id: string; name: string };
  totalLeads: number;
  confirmed: number;
  conversionRate: number;
  revenue: number;
  roi: number | null;
};
export function useCampaignPerformance(branchId?: string) {
  return useQuery({
    queryKey: ["analytics", "campaigns", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const { data } = await api.get<ApiResponse<{ campaigns: CampaignPerformanceRow[] }>>(
        `/analytics/campaigns${params}`,
      );
      return data.data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Workload balance — open leads per employee vs. branch median ──
export function useWorkloadBalance(branchId?: string) {
  return useQuery({
    queryKey: ["analytics", "workload", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const { data } = await api.get<ApiResponse>(`/analytics/workload${params}`);
      return data.data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Clients needing attention — CLIENT deals gone quiet ──
export function useClientsAtRisk(branchId?: string) {
  return useQuery({
    queryKey: ["analytics", "clients-at-risk", branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : "";
      const { data } = await api.get<ApiResponse>(`/analytics/clients-at-risk${params}`);
      return data.data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Single employee drill-down ──
export function useEmployeeDetail(employeeId: string, period: Period) {
  return useQuery({
    queryKey: ["analytics", "employee", employeeId, period],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>(
        `/analytics/employees/${employeeId}?period=${period}`,
      );
      return data.data;
    },
    staleTime: 60_000,
    enabled: !!employeeId,
  });
}

// ── My own performance — any role, no ADMIN/SUB_ADMIN guard on the API side ──
export function useMyPerformance(period: Period, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["analytics", "me", period, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const { data } = await api.get<ApiResponse>(`/analytics/me?${params}`);
      return data.data;
    },
    staleTime: 60_000,
  });
}

// ── My target for a given metric/period (e.g. "2026-07") — empty until an
// ADMIN/SUB_ADMIN has set one via /settings/targets ──
export function useMyTarget(metric: "REVENUE" | "LEADS" | "CONVERSIONS", period: string) {
  return useQuery({
    queryKey: ["targets", "me", metric, period],
    queryFn: async () => {
      const params = new URLSearchParams({ scope: "EMPLOYEE", metric, period });
      const { data } = await api.get<{ success: true; data: { targets: Array<{ value: string }> } }>(
        `/targets?${params}`,
      );
      return data.data.targets[0] ?? null;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Clients / confirmed report ──
export function useClientsReport(period: Period, branchId?: string) {
  return useQuery({
    queryKey: ["analytics", "confirmed", period, branchId],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (branchId) params.set("branchId", branchId);
      const { data } = await api.get<ApiResponse>(
        `/analytics/confirmed?${params}`,
      );
      return data.data;
    },
    staleTime: 3 * 60_000,
  });
}

// ── Combined overdue + upcoming follow-ups (all roles) ──
export function useMyFollowUps() {
  return useQuery({
    queryKey: ["leads", "followups"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse>(`/leads/followups`);
      return data.data;
    },
    refetchInterval: 5 * 60_000,
  });
}

// ── Employee call stats (today's calls, minutes, 7-day daily breakdown) ──
export type DailyCallStat = { date: string; callCount: number; totalMinutes: number };
export type MyCallStats = {
  callsToday: number;
  minutesToday: number;
  leadsInteractedToday: number;
  confirmedToday: number;
  newLeadsToday: number;
  daily: DailyCallStat[];
};

export function useMyCallStats() {
  return useQuery({
    queryKey: ["me", "call-stats"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<MyCallStats>>(`/me/call-stats`);
      return data.data as MyCallStats;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

// ── Individual call log behind an employee's "calls made" count ──
// Same period/userId filter as getEmployeePerformance's callCount, so the
// list total always matches the stat card that opened it.
export type CallLogEntry = {
  id: string;
  note: string | null;
  callDurationSecs: number | null;
  callDirection: string | null;
  callRecordingUrl: string | null;
  createdAt: string;
  lead: { id: string; name: string | null; phone: string } | null;
};
export type CallLogResponse = {
  calls: CallLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function useEmployeeCallLog(
  employeeId: string,
  period: Period,
  page: number,
  enabled = true,
) {
  return useQuery({
    queryKey: ["analytics", "employee-calls", employeeId, period, page],
    queryFn: async () => {
      const params = new URLSearchParams({ period, page: String(page), pageSize: "20" });
      const { data } = await api.get<ApiResponse<CallLogResponse>>(
        `/analytics/employees/${employeeId}/calls?${params}`,
      );
      return data.data;
    },
    enabled: enabled && !!employeeId,
    staleTime: 30_000,
  });
}

export function useMyCallLog(period: Period, page: number, enabled = true) {
  return useQuery({
    queryKey: ["analytics", "me-calls", period, page],
    queryFn: async () => {
      const params = new URLSearchParams({ period, page: String(page), pageSize: "20" });
      const { data } = await api.get<ApiResponse<CallLogResponse>>(
        `/analytics/me/calls?${params}`,
      );
      return data.data;
    },
    enabled,
    staleTime: 30_000,
  });
}

// ── Leads behind an employee's "leads interacted" count — one row per ──
// unique lead, so the list total always matches the stat card.
export type InteractedLeadEntry = {
  lead: { id: string; name: string | null; phone: string; status: string } | null;
  lastInteractionAt: string;
  interactionCount: number;
  callCount: number;
};
export type InteractedLeadsResponse = {
  leads: InteractedLeadEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function useEmployeeInteractedLeads(
  employeeId: string,
  period: Period,
  page: number,
  enabled = true,
) {
  return useQuery({
    queryKey: ["analytics", "employee-interacted-leads", employeeId, period, page],
    queryFn: async () => {
      const params = new URLSearchParams({ period, page: String(page), pageSize: "20" });
      const { data } = await api.get<ApiResponse<InteractedLeadsResponse>>(
        `/analytics/employees/${employeeId}/interacted-leads?${params}`,
      );
      return data.data;
    },
    enabled: enabled && !!employeeId,
    staleTime: 30_000,
  });
}

export function useMyInteractedLeads(period: Period, page: number, enabled = true) {
  return useQuery({
    queryKey: ["analytics", "me-interacted-leads", period, page],
    queryFn: async () => {
      const params = new URLSearchParams({ period, page: String(page), pageSize: "20" });
      const { data } = await api.get<ApiResponse<InteractedLeadsResponse>>(
        `/analytics/me/interacted-leads?${params}`,
      );
      return data.data;
    },
    enabled,
    staleTime: 30_000,
  });
}
