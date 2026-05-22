"use client";

import { cn } from "@/lib/utils";
import { ROLE_COUNTS, type Role } from "@/lib/mock-data";

type Filter = "all" | Role;

const OPTIONS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
];

export function RoleFilter({
  value,
  onChange,
}: {
  value: Filter;
  onChange: (v: Filter) => void;
}) {
  return (
    <div>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Filter Roles
      </h3>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {opt.label}
              {opt.value === "all" && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                    active
                      ? "bg-white/15 text-primary-foreground"
                      : "bg-white text-foreground/70"
                  )}
                >
                  {ROLE_COUNTS.all}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
