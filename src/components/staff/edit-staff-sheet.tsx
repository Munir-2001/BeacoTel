"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, Loader2, UserRound } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEPARTMENT_OPTIONS,
  ROLE_OPTIONS,
  avatarTintForRole,
  initialsOf,
  type Department,
  type StaffRole,
  type StaffStatus,
} from "@/lib/staff-data";
import type { StaffRow } from "@/lib/staff/admin";
import {
  createStaff,
  setStaffActive,
  updateStaff,
  type CreateStaffState,
} from "@/lib/staff/actions";
import { ActivityTimeline } from "@/components/audit/activity-timeline";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { isValidEmail } from "@/lib/validation";
import { cn } from "@/lib/utils";

export type StaffDraft = {
  id?: string;
  name: string;
  employeeId: string;
  department: Department;
  role: StaffRole;
  status: StaffStatus;
  email: string;
  password: string;
};

const EMPTY_DRAFT: StaffDraft = {
  name: "",
  employeeId: "",
  department: DEPARTMENT_OPTIONS[0].value,
  role: "staff",
  status: "active",
  email: "",
  password: "",
};

export function rowToDraft(r: StaffRow): StaffDraft {
  return {
    id: r.id,
    name: r.name,
    employeeId: r.employeeId,
    department: r.department ?? DEPARTMENT_OPTIONS[0].value,
    role: r.role,
    status: r.isActive ? "active" : "inactive",
    email: r.email,
    password: "",
  };
}

export function EditStaffSheet({
  open,
  onOpenChange,
  initial,
  currentUserId,
  canChangeRole,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: StaffDraft;
  currentUserId: string;
  canChangeRole: boolean;
  /** Called after a successful create / update / deactivate. */
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<StaffDraft>(initial ?? EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setDraft(initial ?? EMPTY_DRAFT);
      setError(null);
    }
  }, [open, initial]);

  const isEdit = Boolean(initial?.id);
  const isSelf = initial?.id === currentUserId;
  const initials = initialsOf(draft.name);

  function update<K extends keyof StaffDraft>(key: K, value: StaffDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleSave() {
    setError(null);
    if (isEdit && initial?.id) {
      const id = initial.id;
      const prevStatus = initial.status;
      startTransition(async () => {
        const update = await updateStaff(id, {
          name: draft.name,
          employeeId: draft.employeeId,
          department: draft.department,
          // Only send role if the caller can change it AND it changed.
          role:
            canChangeRole && draft.role !== initial.role
              ? draft.role
              : undefined,
        });
        if (!update.ok) {
          setError(update.error ?? "Could not save changes.");
          return;
        }
        if (draft.status !== prevStatus) {
          const flip = await setStaffActive(id, draft.status === "active");
          if (!flip.ok) {
            setError(flip.error ?? "Could not update status.");
            return;
          }
        }
        onSaved();
      });
    } else {
      // Validate the new-user inputs up front so the operator gets instant,
      // field-specific feedback (the server re-checks as the real gate).
      const email = draft.email.trim();
      if (!draft.name.trim() || !email || !draft.password) {
        setError("Name, email and password are all required.");
        return;
      }
      if (!isValidEmail(email)) {
        setError("Enter a valid email address, e.g. name@company.com.");
        return;
      }
      if (draft.password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }

      // Create flow uses a FormData payload to match the server action shape.
      const fd = new FormData();
      fd.set("name", draft.name);
      fd.set("email", draft.email);
      fd.set("password", draft.password);
      fd.set("role", draft.role);
      fd.set("employeeId", draft.employeeId);
      fd.set("department", draft.department);
      startTransition(async () => {
        const initialState: CreateStaffState = { ok: false, error: null };
        const res = await createStaff(initialState, fd);
        if (!res.ok) {
          setError(res.error ?? "Could not create user.");
          return;
        }
        onSaved();
      });
    }
  }

  function handleDeactivate() {
    if (!initial?.id) return;
    const id = initial.id;
    setError(null);
    startTransition(async () => {
      const res = await setStaffActive(id, false);
      if (!res.ok) {
        setError(res.error ?? "Could not deactivate.");
        return;
      }
      onSaved();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b border-border/70 p-6">
          <SheetTitle className="text-[22px] font-semibold tracking-tight text-foreground">
            {isEdit ? "Edit Staff Member" : "Add New Staff"}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {isEdit
              ? "Update personal details and access permissions."
              : "Provision a new user account with a starter password."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <FieldGroup label="Profile">
            <div className="flex items-center gap-4">
              <Avatar className="size-20 ring-2 ring-border">
                <AvatarFallback
                  className={cn(
                    "text-xl font-semibold",
                    avatarTintForRole(draft.role),
                  )}
                >
                  {initials !== "?" ? (
                    initials
                  ) : (
                    <UserRound className="size-8" strokeWidth={1.5} />
                  )}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs text-muted-foreground">
                Avatar tint is derived from the assigned role.
              </p>
            </div>
          </FieldGroup>

          <FieldGroup label="Full Name" htmlFor="staff-name">
            <Input
              id="staff-name"
              value={draft.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Marcus Vane"
              className="h-11 rounded-lg bg-muted/60 text-sm"
            />
          </FieldGroup>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <FieldGroup label="Employee ID" htmlFor="emp-id">
              <Input
                id="emp-id"
                value={draft.employeeId}
                onChange={(e) => update("employeeId", e.target.value)}
                placeholder={isEdit ? draft.employeeId : "Auto-generated"}
                className="h-11 rounded-lg bg-muted/60 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "Leave unchanged to keep the current ID."
                  : "Leave blank to auto-generate (e.g. EMP-00007)."}
              </p>
            </FieldGroup>
            <FieldGroup label="Department" htmlFor="dept">
              <NativeSelect
                id="dept"
                value={draft.department}
                onChange={(v) => update("department", v as Department)}
              >
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </NativeSelect>
            </FieldGroup>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <FieldGroup label="Assigned Role" htmlFor="role">
              <NativeSelect
                id="role"
                value={draft.role}
                onChange={(v) => update("role", v as StaffRole)}
                disabled={isEdit && (!canChangeRole || isSelf)}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </NativeSelect>
            </FieldGroup>
            <FieldGroup label="Status" htmlFor="status">
              <NativeSelect
                id="status"
                value={draft.status}
                onChange={(v) => update("status", v as StaffStatus)}
                disabled={!isEdit || isSelf}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </NativeSelect>
            </FieldGroup>
          </div>

          <FieldGroup label="Work Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={draft.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="name@vdatelkonet.com"
              disabled={isEdit}
              className="h-11 rounded-lg bg-muted/60 text-sm"
            />
          </FieldGroup>

          {!isEdit ? (
            <FieldGroup label="Starter Password" htmlFor="password">
              <Input
                id="password"
                type="text"
                value={draft.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="At least 8 characters"
                className="h-11 rounded-lg bg-muted/60 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Share this with the user; they can change it after first sign-in.
              </p>
            </FieldGroup>
          ) : null}

          {isEdit && initial?.id ? (
            <ActivityTimeline resourceType="profile" resourceId={initial.id} />
          ) : null}

          {error ? (
            <p className="mt-6 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" strokeWidth={2} />
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border/70 p-6">
          {isEdit ? (
            <Button
              variant="secondary"
              className="h-11 flex-1 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 disabled:opacity-60"
              onClick={() => setConfirmDeactivate(true)}
              disabled={pending || isSelf}
              title={isSelf ? "You can't deactivate your own account" : ""}
            >
              Deactivate
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="h-11 flex-1 rounded-lg text-sm font-medium"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          )}
          <Button
            className="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            onClick={handleSave}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={2} />
            ) : null}
            {isEdit ? "Save Changes" : "Create User"}
          </Button>
        </footer>

        <ConfirmDialog
          open={confirmDeactivate}
          tone="danger"
          title="Deactivate this employee?"
          message={
            <>
              <span className="font-semibold text-foreground">
                {draft.name || "This user"}
              </span>{" "}
              will lose dashboard access immediately and any assigned assets
              should be released. You can reactivate them later.
            </>
          }
          confirmLabel="Deactivate"
          pending={pending}
          onCancel={() => setConfirmDeactivate(false)}
          onConfirm={() => {
            setConfirmDeactivate(false);
            handleDeactivate();
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function FieldGroup({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1 space-y-2 [&+&]:mt-6">
      <Label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function NativeSelect({
  id,
  value,
  onChange,
  disabled,
  children,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-11 w-full cursor-pointer appearance-none rounded-lg bg-muted/60 pl-3 pr-9 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </select>
      <svg
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 6l4 4 4-4" />
      </svg>
    </div>
  );
}
