import { create } from "zustand";

export type ToastType = "success" | "error" | "warning" | "info";

export type Toast = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
};

type NotificationState = {
  toasts: Toast[];
  add: (toast: Omit<Toast, "id">) => void;
  remove: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

export const useNotifications = create<NotificationState>((set) => ({
  toasts: [],

  add: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  remove: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  success: (title, message) =>
    useNotifications.getState().add({
      type: "success",
      title,
      ...(message ? { message } : {}),
    }),

  error: (title, message) =>
    useNotifications.getState().add({
      type: "error",
      title,
      ...(message ? { message } : {}),
    }),

  warning: (title, message) =>
    useNotifications.getState().add({
      type: "warning",
      title,
      ...(message ? { message } : {}),
    }),

  info: (title, message) =>
    useNotifications.getState().add({
      type: "info",
      title,
      ...(message ? { message } : {}),
    }),
}));
