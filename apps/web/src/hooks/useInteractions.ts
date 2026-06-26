import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useNotifications } from "@/store/notifications";
import { extractApiError } from "@/lib/utils";

export function useInteractions(leadId: string) {
  return useQuery({
    queryKey: ["interactions", leadId],
    queryFn: async () => {
      const { data } = await api.get(`/leads/${leadId}/interactions`);
      return data.data;
    },
    enabled: !!leadId,
    refetchInterval: 30_000,
  });
}

export function useAddInteraction(leadId: string) {
  const qc = useQueryClient();
  const { success, error } = useNotifications();
  return useMutation({
    mutationFn: async (body: {
      type: string;
      note?: string;
      callRecordingUrl?: string;
      callDurationSecs?: number;
    }) => {
      const { data } = await api.post(`/leads/${leadId}/interactions`, body);
      return data.data;
    },
    onSuccess: () => {
      success("Interaction added");
      void qc.invalidateQueries({ queryKey: ["interactions", leadId] });
      void qc.invalidateQueries({ queryKey: ["lead", leadId] });
    },
    onError: (e) => error("Failed to add", extractApiError(e)),
  });
}

export function useEditInteraction() {
  const qc = useQueryClient();
  const { success, error } = useNotifications();
  return useMutation({
    mutationFn: async ({
      id,
      leadId,
      note,
    }: {
      id: string;
      leadId: string;
      note: string;
    }) => {
      await api.patch(`/interactions/${id}`, { note });
      return leadId;
    },
    onSuccess: (leadId) => {
      success("Note updated");
      void qc.invalidateQueries({ queryKey: ["interactions", leadId] });
    },
    onError: (e) => error("Failed to update", extractApiError(e)),
  });
}

export function useDeleteInteraction() {
  const qc = useQueryClient();
  const { success, error } = useNotifications();
  return useMutation({
    mutationFn: async ({ id, leadId }: { id: string; leadId: string }) => {
      await api.delete(`/interactions/${id}`);
      return leadId;
    },
    onSuccess: (leadId) => {
      success("Interaction removed");
      void qc.invalidateQueries({ queryKey: ["interactions", leadId] });
    },
    onError: (e) => error("Failed to delete", extractApiError(e)),
  });
}
