import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/dal";
import {
  DEPARTMENT_LABEL,
  type Department,
} from "@/lib/staff-data";
import type { Role } from "@/lib/auth/permissions";
import type { EquipmentStatus } from "@/lib/inventory/types";

/**
 * Server-only aggregations for /analytics. All reads run after the
 * `requirePermission("analytics", "read")` gate; the seeded matrix gives
 * admin + manager access (staff have no analytics permission).
 *
 * Uses the service-role client so manager queries work the same as admin —
 * the permission gate is the authority, not RLS.
 */

export type HeadcountStats = {
  total: number;
  active: number;
  inactive: number;
};

export type DistributionBar = {
  key: string;
  label: string;
  value: number;
  /** 0–100 percentage of the largest bar in the same series. */
  pct: number;
};

export type SigninPoint = {
  /** Local YYYY-MM-DD label. */
  date: string;
  count: number;
};

export type EquipmentMixSlice = {
  status: EquipmentStatus;
  count: number;
  pct: number;
};

const SIGNIN_DAYS = 30;

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
};

const STATUS_PRETTY: Record<EquipmentStatus, string> = {
  in_use: "In Use",
  available: "Available",
  maintenance: "Maintenance",
  broken: "Broken",
  archived: "Archived",
};

export async function getHeadcount(): Promise<HeadcountStats> {
  await requirePermission("analytics", "read");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select("is_active");

  if (error || !data) return { total: 0, active: 0, inactive: 0 };

  const total = data.length;
  const active = data.filter((p) => p.is_active).length;
  return { total, active, inactive: total - active };
}

export async function getDeptDistribution(): Promise<DistributionBar[]> {
  await requirePermission("analytics", "read");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select("department");

  if (error || !data) return [];

  const counts = new Map<string, number>();
  let unassigned = 0;
  for (const row of data) {
    const d = row.department as Department | null;
    if (!d) {
      unassigned += 1;
      continue;
    }
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }

  const bars: DistributionBar[] = Array.from(counts, ([dept, value]) => ({
    key: dept,
    label: DEPARTMENT_LABEL[dept as Department] ?? dept,
    value,
    pct: 0,
  }));
  if (unassigned > 0) {
    bars.push({ key: "unassigned", label: "Unassigned", value: unassigned, pct: 0 });
  }
  return rankAndScale(bars);
}

export async function getRoleDistribution(): Promise<DistributionBar[]> {
  await requirePermission("analytics", "read");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select("role");

  if (error || !data) return [];

  const counts = new Map<Role, number>();
  for (const row of data) {
    const r = row.role as Role;
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }

  const bars: DistributionBar[] = Array.from(counts, ([role, value]) => ({
    key: role,
    label: ROLE_LABEL[role],
    value,
    pct: 0,
  }));
  return rankAndScale(bars);
}

export async function getSigninActivity(): Promise<SigninPoint[]> {
  await requirePermission("analytics", "read");
  const admin = createAdminClient();

  // Local midnight, SIGNIN_DAYS - 1 days ago, so the window is inclusive of today.
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (SIGNIN_DAYS - 1));

  const { data, error } = await admin
    .from("audit_logs")
    .select("occurred_at")
    .eq("action", "login.success")
    .gte("occurred_at", since.toISOString());

  // Seed every day in the window with 0 so the chart is gap-free even on quiet days.
  const buckets = new Map<string, number>();
  for (let i = 0; i < SIGNIN_DAYS; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(localDay(d), 0);
  }

  if (!error && data) {
    for (const row of data) {
      const day = localDay(new Date(row.occurred_at));
      if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }
  }

  return Array.from(buckets, ([date, count]) => ({ date, count }));
}

export async function getEquipmentMix(): Promise<EquipmentMixSlice[]> {
  await requirePermission("analytics", "read");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("equipment")
    .select("status")
    .is("archived_at", null);

  if (error || !data) return [];

  const order: EquipmentStatus[] = [
    "in_use",
    "available",
    "maintenance",
    "broken",
  ];
  const counts = new Map<EquipmentStatus, number>();
  for (const s of order) counts.set(s, 0);
  for (const row of data) {
    const s = row.status as EquipmentStatus;
    if (counts.has(s)) counts.set(s, (counts.get(s) ?? 0) + 1);
  }

  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  return order.map((status) => {
    const count = counts.get(status) ?? 0;
    return {
      status,
      count,
      pct: total === 0 ? 0 : Math.round((count / total) * 100),
    };
  });
}

/** Quick rollups for the inline copy on the page. */
export function signinTotals(points: SigninPoint[]) {
  const total = points.reduce((s, p) => s + p.count, 0);
  const peak = points.reduce((m, p) => Math.max(m, p.count), 0);
  const last7 = points.slice(-7).reduce((s, p) => s + p.count, 0);
  return { total, peak, last7 };
}

/** Friendly label for the EquipmentMix entries — re-exported for the UI. */
export function prettyEquipmentStatus(s: EquipmentStatus): string {
  return STATUS_PRETTY[s];
}

// --- internals ---------------------------------------------------------------

function rankAndScale(bars: DistributionBar[]): DistributionBar[] {
  if (bars.length === 0) return bars;
  bars.sort((a, b) => b.value - a.value);
  const max = bars[0].value || 1;
  return bars.map((b) => ({ ...b, pct: Math.round((b.value / max) * 100) }));
}

function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
