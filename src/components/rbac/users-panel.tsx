"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  UserPlus,
  X,
} from "lucide-react";
import {
  createUser,
  setUserActive,
  updateUserRole,
  type CreateUserState,
} from "@/lib/auth/admin-actions";
import { ALL_ROLES, type Role } from "@/lib/auth/permissions";
import type { AdminUser } from "@/lib/auth/admin";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
};

const initialCreate: CreateUserState = { ok: false, error: null };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UsersPanel({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);

  // Sidebar "Add User" CTA → /rbac-settings?new=1 reveals the create form.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowForm(true);
      router.replace(pathname);
    }
  }, [searchParams, pathname, router]);

  return (
    <section className="rounded-2xl border border-border/70 bg-muted/40 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            User Accounts
          </h2>
          <p className="text-xs text-muted-foreground">
            {users.length} user{users.length === 1 ? "" : "s"} · role changes
            apply on the user&apos;s next sign-in
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {showForm ? (
            <X className="size-4" strokeWidth={2} />
          ) : (
            <UserPlus className="size-4" strokeWidth={2} />
          )}
          {showForm ? "Close" : "Add User"}
        </button>
      </header>

      {showForm ? <CreateUserForm /> : null}

      <div className="mt-3 overflow-x-auto rounded-xl bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <Th className="pl-5">User</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Last Sign-in</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isSelf={u.id === currentUserId}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, initialCreate);

  return (
    <form
      action={action}
      className="mt-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name">
          <Input name="name" required placeholder="Jane Architect" />
        </Field>
        <Field label="Email">
          <Input
            name="email"
            type="email"
            required
            placeholder="jane@vdatelkonet.com"
          />
        </Field>
        <Field label="Temporary password">
          <Input
            name="password"
            type="text"
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </Field>
        <Field label="Role">
          <NativeSelect name="role" defaultValue="staff">
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      {state.error ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" strokeWidth={2} />
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="size-4 shrink-0" strokeWidth={2} />
          User created — share the password; they can sign in now.
        </p>
      ) : null}

      <div className="mt-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" strokeWidth={2} />
          ) : null}
          {pending ? "Creating…" : "Create User"}
        </button>
      </div>
    </form>
  );
}

function UserRow({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const [role, setRole] = useState<Role>(user.role);
  const [active, setActive] = useState(user.isActive);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function changeRole(next: Role) {
    if (next === role) return;
    const prev = role;
    setRole(next);
    setError(null);
    startTransition(async () => {
      const res = await updateUserRole(user.id, next);
      if (!res.ok) {
        setRole(prev);
        setError(res.error ?? "Could not update role.");
      }
    });
  }

  function toggleActive() {
    const next = !active;
    setActive(next);
    setError(null);
    startTransition(async () => {
      const res = await setUserActive(user.id, next);
      if (!res.ok) {
        setActive(!next);
        setError(res.error ?? "Could not update status.");
      }
    });
  }

  return (
    <TableRow className="border-border/60 hover:bg-muted/40">
      <TableCell className="py-3.5 pl-5">
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {user.name}
              {isSelf ? (
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                  You
                </span>
              ) : null}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
            {error ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="size-3" strokeWidth={2} />
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </TableCell>

      <TableCell className="py-3.5">
        <div className="relative w-[150px]">
          <select
            value={role}
            disabled={isSelf || pending}
            onChange={(e) => changeRole(e.target.value as Role)}
            className="h-9 w-full cursor-pointer appearance-none rounded-md border border-border bg-card pl-3 pr-8 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </TableCell>

      <TableCell className="py-3.5">
        <button
          onClick={toggleActive}
          disabled={isSelf || pending}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70",
            active
              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
              : "bg-rose-100 text-rose-800 hover:bg-rose-200",
          )}
          title={isSelf ? "You can't change your own status" : "Toggle status"}
        >
          <span
            className={cn(
              "inline-block size-1.5 rounded-full",
              active ? "bg-emerald-600" : "bg-rose-600",
            )}
          />
          {active ? "Active" : "Inactive"}
        </button>
      </TableCell>

      <TableCell className="py-3.5 pr-5 text-sm text-muted-foreground">
        {user.lastLogin
          ? new Date(user.lastLogin).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "Never"}
      </TableCell>
    </TableRow>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHead
      className={cn(
        "h-12 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function NativeSelect({
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        {...props}
        className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-input bg-transparent pl-3 pr-8 text-sm text-foreground"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
