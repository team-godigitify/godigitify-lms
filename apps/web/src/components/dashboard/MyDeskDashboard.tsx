"use client";

import { useState } from "react";
import { Phone, Clock, Flame } from "lucide-react";
import { StatCard } from "./StatCard";
import { CallQueue } from "./CallQueue";
import { FollowUpsDueToday } from "./FollowUpsDueToday";
import { ActivityFeed } from "./ActivityFeed";
import { EmployeeCallChart } from "./EmployeeCallChart";
import { MyTargetProgress } from "./MyTargetProgress";
import { CallLogModal } from "./CallLogModal";
import { useMyCallStats, useMyFollowUps, useLeadsAtRisk } from "@/hooks/useDashboard";

// Employee productivity dashboard — "what do I need to do right now," not
// analytics. Deliberately has no period selector, no company/branch KPIs,
// and no charts that require interpretation (PRD §5). Every element is
// either "do this now" or "here's my own number."
export function MyDeskDashboard() {
  const [callsOpen, setCallsOpen] = useState(false);
  const { data: callStats, isLoading: callStatsLoading } = useMyCallStats();
  const { data: followUps, isLoading: followUpsLoading } = useMyFollowUps();
  const { data: atRisk } = useLeadsAtRisk({ staleDays: 2 });

  const overdueCount =
    (followUps as { overdue?: unknown[] } | undefined)?.overdue?.length ?? 0;
  const hotLeadsCount = (atRisk?.leads ?? []).filter(
    (l) => typeof l.leadScore === "number" && l.leadScore >= 70,
  ).length;

  return (
    <div className="space-y-6">
      {/* Today strip — no period selector, this is always "right now" */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Calls Made Today"
          value={callStats?.callsToday ?? 0}
          subtitle={`${callStats?.minutesToday ?? 0}m talked`}
          icon={<Phone size={16} className="text-blue-600" />}
          colorVariant="blue"
          loading={callStatsLoading}
          onClick={() => setCallsOpen(true)}
        />
        <StatCard
          title="Follow-ups Due"
          value={overdueCount}
          subtitle={overdueCount === 0 ? "all caught up" : "need action"}
          icon={<Clock size={16} className="text-amber-600" />}
          colorVariant={overdueCount > 0 ? "yellow" : "green"}
          loading={followUpsLoading}
          href="/leads?overdue=true"
        />
        <StatCard
          title="Hot Leads"
          value={hotLeadsCount}
          subtitle="gone quiet, high score"
          icon={<Flame size={16} className="text-orange-600" />}
          colorVariant="orange"
        />
        <div className="col-span-2 lg:col-span-1">
          <MyTargetProgress />
        </div>
      </div>

      {/* Call queue — who to call first */}
      <CallQueue />

      {/* Call activity chart */}
      <EmployeeCallChart />

      {/* Follow-ups + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FollowUpsDueToday />
        <div className="bg-white border border-surface-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            My Recent Activity
          </h3>
          <ActivityFeed />
        </div>
      </div>

      <CallLogModal
        open={callsOpen}
        onClose={() => setCallsOpen(false)}
        period="today"
      />
    </div>
  );
}
