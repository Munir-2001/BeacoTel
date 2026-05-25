import { requirePermission, hasPermission } from "@/lib/auth/dal";
import { listStaff, getStaffStats } from "@/lib/staff/admin";
import { StaffDirectoryClient } from "@/components/staff/staff-directory-client";
import { RbacDefinitions } from "@/components/staff/rbac-definitions";
import { LiveFeed } from "@/components/staff/live-feed";

export default async function StaffDirectoryPage() {
  const me = await requirePermission("staff-directory", "read");
  const [rows, stats, canCreate] = await Promise.all([
    listStaff(),
    getStaffStats(),
    hasPermission("staff-directory", "create"),
  ]);

  // Role assignment is admin-only by design (admin owns the user → role map).
  // Department changes also restricted to admin for the inline quick-edit;
  // managers can still update department via the edit sheet.
  const canChangeRole = me.role === "admin";
  const canChangeDepartment = me.role === "admin";

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <StaffDirectoryClient
        rows={rows}
        stats={stats}
        currentUserId={me.id}
        canCreate={canCreate}
        canChangeRole={canChangeRole}
        canChangeDepartment={canChangeDepartment}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <RbacDefinitions />
        <LiveFeed />
      </div>
    </div>
  );
}
