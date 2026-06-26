"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAddInteraction } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";

type Props = {
  leadId: string;
  leadName: string;
  open: boolean;
  onClose: () => void;
};

export function QuickNoteModal({ leadId, leadName, open, onClose }: Props) {
  const [note, setNote] = useState("");
  const [type, setType] = useState<"NOTE" | "CALL">("NOTE");
  const addInteraction = useAddInteraction();

  async function handleSubmit() {
    if (!note.trim()) return;
    await addInteraction.mutateAsync({ leadId, type, note: note.trim() });
    setNote("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Add note — {leadName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Type selector */}
          <div className="flex gap-2">
            {(["NOTE", "CALL"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                  type === t
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-600 border-surface-200 hover:border-primary",
                )}
              >
                {t === "NOTE" ? "📝 Note" : "📞 Call Log"}
              </button>
            ))}
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              type === "CALL"
                ? "What happened on the call?"
                : "Add your note here..."
            }
            rows={4}
            className="w-full px-3 py-2.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary resize-none"
          />

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={!note.trim() || addInteraction.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-800 disabled:opacity-50 transition-colors"
            >
              {addInteraction.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
