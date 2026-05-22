import {
  LayoutDashboard,
  Users,
  CircleUser,
  LineChart,
  Boxes,
  ShoppingCart,
  Wrench,
  ShieldCheck,
  FileText,
  UserPlus,
  Plus,
  Download,
  History,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
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
    cta: { label: "Generate Report", icon: FileText },
  },
  {
    label: "Staff Directory",
    href: "/staff-directory",
    icon: Users,
    cta: { label: "Add Staff", icon: UserPlus },
  },
  {
    label: "Personal Portal",
    href: "/personal-portal",
    icon: CircleUser,
  },
  {
    label: "Inventory & Assets",
    href: "/inventory",
    icon: Boxes,
    cta: { label: "New Asset Request", icon: Plus },
  },
  {
    label: "Procurement",
    href: "/procurement",
    icon: ShoppingCart,
    cta: { label: "New Purchase Order", icon: Plus },
  },
  {
    label: "Maintenance",
    href: "/maintenance",
    icon: Wrench,
    cta: { label: "New Work Order", icon: Plus },
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: LineChart,
    cta: { label: "Export Report", icon: Download },
  },
  {
    label: "System Logs",
    href: "/system-logs",
    icon: History,
    cta: { label: "Export Logs", icon: Download },
  },
  {
    label: "RBAC Settings",
    href: "/rbac-settings",
    icon: ShieldCheck,
    cta: { label: "Add Role", icon: Plus },
  },
];

export const DEFAULT_CTA = { label: "Generate Report", icon: FileText };
