"use client";

import { useAuthStore } from "@/store/auth";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { BranchDashboard } from "@/components/dashboard/BranchDashboard";
import { MyDeskDashboard } from "@/components/dashboard/MyDeskDashboard";
import { Role } from "@lms/types";

// Three genuinely distinct dashboards per role — not one dashboard reused
// with a filter pre-applied (see docs/analytics-prd.md §2-§5).
export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  switch (user.role) {
    case Role.ADMIN:
      return <AdminDashboard />;
    case Role.SUB_ADMIN:
      return <BranchDashboard />;
    default:
      return <MyDeskDashboard />;
  }
}
