import { STATUS_CONFIG } from "@/config/leadStatus";
import type { LeadStatus } from "@lms/types";
import { cn } from "@/lib/utils";

type Props = {
  status: LeadStatus;
  size?: "sm" | "md";
  showDot?: boolean;
};

export function StatusBadge({ status, size = "md", showDot = true }: Props) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border",
        config.color,
        config.bg,
        config.border,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
      )}
    >
      {showDot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)}
        />
      )}
      {config.label}
    </span>
  );
}
