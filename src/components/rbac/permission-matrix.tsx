"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { togglePermission } from "@/lib/auth/admin-actions";
import {
  ALL_ACTIONS,
  ALL_RESOURCES,
  ALL_ROLES,
  RESOURCE_LABEL,
  type Action,
  type Resource,
  type Role,
} from "@/lib/auth/permissions";
import { Checkbox } from "@/components/ui/checkbox";
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

const ACTION_LABEL: Record<Action, string> = {
  read: "View",
  create: "Create",
  update: "Edit",
  delete: "Delete",
};

export function PermissionMatrix({
  initialPermissions,
}: {
  /** `role:resource:action` keys for the whole matrix. */
  initialPermissions: string[];
}) {
  const [perms, setPerms] = useState(() => new Set(initialPermissions));
  const [role, setRole] = useState<Role>("manager");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const readOnly = role === "admin";
  const keyFor = (r: Resource, a: Action) => `${role}:${r}:${a}`;

  function toggle(resource: Resource, action: Action, enabled: boolean) {
    const key = keyFor(resource, action);
    setError(null);
    setPerms((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(key);
      else next.delete(key);
      return next;
    });
    startTransition(async () => {
      const res = await togglePermission(role, resource, action, enabled);
      if (!res.ok) {
        // Revert the optimistic change.
        setPerms((prev) => {
          const next = new Set(prev);
          if (enabled) next.delete(key);
          else next.add(key);
          return next;
        });
        setError(res.error ?? "Could not update permission.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-muted/40 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Permission Matrix
          </h2>
          <p className="text-xs text-muted-foreground">
            Toggle what each role can do. Changes take effect immediately.
          </p>
        </div>
        <div className="flex h-9 rounded-lg bg-card p-1 ring-1 ring-border">
          {ALL_ROLES.map((r) => (
            <button
              key={r}
              onClick={() => {
                setRole(r);
                setError(null);
              }}
              className={cn(
                "h-full rounded-md px-3.5 text-sm font-medium transition-colors",
                role === r
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <p className="mt-2 flex items-center gap-2 px-1 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" strokeWidth={2} />
          {error}
        </p>
      ) : null}

      {readOnly ? (
        <p className="mt-2 flex items-center gap-2 rounded-lg bg-secondary/70 px-3 py-2 text-xs font-medium text-secondary-foreground">
          <ShieldCheck className="size-4 shrink-0" strokeWidth={2} />
          Administrators always have unrestricted access — this role is fixed.
        </p>
      ) : null}

      <div className="mt-3 overflow-x-auto rounded-xl bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <Th className="pl-5">Resource</Th>
              {ALL_ACTIONS.map((a) => (
                <Th key={a} className="text-center">
                  {ACTION_LABEL[a]}
                </Th>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ALL_RESOURCES.map((resource) => (
              <TableRow
                key={resource}
                className="border-border/60 hover:bg-muted/40"
              >
                <TableCell className="py-3 pl-5 text-sm font-medium text-foreground">
                  {RESOURCE_LABEL[resource]}
                </TableCell>
                {ALL_ACTIONS.map((action) => {
                  const checked = perms.has(keyFor(resource, action));
                  return (
                    <TableCell key={action} className="py-3 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={checked}
                          disabled={readOnly || pending}
                          onCheckedChange={(c) =>
                            toggle(resource, action, Boolean(c))
                          }
                          aria-label={`${ROLE_LABEL[role]} can ${action} ${RESOURCE_LABEL[resource]}`}
                        />
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pending ? (
        <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" strokeWidth={2} />
          Saving…
        </p>
      ) : null}
    </section>
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
