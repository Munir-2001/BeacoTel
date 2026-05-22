"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  DEPARTMENT_OPTIONS,
  ROLE_OPTIONS,
  type StaffMember,
  type StaffRole,
  type StaffStatus,
} from "@/lib/staff-data";
import { cn } from "@/lib/utils";

export type StaffDraft = {
  id?: string;
  name: string;
  employeeId: string;
  department: string;
  role: StaffRole;
  status: StaffStatus;
  email: string;
  notes: string;
  initials: string;
  avatarTint: string;
};

const EMPTY_DRAFT: StaffDraft = {
  name: "",
  employeeId: "",
  department: DEPARTMENT_OPTIONS[0],
  role: "staff",
  status: "active",
  email: "",
  notes: "",
  initials: "?",
  avatarTint: "bg-secondary text-secondary-foreground",
};

export function memberToDraft(m: StaffMember): StaffDraft {
  return {
    id: m.id,
    name: m.name,
    employeeId: m.employeeId,
    department: m.department,
    role: m.role,
    status: m.status,
    email: m.email,
    notes: "",
    initials: m.initials,
    avatarTint: m.avatarTint,
  };
}

export function EditStaffSheet({
  open,
  onOpenChange,
  initial,
  onSave,
  onDeactivate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: StaffDraft;
  onSave: (draft: StaffDraft) => void;
  onDeactivate?: (id: string) => void;
}) {
  const [draft, setDraft] = useState<StaffDraft>(initial ?? EMPTY_DRAFT);

  useEffect(() => {
    if (open) setDraft(initial ?? EMPTY_DRAFT);
  }, [open, initial]);

  const isEdit = Boolean(initial?.id);

  function update<K extends keyof StaffDraft>(key: K, value: StaffDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b border-border/70 p-6">
          <SheetTitle className="text-[22px] font-semibold tracking-tight text-foreground">
            {isEdit ? "Edit Staff Member" : "Add New Staff"}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Update personal details and access permissions
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <FieldGroup label="Profile Photo">
            <div className="flex items-center gap-4">
              <Avatar className="size-20 ring-2 ring-border">
                <AvatarFallback
                  className={cn("text-xl font-semibold", draft.avatarTint)}
                >
                  {draft.initials !== "?" ? (
                    draft.initials
                  ) : (
                    <UserRound className="size-8" strokeWidth={1.5} />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  className="h-9 rounded-lg bg-secondary text-xs font-medium"
                >
                  Upload Photo
                </Button>
                <p className="text-xs text-muted-foreground">
                  PNG or JPG, up to 2 MB
                </p>
              </div>
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
                placeholder="EMP-00000"
                className="h-11 rounded-lg bg-muted/60 text-sm"
              />
            </FieldGroup>
            <FieldGroup label="Department" htmlFor="dept">
              <NativeSelect
                id="dept"
                value={draft.department}
                onChange={(v) => update("department", v)}
              >
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
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
              placeholder="name@grandarch.com"
              className="h-11 rounded-lg bg-muted/60 text-sm"
            />
          </FieldGroup>

          <FieldGroup label="Notes & Permissions" htmlFor="notes">
            <Textarea
              id="notes"
              value={draft.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Add notes about shift, certifications, or access exceptions..."
              rows={5}
              className="resize-none rounded-lg bg-muted/60 text-sm"
            />
          </FieldGroup>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border/70 p-6">
          {isEdit && onDeactivate ? (
            <Button
              variant="secondary"
              className="h-11 flex-1 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80"
              onClick={() => initial?.id && onDeactivate(initial.id)}
            >
              Deactivate
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="h-11 flex-1 rounded-lg text-sm font-medium"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          )}
          <Button
            className="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            onClick={() => onSave(draft)}
          >
            Save Changes
          </Button>
        </footer>
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
  children,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full cursor-pointer appearance-none rounded-lg bg-muted/60 pl-3 pr-9 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
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
