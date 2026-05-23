import type { Role } from "@/lib/auth/permissions";

export type StaffRole = Role;
export type StaffStatus = "active" | "inactive";

export const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
];

/** Mirrors `public.department` in Supabase (migration 0003). */
export type Department =
  | "front_desk"
  | "security"
  | "concierge"
  | "housekeeping"
  | "it_operations"
  | "maintenance"
  | "food_beverage"
  | "spa_wellness";

export const ALL_DEPARTMENTS: Department[] = [
  "front_desk",
  "security",
  "concierge",
  "housekeeping",
  "it_operations",
  "maintenance",
  "food_beverage",
  "spa_wellness",
];

export const DEPARTMENT_LABEL: Record<Department, string> = {
  front_desk: "Front Desk",
  security: "Security",
  concierge: "Concierge",
  housekeeping: "Housekeeping",
  it_operations: "IT Operations",
  maintenance: "Maintenance",
  food_beverage: "Food & Beverage",
  spa_wellness: "Spa & Wellness",
};

export const DEPARTMENT_OPTIONS: { value: Department; label: string }[] =
  ALL_DEPARTMENTS.map((d) => ({ value: d, label: DEPARTMENT_LABEL[d] }));

export const RBAC_DEFINITIONS = [
  {
    role: "Admin",
    color: "bg-primary",
    description:
      "Unrestricted access to all systems, RBAC management, and financial reporting.",
  },
  {
    role: "Manager",
    color: "bg-sky-500",
    description:
      "Full personnel oversight, shift scheduling, and property maintenance logs.",
  },
  {
    role: "Staff",
    color: "bg-emerald-500",
    description:
      "Standard access to tracking modules and task management interfaces.",
  },
];

export type FeedItem = {
  id: string;
  title: string;
  subject?: string;
  detail?: string;
  time: string;
  tone: "neutral" | "info" | "danger";
};

// Live feed is still mock until we wire the events table.
export const LIVE_FEED: FeedItem[] = [
  {
    id: "f1",
    title: "Julian Thorne",
    detail: "clocked in",
    time: "2 minutes ago",
    tone: "neutral",
  },
  {
    id: "f2",
    title: "Role Update",
    subject: "Marcus Vane",
    detail: "Promoted to Manager",
    time: "1 hour ago",
    tone: "info",
  },
  {
    id: "f3",
    title: "Security Alert",
    subject: "Offline",
    time: "2 hours ago",
    tone: "danger",
  },
];

export const PAGE_LIST = [1, 2, 3, "...", 36] as const;

/** Two-letter initials derived from a display name. "?" if blank. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic avatar tint keyed off role, so the table reads at a glance. */
export function avatarTintForRole(role: StaffRole): string {
  switch (role) {
    case "admin":
      return "bg-indigo-100 text-indigo-700";
    case "manager":
      return "bg-sky-100 text-sky-700";
    case "staff":
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}
