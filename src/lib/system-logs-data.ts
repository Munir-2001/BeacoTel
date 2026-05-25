import {
  Archive,
  BadgeCheck,
  ListChecks,
  Shield,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type LogCategory =
  | "staff"
  | "inventory"
  | "security"
  | "maintenance";

export type LogSeverity = "info" | "alert" | "success";

export type LogEvent = {
  id: string;
  /** Group key — events with the same dayKey render under one header. */
  dayKey: string; // "today" | "yesterday" | "2023-10-23" ...
  dayLabel: string; // "Today, October 25"
  time: string; // "10:42 AM"
  /** Raw ISO timestamp — kept on the row so the date-range filter can compare. */
  occurredAt: string;
  category: LogCategory;
  severity: LogSeverity;
  message: string;
};

export const CATEGORY_META: Record<
  LogCategory,
  { label: string; icon: LucideIcon; iconBg: string; iconFg: string; labelColor: string }
> = {
  staff: {
    // Muted slate so the colored rows (Inventory rose, Maintenance emerald)
    // visually stand out against the steady stream of people activity.
    label: "Staff",
    icon: BadgeCheck,
    iconBg: "bg-slate-100",
    iconFg: "text-slate-700",
    labelColor: "text-foreground",
  },
  inventory: {
    label: "Inventory",
    icon: Archive,
    iconBg: "bg-rose-100",
    iconFg: "text-rose-700",
    labelColor: "text-rose-700",
  },
  security: {
    // Slate icon but a primary-color label, so RBAC events read as "important"
    // without competing with Inventory/Maintenance for the eye.
    label: "Security",
    icon: Shield,
    iconBg: "bg-slate-100",
    iconFg: "text-slate-700",
    labelColor: "text-primary",
  },
  maintenance: {
    label: "Maintenance",
    icon: Wrench,
    iconBg: "bg-emerald-100",
    iconFg: "text-emerald-700",
    labelColor: "text-emerald-700",
  },
};

export const SEVERITY_META: Record<
  LogSeverity,
  { label: string; className: string }
> = {
  info: {
    label: "Info",
    className: "bg-slate-200 text-slate-700",
  },
  alert: {
    label: "Alert",
    className: "bg-rose-100 text-rose-700",
  },
  success: {
    label: "Success",
    className: "bg-emerald-100 text-emerald-700",
  },
};

export const FILTER_OPTIONS: {
  value: "all" | LogCategory;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "all", label: "All Events", icon: ListChecks },
  { value: "staff", label: "Staff", icon: BadgeCheck },
  { value: "inventory", label: "Inventory", icon: Archive },
  { value: "security", label: "Security", icon: Shield },
  { value: "maintenance", label: "Maintenance", icon: Wrench },
];

// Mock LOG_EVENTS removed — live data flows in via src/lib/system-logs/list.ts.
