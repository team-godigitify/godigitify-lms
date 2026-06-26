import { Users } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { Role } from "@lms/types";

type Props = {
  hasFilters: boolean;
  onClearFilters: () => void;
};

export function EmptyLeads({ hasFilters, onClearFilters }: Props) {
  const { user } = useAuthStore();
  const isEmployee = user?.role === Role.EMPLOYEE;

  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 bg-surface-100 rounded-full flex items-center justify-center mb-4">
          <Users size={24} className="text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-700 mb-1">
          No leads match your filters
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Try adjusting or clearing your filters
        </p>
        <button
          onClick={onClearFilters}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-800 transition-colors"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
        <Users size={28} className="text-primary" />
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">
        {isEmployee ? "No leads for you today" : "No leads yet"}
      </h3>
      <p className="text-sm text-gray-400 mb-6 max-w-xs">
        {isEmployee
          ? "Your assigned leads will appear here. Check back after your admin assigns some leads to you."
          : "Start by adding your first lead or importing from Excel."}
      </p>
      {!isEmployee && (
        <div className="flex gap-3">
          <Link
            href="/leads/new"
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-800 transition-colors"
          >
            Add Lead
          </Link>
          <Link
            href="/import"
            className="px-4 py-2 rounded-lg border border-surface-200 text-gray-600 text-sm font-medium hover:border-primary transition-colors"
          >
            Import Excel
          </Link>
        </div>
      )}
    </div>
  );
}
