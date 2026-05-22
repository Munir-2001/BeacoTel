export type Role = "admin" | "manager" | "staff";

export type StaffPoint = {
  id: string;
  name: string;
  role: Role;
  zone: string;
  status: "active" | "idle";
  lastSeen: string;
  /** Percentages within the floor plan canvas (0-100). */
  x: number;
  y: number;
};

export const REAL_TIME_METRICS = {
  activeStaff: { value: 42, deltaPct: 4 },
  densityAlerts: { value: 3 },
};

export const STAFF_POINTS: StaffPoint[] = [
  {
    id: "staff-001",
    name: "Concierge Lead",
    role: "staff",
    zone: "Concierge Desk",
    status: "active",
    lastSeen: "Active 2m ago",
    x: 28,
    y: 38,
  },
  {
    id: "mgr-002",
    name: "Housekeeping Manager",
    role: "manager",
    zone: "Housekeeping Wing",
    status: "active",
    lastSeen: "Active Now",
    x: 68,
    y: 42,
  },
  {
    id: "staff-003",
    name: "Poolside Attendant",
    role: "staff",
    zone: "Poolside Lounge",
    status: "idle",
    lastSeen: "Idle 15m",
    x: 41,
    y: 84,
  },
  {
    id: "staff-004",
    name: "Bell Captain",
    role: "staff",
    zone: "Main Lobby",
    status: "active",
    lastSeen: "Active 4m ago",
    x: 50,
    y: 82,
  },
];

export const RECENTLY_ACTIVE = STAFF_POINTS.slice(0, 3).map((p) => ({
  id: p.id,
  name: p.role === "manager" ? "Manager" : "Staff Member",
  role: p.role,
  zone: p.zone,
  status: p.lastSeen,
}));

export const ROLE_COUNTS: Record<"all" | Role, number> = {
  all: 42,
  admin: 4,
  manager: 9,
  staff: 29,
};
