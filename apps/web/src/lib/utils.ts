import axios from "axios";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return dayjs(date).format("D MMM YYYY");
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return dayjs(date).format("D MMM YYYY, h:mm A");
}

export function formatTimeAgo(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return dayjs(date).fromNow();
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type ApiErrorPayload = {
  error?: { message?: string };
};

export function extractApiError(error: unknown): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return (
      error.response?.data?.error?.message ??
      error.message ??
      "Something went wrong"
    );
  }

  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export function formatPhoneNumber(phone: string): string {
  if (phone.length === 10) {
    return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
  }
  return phone;
}
