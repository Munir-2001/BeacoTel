"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEPARTMENT_OPTIONS,
  type Department,
} from "@/lib/staff-data";
import { updateMyProfile } from "@/lib/personal-portal/actions";
import type { MyProfile } from "@/lib/personal-portal/me";

export function EditProfileCard({ initial }: { initial: MyProfile }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [department, setDepartment] = useState<Department | null>(
    initial.department,
  );
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty =
    name.trim() !== initial.name.trim() || department !== initial.department;

  function handleSave() {
    setError(null);
    setSavedAt(null);
    startTransition(async () => {
      const res = await updateMyProfile({
        name,
        department, // null means "clear"; the action treats null as unset
      });
      if (!res.ok) {
        setError(res.error ?? "Could not save your profile.");
        return;
      }
      setSavedAt(Date.now());
      // Propagate the new name/department through the topbar + the rest of
      // the dashboard chrome on this tab.
      router.refresh();
    });
  }

  return (
    <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-none">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[20px] font-semibold tracking-tight text-foreground">
          <UserCog className="size-5 text-foreground/70" strokeWidth={1.75} />
          Edit Profile
        </h2>
        <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-secondary-foreground">
          {initial.employeeId
            ? `Personnel ID: ${initial.employeeId}`
            : "Personnel ID: —"}
        </span>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Full Name" htmlFor="pp-name">
          <Input
            id="pp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 rounded-lg bg-card text-sm ring-1 ring-border"
          />
        </Field>
        <Field label="Email Address" htmlFor="pp-email">
          <Input
            id="pp-email"
            value={initial.email}
            disabled
            className="h-11 rounded-lg bg-muted/60 text-sm ring-1 ring-border"
          />
        </Field>
        <Field label="Department" htmlFor="pp-dept">
          <div className="relative">
            <select
              id="pp-dept"
              value={department ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setDepartment(v ? (v as Department) : null);
              }}
              className="h-11 w-full cursor-pointer appearance-none rounded-lg bg-card pl-3 pr-9 text-sm text-foreground ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <option value="">Unassigned</option>
              {DEPARTMENT_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
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
        </Field>
        <Field label="Role" htmlFor="pp-role">
          <Input
            id="pp-role"
            value={initial.role.charAt(0).toUpperCase() + initial.role.slice(1)}
            disabled
            className="h-11 rounded-lg bg-muted/60 text-sm ring-1 ring-border"
          />
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        {error ? (
          <p className="mr-auto flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" strokeWidth={2} />
            {error}
          </p>
        ) : null}
        {!error && savedAt ? (
          <p className="mr-auto flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4 shrink-0" strokeWidth={2} />
            Saved.
          </p>
        ) : null}
        <Button
          onClick={handleSave}
          disabled={pending || !dirty}
          className="h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={2} />
          ) : null}
          Save Profile Changes
        </Button>
      </div>
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
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
