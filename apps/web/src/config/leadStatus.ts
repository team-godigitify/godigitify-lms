import { LeadStatus } from "@lms/types";

export type StatusConfig = {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
};

export const STATUS_CONFIG: Record<LeadStatus, StatusConfig> = {
  [LeadStatus.NEW]: {
    label: "New",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  [LeadStatus.ATTEMPTED_CONTACT]: {
    label: "Attempted Contact",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
  [LeadStatus.CONNECTED]: {
    label: "Connected",
    color: "text-cyan-700",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    dot: "bg-cyan-500",
  },
  [LeadStatus.INTERESTED]: {
    label: "Interested",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    dot: "bg-violet-500",
  },
  [LeadStatus.FOLLOW_UP_SCHEDULED]: {
    label: "Follow-up Scheduled",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  [LeadStatus.NEGOTIATING]: {
    label: "Negotiating",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    dot: "bg-indigo-500",
  },
  [LeadStatus.PROPOSAL_SENT]: {
    label: "Proposal Sent",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  [LeadStatus.CLIENT]: {
    label: "Client",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    dot: "bg-green-500",
  },
  [LeadStatus.LOST]: {
    label: "Lost",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  [LeadStatus.NOT_INTERESTED]: {
    label: "Not Interested",
    color: "text-gray-600",
    bg: "bg-gray-50",
    border: "border-gray-200",
    dot: "bg-gray-400",
  },
  [LeadStatus.NOT_REACHABLE]: {
    label: "Not Reachable",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  [LeadStatus.DUPLICATE]: {
    label: "Duplicate",
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
};
