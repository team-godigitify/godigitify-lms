import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useNotifications } from "@/store/notifications";
import { extractApiError } from "@/lib/utils";

export function useBranches() {
  return useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await api.get("/branches");
      return data.data.branches;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  const { success, error } = useNotifications();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      city: string;
      address?: string;
    }) => {
      const { data } = await api.post("/branches", body);
      return data.data;
    },
    onSuccess: () => {
      success("Branch created");
      void qc.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (e) => error("Failed to create branch", extractApiError(e)),
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  const { success, error } = useNotifications();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      city?: string;
      address?: string;
      isActive?: boolean;
    }) => {
      const { data } = await api.patch(`/branches/${id}`, body);
      return data.data;
    },
    onSuccess: () => {
      success("Branch updated");
      void qc.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (e) => error("Failed to update", extractApiError(e)),
  });
}
