"use client";

import { useState } from "react";
import { ChevronDown, ArrowRight, Handshake } from "lucide-react";
import { VALID_TRANSITIONS, LeadStatus } from "@lms/types";
import { STATUS_CONFIG } from "@/config/leadStatus";
import { useTransitionLead } from "@/hooks/useLeadDetail";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";

type Props = {
  leadId: string;
  currentStatus: LeadStatus;
  canTransition: boolean;
  onOpenClientDeal?: () => void;
};

export function StatusTransition({
  leadId,
  currentStatus,
  canTransition,
  onOpenClientDeal,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | null>(null);
  const [note, setNote] = useState("");
  const transition = useTransitionLead(leadId);

  // CLIENT transition is gated by ClientDeal — excluded here, handled via ClientDealForm
  const allValidNext = VALID_TRANSITIONS[currentStatus] ?? [];
  const clientReady = allValidNext.includes(LeadStatus.CLIENT);
  const validNext = allValidNext.filter((s) => s !== LeadStatus.CLIENT);

  async function handleConfirm() {
    if (!selectedStatus) return;
    await transition.mutateAsync({
      toStatus: selectedStatus,
      ...(note.trim() && { note: note.trim() }),
    });
    setSelectedStatus(null);
    setNote("");
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Status
        </span>
      </div>

      <StatusBadge status={currentStatus} size="md" />

      {canTransition && clientReady && (
        <button
          type="button"
          onClick={onOpenClientDeal}
          className="w-full flex items-start gap-2.5 p-3 rounded-xl bg-purple-50 border border-purple-200 hover:bg-purple-100 hover:border-purple-300 transition-colors text-left group cursor-pointer"
        >
          <Handshake size={15} className="text-purple-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-purple-700">Ready to close?</p>
            <p className="text-xs text-purple-600 mt-0.5 leading-relaxed">
              Fill the{" "}
              <span className="font-semibold underline decoration-dotted group-hover:decoration-solid">
                Client Deal
              </span>{" "}
              form below to convert this lead to a client.
            </p>
          </div>
        </button>
      )}

      {canTransition && validNext.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-surface-200 text-sm text-gray-600 hover:border-primary transition-colors bg-white"
          >
            <span>Move to...</span>
            <ChevronDown
              size={14}
              className={cn("transition-transform", open && "rotate-180")}
            />
          </button>

          {open && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-xl shadow-lg z-20 overflow-hidden">
              {validNext.map((status) => {
                const config = STATUS_CONFIG[status];
                return (
                  <button
                    key={status}
                    onClick={() => {
                      setSelectedStatus(status);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50 transition-colors text-left"
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        config.dot,
                      )}
                    />
                    <span className="text-sm text-gray-700">
                      {config.label}
                    </span>
                    <ArrowRight size={12} className="ml-auto text-gray-400" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirmation panel */}
      {selectedStatus && (
        <div className="border border-surface-200 rounded-xl p-3 space-y-3 bg-surface-50">
          <div className="flex items-center gap-2 text-sm">
            <StatusBadge status={currentStatus} size="sm" />
            <ArrowRight size={12} className="text-gray-400" />
            <StatusBadge status={selectedStatus} size="sm" />
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for this transition (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary resize-none bg-white"
          />

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedStatus(null)}
              className="flex-1 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-surface-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleConfirm()}
              disabled={transition.isPending}
              className="flex-1 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-800 rounded-lg disabled:opacity-50 transition-colors"
            >
              {transition.isPending ? "Moving..." : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {validNext.length === 0 && (
        <p className="text-xs text-gray-400 italic">
          {currentStatus === LeadStatus.DUPLICATE
            ? "Duplicate leads cannot be transitioned"
            : "No transitions available"}
        </p>
      )}
    </div>
  );
}
