import { Monitor, Wifi, Refrigerator, ArrowUpSquare, type LucideIcon } from "lucide-react";

export type AssetStatus = "operational" | "maintenance" | "broken";

export type EditableAssetStatus =
  | "in_use"
  | "available"
  | "maintenance"
  | "broken";

export const STATUS_OPTIONS: { value: EditableAssetStatus; label: string }[] = [
  { value: "in_use", label: "In Use" },
  { value: "available", label: "Available" },
  { value: "maintenance", label: "Maintenance" },
  { value: "broken", label: "Broken" },
];

export const STAFF_OPTIONS: string[] = [
  "Marcus Chen",
  "Sarah Liu",
  "James Park",
  "Anika Reyes",
  "Diego Romero",
  "Priya Kapoor",
];

export type AssetRow = {
  id: string;
  name: string;
  category: string;
  icon: LucideIcon;
  iconBg: string;
  iconFg: string;
  location: string;
  status: AssetStatus;
  lastInspected: string;
  value: number;
};

export const INVENTORY_STATS = {
  total: 12842,
  newThisMonth: 142,
};

export const FLOORPLAN = {
  levelLabel: "Level 4: Premium Guest Suites & Executive Lounge",
  rooms: {
    topRow: ["SUITE 401", "SUITE 402", "SERVICE LIFT A", "SUITE 403"],
    midLabel: "MAIN SERVICE CORRIDOR",
    bottomRow: ["EXECUTIVE LOUNGE", "SUITE 404", "SUITE 405", "STAIRWELL B"],
  },
  // Coordinates in percentages relative to the floor canvas
  markers: [
    { id: "m1", kind: "core" as const, x: 13, y: 22 }, // suite 401
    { id: "m2", kind: "core" as const, x: 91, y: 18 }, // suite 403
    { id: "m3", kind: "core" as const, x: 96, y: 32 }, // suite 403
    { id: "m4", kind: "aux" as const, x: 94, y: 36 },  // suite 403
    { id: "m5", kind: "core" as const, x: 11, y: 70 }, // exec lounge
    { id: "m6", kind: "core" as const, x: 11, y: 80 }, // exec lounge
    { id: "m7", kind: "core" as const, x: 20, y: 75 }, // exec lounge
    { id: "m8", kind: "aux" as const, x: 28, y: 75 },  // exec lounge
    { id: "m9", kind: "aux" as const, x: 20, y: 92 },  // corridor
  ],
};

export const ASSET_ROWS: AssetRow[] = [
  {
    id: "#AST-401-SH",
    name: "Samsung 65\" Hospitality OLED",
    category: "Multimedia Hardware",
    icon: Monitor,
    iconBg: "bg-sky-50",
    iconFg: "text-sky-700",
    location: "Suite 401",
    status: "operational",
    lastInspected: "Oct 12, 2023",
    value: 1450,
  },
  {
    id: "#AST-LFT-02",
    name: "Otis Service Lift A Motor",
    category: "Structural Asset",
    icon: ArrowUpSquare,
    iconBg: "bg-rose-50",
    iconFg: "text-rose-700",
    location: "Main Shaft",
    status: "maintenance",
    lastInspected: "Sep 04, 2023",
    value: 12800,
  },
  {
    id: "#AST-404-MB",
    name: "Sub-Zero Pro Mini-Bar",
    category: "Appliance",
    icon: Refrigerator,
    iconBg: "bg-blue-50",
    iconFg: "text-blue-700",
    location: "Suite 404",
    status: "operational",
    lastInspected: "Nov 01, 2023",
    value: 2100,
  },
  {
    id: "#AST-LUN-WF",
    name: "Cisco Meraki MR56 AP",
    category: "Network Infrastructure",
    icon: Wifi,
    iconBg: "bg-indigo-50",
    iconFg: "text-indigo-700",
    location: "Exec Lounge",
    status: "operational",
    lastInspected: "Oct 28, 2023",
    value: 850,
  },
];
