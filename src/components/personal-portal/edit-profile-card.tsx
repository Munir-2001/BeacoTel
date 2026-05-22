"use client";

import { useState } from "react";
import { UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ME } from "@/lib/personal-portal-data";

const DEPARTMENTS = [
  "Concierge",
  "Front Desk",
  "Housekeeping",
  "Security",
  "IT Operations",
  "Maintenance",
  "Food & Beverage",
];

export function EditProfileCard() {
  const [name, setName] = useState(ME.fullName);
  const [email, setEmail] = useState(ME.email);
  const [phone, setPhone] = useState(ME.phone);
  const [department, setDepartment] = useState(ME.department);

  return (
    <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-none">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[20px] font-semibold tracking-tight text-foreground">
          <UserCog className="size-5 text-foreground/70" strokeWidth={1.75} />
          Edit Profile
        </h2>
        <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-secondary-foreground">
          Personnel ID: {ME.personnelId}
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-lg bg-card text-sm ring-1 ring-border"
          />
        </Field>
        <Field label="Phone Number" htmlFor="pp-phone">
          <Input
            id="pp-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-11 rounded-lg bg-card text-sm ring-1 ring-border"
          />
        </Field>
        <Field label="Department" htmlFor="pp-dept">
          <div className="relative">
            <select
              id="pp-dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="h-11 w-full cursor-pointer appearance-none rounded-lg bg-card pl-3 pr-9 text-sm text-foreground ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
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
      </div>

      <div className="mt-6 flex justify-end">
        <Button className="h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
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
