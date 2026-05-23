import {
  LayoutDashboard,
  Users,
  CircleUser,
  LineChart,
  Boxes,
  Wrench,
  ShieldCheck,
  FileText,
  UserPlus,
  Plus,
  Download,
  History,
  type LucideIcon,
} from "lucide-react";
import type { Resource } from "@/lib/auth/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** RBAC resource — the sidebar hides items the user cannot read. */
  resource: Resource;
  /** The contextual primary action shown in the sidebar when this route is active. */
  cta?: {
    label: string;
    icon: LucideIcon;
  };
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Live Tracking",
    href: "/live-tracking",
    icon: LayoutDashboard,
    resource: "live-tracking",
    cta: { label: "Generate Report", icon: FileText },
  },
  {
    label: "Staff Directory",
    href: "/staff-directory",
    icon: Users,
    resource: "staff-directory",
    cta: { label: "Add Staff", icon: UserPlus },
  },
  {
    label: "Personal Portal",
    href: "/personal-portal",
    icon: CircleUser,
    resource: "personal-portal",
  },
  {
    label: "Inventory & Assets",
    href: "/inventory",
    icon: Boxes,
    resource: "inventory",
    cta: { label: "New Asset Request", icon: Plus },
  },
  {
    label: "Maintenance",
    href: "/maintenance",
    icon: Wrench,
    resource: "maintenance",
    cta: { label: "New Work Order", icon: Plus },
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: LineChart,
    resource: "analytics",
    cta: { label: "Export Report", icon: Download },
  },
  {
    label: "System Logs",
    href: "/system-logs",
    icon: History,
    resource: "system-logs",
    cta: { label: "Export Logs", icon: Download },
  },
  {
    label: "RBAC Settings",
    href: "/rbac-settings",
    icon: ShieldCheck,
    resource: "rbac-settings",
    cta: { label: "Add Role", icon: Plus },
  },
];

export const DEFAULT_CTA = { label: "Generate Report", icon: FileText };
