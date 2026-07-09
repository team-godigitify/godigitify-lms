"use client";

import { GlobalFilterBar } from "@/components/dashboard/GlobalFilterBar";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { StageTimingChart } from "@/components/dashboard/StageTimingChart";
import { StalledLeadsList } from "@/components/dashboard/StalledLeadsList";
import { AnalyticsFilterProvider } from "@/context/AnalyticsFilterContext";

function PipelinePageContent() {
  return (
    <div className="space-y-6">
      <GlobalFilterBar />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineChart />
        <StageTimingChart />
      </div>
      <StalledLeadsList />
    </div>
  );
}

export default function PipelinePage() {
  return (
    <AnalyticsFilterProvider>
      <PipelinePageContent />
    </AnalyticsFilterProvider>
  );
}
