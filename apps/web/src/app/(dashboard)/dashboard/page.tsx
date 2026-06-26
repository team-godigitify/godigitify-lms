"use client";

import { useAuthStore } from "@/store/auth";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { Role } from "@lms/types";

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  const isManager = user.role === Role.ADMIN || user.role === Role.SUB_ADMIN;

  return isManager ? <AdminDashboard /> : <EmployeeDashboard />;
}
