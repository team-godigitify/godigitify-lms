"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Upload,
  Tag,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Handshake,
  UserCircle,
  LineChart,
  FileText,
  Megaphone,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useLogout } from "@/hooks/useAuthMutations";
import { Role } from "@lms/types";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: Role[];
};

type Props = {
  onClose?: () => void;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: Users },
  {
    label: "Clients",
    href: "/leads?status=CLIENT",
    icon: Handshake,
    roles: [Role.ADMIN, Role.SUB_ADMIN, Role.EMPLOYEE],
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    roles: [Role.ADMIN, Role.SUB_ADMIN],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileText,
    roles: [Role.ADMIN, Role.SUB_ADMIN],
  },
  {
    label: "My Performance",
    href: "/my-performance",
    icon: LineChart,
    roles: [Role.EMPLOYEE],
  },
  {
    label: "Import",
    href: "/import",
    icon: Upload,
    roles: [Role.ADMIN, Role.SUB_ADMIN],
  },
  {
    label: "Employees",
    href: "/employees",
    icon: UserCircle,
    roles: [Role.ADMIN, Role.SUB_ADMIN],
  },
  {
    label: "Lead Sources",
    href: "/settings/sources",
    icon: Tag,
    roles: [Role.ADMIN, Role.SUB_ADMIN],
  },
  {
    label: "Campaigns",
    href: "/settings/campaigns",
    icon: Megaphone,
    roles: [Role.ADMIN, Role.SUB_ADMIN],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: [Role.ADMIN],
  },
];

export function Sidebar({ onClose }: Props) {
  const isMobile = !!onClose;
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const logout = useLogout();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  function handleLogout() {
    onClose?.();
    void logout.mutateAsync();
  }

  const isExpanded = isMobile || !collapsed;

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full bg-gray-100 border-r border-gray-200 transition-all duration-300",
        isMobile ? "w-72" : collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo + mobile close button */}
      <div
        className={cn(
          "flex border-b border-gray-200 px-4",
          isExpanded ? "items-center gap-3" : "items-center justify-center",
        )}
      >
        <div
          className={cn(
            "relative rounded-xl overflow-hidden shrink-0",
            !isExpanded ? "w-10 h-10" : "w-50 h-50",
          )}
        >
          {/* logo.png is a wide icon+wordmark lockup (~4.1:1) — fitting the
              whole thing into a 40x40 collapsed box via object-contain
              shrinks it down to a ~10px-tall illegible strip. When
              collapsed, scale by height instead and clip to the icon mark
              on the left rather than squashing the wordmark in with it. */}
          <Image
            src="/logo.png"
            alt="Godigitify"
            width={1414}
            height={342}
            className={cn(
              "object-contain object-left",
              isExpanded
                ? "w-full h-full"
                : "absolute left-0 top-1/2 -translate-y-1/2 h-10 w-auto max-w-none",
            )}
            priority
          />
        </div>
       
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Branch label */}
      {isExpanded && user?.branch?.name && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            {user.branch.name}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          // Parse item href to separate path from query params
          const [itemPath, itemQuery] = item.href.split("?");
          const itemParams = new URLSearchParams(itemQuery ?? "");
          const hasItemParams = itemParams.size > 0;

          let isActive: boolean;
          if (hasItemParams) {
            // e.g. /leads?status=CLIENT — must match path AND all query params
            isActive =
              pathname === itemPath &&
              [...itemParams.entries()].every(
                ([k, v]) => searchParams.get(k) === v,
              );
          } else {
            // Plain path — active if path matches AND no sibling with query params is active
            const querySiblingActive = visibleItems.some((other) => {
              const [op, oq] = other.href.split("?");
              if (!oq || op !== itemPath) return false;
              const oParams = new URLSearchParams(oq);
              return [...oParams.entries()].every(
                ([k, v]) => searchParams.get(k) === v,
              );
            });
            isActive =
              !querySiblingActive &&
              (pathname === itemPath ||
                (itemPath !== "/dashboard" && pathname.startsWith(itemPath!)));
          }

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              {...(onClose ? { onClick: onClose } : {})}
              aria-label={!isExpanded ? item.label : undefined}
              title={!isExpanded ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 rounded-lg text-sm font-medium transition-colors",
                isMobile ? "py-3" : "py-2.5",
                isActive
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-200 hover:text-gray-900",
              )}
            >
              <Icon
                size={18}
                className={cn("shrink-0", isActive ? "text-white" : "text-gray-400")}
              />
              {isExpanded && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 text-xs font-bold">
              {user?.name?.slice(0, 2).toUpperCase()}
            </span>
          </div>
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-primary capitalize">
                {user?.role?.toLowerCase().replace("_", " ")}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Collapse toggle — desktop only */}
      {!isMobile && (
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-white border border-surface-200 rounded-full flex items-center justify-center shadow-sm hover:bg-surface-50 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight size={12} className="text-gray-500" />
          ) : (
            <ChevronLeft size={12} className="text-gray-500" />
          )}
        </button>
      )}
    </aside>
  );
}
