export type StaffRole = "admin" | "manager" | "staff";
export type StaffStatus = "active" | "inactive";

export type StaffMember = {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  role: StaffRole;
  status: StaffStatus;
  email: string;
  initials: string;
  avatarTint: string;
};

export const STAFF_STATS = {
  totalPersonnel: 142,
  activeNow: 86,
  adminOverrides: 12,
  safetyPct: 100,
};

export const STAFF_ROWS: StaffMember[] = [
  {
    id: "s1",
    employeeId: "EMP-90210",
    name: "Marcus Vane",
    department: "Front Desk",
    role: "manager",
    status: "active",
    email: "marcus.vane@grandarch.com",
    initials: "MV",
    avatarTint: "bg-sky-100 text-sky-700",
  },
  {
    id: "s2",
    employeeId: "EMP-88421",
    name: "Elena Rodriguez",
    department: "Security",
    role: "staff",
    status: "inactive",
    email: "elena.rodriguez@grandarch.com",
    initials: "ER",
    avatarTint: "bg-amber-100 text-amber-700",
  },
  {
    id: "s3",
    employeeId: "EMP-77123",
    name: "Julian Thorne",
    department: "IT Operations",
    role: "admin",
    status: "active",
    email: "julian.thorne@grandarch.com",
    initials: "JT",
    avatarTint: "bg-indigo-100 text-indigo-700",
  },
  {
    id: "s4",
    employeeId: "EMP-66014",
    name: "Sasha Kim",
    department: "Concierge",
    role: "staff",
    status: "active",
    email: "sasha.kim@grandarch.com",
    initials: "SK",
    avatarTint: "bg-emerald-100 text-emerald-700",
  },
];

export const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
];

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

export const DEPARTMENT_OPTIONS = [
  "Front Desk",
  "Security",
  "Concierge",
  "Housekeeping",
  "IT Operations",
  "Maintenance",
  "Food & Beverage",
  "Spa & Wellness",
];

export const PAGE_LIST = [1, 2, 3, "...", 36] as const;
