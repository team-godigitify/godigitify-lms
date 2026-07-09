"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

// Single shared lazy import of react-apexcharts — every chart component used
// to repeat this `dynamic(() => import("react-apexcharts"), {ssr:false})`
// call individually.
export const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Props = {
  title: string;
  action?: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  isError?: boolean;
  errorMessage?: string;
  height?: number;
  children: ReactNode;
};

// Consistent card chrome (header, loading skeleton, empty state, error
// state) shared by every dashboard chart — chart-specific ApexOptions/series
// stay in each component, only the surrounding presentation lives here.
export function ChartCard({
  title,
  action,
  isLoading,
  isEmpty,
  emptyMessage = "No data for this period",
  emptyAction,
  isError,
  errorMessage = "Failed to load chart",
  height = 220,
  children,
}: Props) {
  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {action}
      </div>

      {isLoading ? (
        <div
          className="animate-pulse bg-surface-100 rounded"
          style={{ height }}
        />
      ) : isError ? (
        <div
          className="flex flex-col items-center justify-center gap-2 text-center"
          style={{ height }}
        >
          <AlertCircle size={20} className="text-red-400" />
          <p className="text-sm text-gray-400">{errorMessage}</p>
        </div>
      ) : isEmpty ? (
        <div
          className="flex flex-col items-center justify-center gap-2 text-center"
          style={{ height }}
        >
          <p className="text-sm text-gray-400">{emptyMessage}</p>
          {emptyAction}
        </div>
      ) : (
        <div style={{ height }} className="overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
}
