"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, BarChart3, User } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Role } from "@lms/types";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isManager = user?.role === Role.ADMIN || user?.role === Role.SUB_ADMIN;

  const tabs = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/leads", label: "Leads", icon: Users },
    ...(isManager
      ? [{ href: "/analytics", label: "Analytics", icon: BarChart3 }]
      : []),
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-surface-200 safe-area-pb">
      <div className="flex items-center">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-gray-400",
              )}
            >
              <Icon
                size={20}
                className={active ? "text-primary" : "text-gray-400"}
              />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
