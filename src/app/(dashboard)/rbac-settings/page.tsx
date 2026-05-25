import { ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/dal";
import { listUsers, listPermissions } from "@/lib/auth/admin";
import { UsersPanel } from "@/components/rbac/users-panel";
import { PermissionMatrix } from "@/components/rbac/permission-matrix";

export default async function RbacSettingsPage() {
  // The route layout already gates this, but re-check at the data boundary.
  const me = await requireRole("admin");
  const [users, permissions] = await Promise.all([
    listUsers(),
    listPermissions(),
  ]);

  const activeCount = users.filter((u) => u.isActive).length;
  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-xl">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" strokeWidth={1.9} />
            </span>
            <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-foreground">
              RBAC Settings
            </h1>
          </div>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Manage user accounts, assign roles, and tune the role-based
            permission matrix.
          </p>
        </div>

        <div className="flex gap-3">
          <Stat label="Total Users" value={users.length} />
          <Stat label="Active" value={activeCount} />
          <Stat label="Admins" value={adminCount} />
        </div>
      </header>

      <UsersPanel users={users} currentUserId={me.id} />
      <PermissionMatrix initialPermissions={[...permissions]} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="w-[124px] rounded-2xl border border-border/70 bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-[26px] font-semibold leading-none tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}
