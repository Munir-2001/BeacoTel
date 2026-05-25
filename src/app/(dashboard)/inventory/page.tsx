import { hasPermission, requirePermission } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/server";
import { getInventoryStats, listAssets } from "@/lib/inventory/list";
import { PageHeader } from "@/components/inventory/page-header";
import { FloorplanCard } from "@/components/inventory/floorplan-card";
import {
  AssetRegistry,
  type StaffOption,
} from "@/components/inventory/asset-registry";

export default async function InventoryPage() {
  await requirePermission("inventory", "read");

  const [assets, stats, canEdit, staffOptions] = await Promise.all([
    listAssets(),
    getInventoryStats(),
    hasPermission("inventory", "update"),
    loadStaffOptions(),
  ]);

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader stats={stats} />
      <FloorplanCard />
      <AssetRegistry
        rows={assets}
        staffOptions={staffOptions}
        canEdit={canEdit}
      />
    </div>
  );
}

async function loadStaffOptions(): Promise<StaffOption[]> {
  // Service-role read so the dropdown works for any role with inventory:read;
  // the regular session client can't see other users' profiles when the
  // caller is manager/staff (see profiles RLS in 0001_auth_rbac.sql).
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  return (data ?? []).map((p) => ({ id: p.id, name: p.name || "(no name)" }));
}
