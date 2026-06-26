import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useNotifications } from "@/store/notifications";
import { extractApiError } from "@/lib/utils";

type UserFilters = {
  role?: string | undefined;
  branchId?: string | undefined;
  isActive?: boolean | undefined;
  search?: string | undefined;
  page?: number | undefined;
};

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: ["users", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined) params.set(k, String(v));
      });
      const { data } = await api.get(`/users?${params}`);
      return data.data;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const { data } = await api.get(`/users/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  const { success, error } = useNotifications();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await api.post("/users", body);
      return data.data;
    },
    onSuccess: () => {
      success("User created successfully");
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => error("Failed to create user", extractApiError(e)),
  });
}

export function useDeactivatePreview(id: string) {
  return useQuery({
    queryKey: ["user-deactivate-preview", id],
    queryFn: async () => {
      const { data } = await api.get(`/users/${id}/deactivate-preview`);
      return data.data;
    },
    enabled: false, // manual trigger
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  const { success, error } = useNotifications();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/users/${id}/deactivate`);
    },
    onSuccess: () => {
      success("User deactivated");
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => error("Failed to deactivate", extractApiError(e)),
  });
}

export function useActivateUser() {
  const qc = useQueryClient();
  const { success, error } = useNotifications();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/users/${id}/activate`);
    },
    onSuccess: () => {
      success("User activated");
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => error("Failed to activate", extractApiError(e)),
  });
}

export function useResetUserPassword() {
  const { success, error } = useNotifications();
  return useMutation({
    mutationFn: async ({
      id,
      newPassword,
    }: {
      id: string;
      newPassword: string;
    }) => {
      await api.post(`/users/${id}/reset-password`, { newPassword });
    },
    onSuccess: () => success("Password reset. Employee notified via email."),
    onError: (e) => error("Failed to reset password", extractApiError(e)),
  });
}
