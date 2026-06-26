import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useState } from "react";
import { useAuthStore } from "@/store/auth";

const LAST_SEEN_KEY = "lms_notif_seen";

export type NotifItem = {
  id: string;
  category: "assignment" | "status" | "interaction" | "overdue";
  message: string;
  leadId: string | null;
  createdAt: string;
  isRead: boolean;
};

function buildMessage(
  item: any,
  category: string,
  userId: string,
  _role: string,
): string {
  switch (category) {
    case "assignment": {
      const isForMe = item.assignedToId === userId;
      if (isForMe)
        return `${item.assignedBy?.name ?? "Admin"} assigned ${item.lead?.name ?? item.lead?.phone ?? "lead"} to you`;
      return `${item.assignedBy?.name ?? "Admin"} assigned ${item.lead?.name ?? item.lead?.phone ?? "lead"} to a counsellor`;
    }
    case "status":
      return `${item.user?.name} moved ${item.lead?.name ?? item.lead?.phone ?? "lead"} → ${(item.statusAfter ?? "").replace(/_/g, " ")}`;
    case "overdue":
      return `Follow-up overdue: ${item.name ?? item.phone ?? "lead"}${item.assignedTo ? ` (${item.assignedTo.name})` : ""}`;
    case "interaction":
      if (item.type === "CALL")
        return `${item.user?.name} logged a call with ${item.lead?.name ?? item.lead?.phone ?? "lead"}`;
      if (item.type === "NOTE")
        return `${item.user?.name} added a note on ${item.lead?.name ?? item.lead?.phone ?? "lead"}`;
      if (item.type === "DOCUMENT_UPLOADED")
        return `${item.user?.name} uploaded a document for ${item.lead?.name ?? item.lead?.phone ?? "lead"}`;
      return `${item.user?.name} updated ${item.lead?.name ?? item.lead?.phone ?? "lead"}`;
    default:
      return "New activity";
  }
}

export function useNotificationFeed() {
  const { user } = useAuthStore();
  const [lastSeen, setLastSeen] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(LAST_SEEN_KEY) ?? 0);
  });

  const { data, isLoading } = useQuery({
    queryKey: ["notif-feed", user?.id],
    queryFn: async () => {
      const { data } = await api.get("/activity/notifications");
      return data.data;
    },
    refetchInterval: 30_000,
    enabled: !!user,
  });

  const items: NotifItem[] = [];

  if (data && user) {
    // Assignments
    for (const a of data.assignments ?? []) {
      items.push({
        id: `a-${a.id}`,
        category: "assignment",
        message: buildMessage(a, "assignment", user.id, user.role),
        leadId: a.lead?.id ?? null,
        createdAt: a.createdAt,
        isRead: new Date(a.createdAt).getTime() <= lastSeen,
      });
    }

    // Status changes — show for admin/subadmin
    for (const i of data.interactions ?? []) {
      if (i.type === "STATUS_CHANGED") {
        items.push({
          id: `s-${i.id}`,
          category: "status",
          message: buildMessage(i, "status", user.id, user.role),
          leadId: i.lead?.id ?? null,
          createdAt: i.createdAt,
          isRead: new Date(i.createdAt).getTime() <= lastSeen,
        });
      } else {
        // Other interactions
        items.push({
          id: `i-${i.id}`,
          category: "interaction",
          message: buildMessage(i, "interaction", user.id, user.role),
          leadId: i.lead?.id ?? null,
          createdAt: i.createdAt,
          isRead: new Date(i.createdAt).getTime() <= lastSeen,
        });
      }
    }

    // Overdue follow-ups
    for (const l of data.overdueLeads ?? []) {
      items.push({
        id: `o-${l.id}`,
        category: "overdue",
        message: buildMessage(l, "overdue", user.id, user.role),
        leadId: l.id,
        createdAt: l.nextFollowUpAt,
        isRead: new Date(l.nextFollowUpAt).getTime() <= lastSeen,
      });
    }
  }

  // Sort newest first
  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const unreadCount = items.filter((i) => !i.isRead).length;

  function markAllRead() {
    const now = Date.now();
    localStorage.setItem(LAST_SEEN_KEY, String(now));
    setLastSeen(now);
  }

  return { items: items.slice(0, 25), unreadCount, isLoading, markAllRead };
}
