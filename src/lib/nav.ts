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
import type { Resource, Role } from "@/lib/auth/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** RBAC resource — the sidebar hides items the user cannot read. */
  resource: Resource;
  /** Contextual primary action shown at the bottom of the sidebar when this
   *  page is active. Omit to hide the CTA entirely for that page. */
  cta?: NavCta;
};

export type NavCta = {
  label: string;
  icon: LucideIcon;
  /**
   * Where the CTA points. Either a full route (e.g. "/inventory?new=1") or a
   * pure query string applied to the current page. Pages that own a sheet
   * watch their `?new=1` / `?export=1` params and act accordingly.
   */
  href: string;
  /**
   * Roles that may see + click this CTA. Omit to show for everyone with
   * page read permission.
   */
  requiredRoles?: Role[];
  /** Render greyed-out with an explanatory title. Used for BLE-deferred CTAs. */
  disabled?: boolean;
  /** Tooltip shown when disabled. */
  disabledReason?: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Live Tracking",
    href: "/live-tracking",
    icon: LayoutDashboard,
    resource: "live-tracking",
    cta: {
      label: "Generate Report",
      icon: FileText,
      href: "#",
      disabled: true,
      disabledReason: "Available once BLE hardware is connected.",
    },
  },
  {
    label: "Staff Directory",
    href: "/staff-directory",
    icon: Users,
    resource: "staff-directory",
    cta: {
      label: "Add Staff",
      icon: UserPlus,
      href: "/staff-directory?new=1",
      requiredRoles: ["admin"],
    },
  },
  {
    label: "Personal Portal",
    href: "/personal-portal",
    icon: CircleUser,
    resource: "personal-portal",
    // No CTA on the portal — the page is read/edit-your-own-stuff.
  },
  {
    label: "Inventory & Assets",
    href: "/inventory",
    icon: Boxes,
    resource: "inventory",
    cta: {
      label: "Add Asset",
      icon: Plus,
      href: "/inventory?new=1",
      requiredRoles: ["admin", "manager"],
    },
  },
  {
    label: "Maintenance",
    href: "/maintenance",
    icon: Wrench,
    resource: "maintenance",
    cta: {
      label: "Add Asset",
      icon: Plus,
      href: "/inventory?new=1",
      requiredRoles: ["admin", "manager"],
    },
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: LineChart,
    resource: "analytics",
    cta: {
      label: "Export Activity",
      icon: Download,
      href: "/system-logs?export=1",
      requiredRoles: ["admin"],
    },
  },
  {
    label: "System Logs",
    href: "/system-logs",
    icon: History,
    resource: "system-logs",
    cta: {
      label: "Export Logs",
      icon: Download,
      href: "/system-logs?export=1",
      requiredRoles: ["admin"],
    },
  },
  {
    label: "RBAC Settings",
    href: "/rbac-settings",
    icon: ShieldCheck,
    resource: "rbac-settings",
    cta: {
      label: "Add User",
      icon: UserPlus,
      href: "/rbac-settings?new=1",
      requiredRoles: ["admin"],
    },
  },
];
