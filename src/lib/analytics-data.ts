import { DoorOpen, Utensils, Dumbbell, type LucideIcon } from "lucide-react";

export const PLAYBACK = {
  startLabel: "08:00 AM",
  endLabel: "08:00 PM",
  currentLabel: "11:42 AM",
  /** Current playhead, percentage 0-100. */
  currentPct: 32,
  dateLabel: "Oct 12, 2023",
  totalVisitors: 1284,
  congestion: "Low" as const,
};

export type ZoneFill = {
  id: string;
  label: string;
  pct: number;
  icon: LucideIcon;
  iconBg: string;
  iconFg: string;
};

export const ZONE_FILLS: ZoneFill[] = [
  {
    id: "vip",
    label: "VIP Lounge",
    pct: 82,
    icon: DoorOpen,
    iconBg: "bg-indigo-50",
    iconFg: "text-indigo-700",
  },
  {
    id: "dining",
    label: "Main Dining",
    pct: 45,
    icon: Utensils,
    iconBg: "bg-amber-50",
    iconFg: "text-amber-700",
  },
  {
    id: "gym",
    label: "Gym Wing",
    pct: 18,
    icon: Dumbbell,
    iconBg: "bg-emerald-50",
    iconFg: "text-emerald-700",
  },
];

export const DWELL_TIMES: { zone: string; minutes: number }[] = [
  { zone: "Lobby", minutes: 24 },
  { zone: "Bar East", minutes: 12 },
  { zone: "Terrace", minutes: 42 },
];

/** 10-hour bar chart sample, relative heights 0-1. Peak (index 4) highlighted. */
export const PEAK_OCCUPANCY = {
  deltaPct: 12.4,
  bars: [0.28, 0.35, 0.45, 0.58, 0.95, 0.62, 0.5, 0.42, 0.36, 0.3],
  peakIndex: 4,
};

/** Heatmap blob positions (percentages within the playback canvas — FabLab S35). */
export const HEATMAP_BLOBS = [
  // ELETTRONICA (3x3 workbenches) — peak density
  { x: 65, y: 50, size: 240, intensity: 0.9 },
  // FABLAB — secondary cluster
  { x: 22, y: 55, size: 200, intensity: 0.55 },
  // PROTOTIPAZIONE — light traffic
  { x: 87, y: 55, size: 120, intensity: 0.4 },
];
