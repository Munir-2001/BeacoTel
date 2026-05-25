import {
  ArrowUpSquare,
  Monitor,
  Package,
  Refrigerator,
  Sparkles,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import type { EquipmentCategory, EquipmentStatus } from "@/lib/inventory/types";

/**
 * Visual metadata for the Asset Registry. Source-of-truth data types live in
 * `@/lib/inventory/types` — this file is purely presentation (icons + tints)
 * so it can stay client-importable.
 */

export const CATEGORY_VISUAL: Record<
  EquipmentCategory,
  { icon: LucideIcon; iconBg: string; iconFg: string }
> = {
  multimedia: {
    icon: Monitor,
    iconBg: "bg-sky-50",
    iconFg: "text-sky-700",
  },
  appliance: {
    icon: Refrigerator,
    iconBg: "bg-blue-50",
    iconFg: "text-blue-700",
  },
  structural: {
    icon: ArrowUpSquare,
    iconBg: "bg-rose-50",
    iconFg: "text-rose-700",
  },
  network: {
    icon: Wifi,
    iconBg: "bg-indigo-50",
    iconFg: "text-indigo-700",
  },
  cleaning: {
    icon: Sparkles,
    iconBg: "bg-emerald-50",
    iconFg: "text-emerald-700",
  },
  other: {
    icon: Package,
    iconBg: "bg-slate-100",
    iconFg: "text-slate-700",
  },
};

/**
 * Floorplan visual is decorative until the BLE/RFID integration lands and
 * replaces the marker coords with live beacon positions.
 */
export const FLOORPLAN = {
  levelLabel: "Level 4: Premium Guest Suites & Executive Lounge",
  rooms: {
    topRow: ["SUITE 401", "SUITE 402", "SERVICE LIFT A", "SUITE 403"],
    midLabel: "MAIN SERVICE CORRIDOR",
    bottomRow: ["EXECUTIVE LOUNGE", "SUITE 404", "SUITE 405", "STAIRWELL B"],
  },
  markers: [
    { id: "m1", kind: "core" as const, x: 13, y: 22 },
    { id: "m2", kind: "core" as const, x: 91, y: 18 },
    { id: "m3", kind: "core" as const, x: 96, y: 32 },
    { id: "m4", kind: "aux" as const, x: 94, y: 36 },
    { id: "m5", kind: "core" as const, x: 11, y: 70 },
    { id: "m6", kind: "core" as const, x: 11, y: 80 },
    { id: "m7", kind: "core" as const, x: 20, y: 75 },
    { id: "m8", kind: "aux" as const, x: 28, y: 75 },
    { id: "m9", kind: "aux" as const, x: 20, y: 92 },
  ],
};

export const STATUS_PILL: Record<
  EquipmentStatus,
  { label: string; className: string }
> = {
  in_use: {
    label: "In Use",
    className: "bg-sky-100 text-sky-800",
  },
  available: {
    label: "Available",
    className: "bg-emerald-100 text-emerald-800",
  },
  maintenance: {
    label: "Maintenance",
    className: "bg-amber-100 text-amber-800",
  },
  broken: {
    label: "Broken",
    className: "bg-rose-100 text-rose-800",
  },
  archived: {
    label: "Archived",
    className: "bg-slate-100 text-slate-600",
  },
};
