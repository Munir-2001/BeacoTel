"use client";

import { Bell, HelpCircle, Search, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Role } from "@/lib/auth/permissions";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  manager: "Manager",
  staff: "Staff",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Topbar({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: Role;
}) {
  return (
    <header className="flex h-[68px] items-center gap-6 border-b border-border bg-background px-8">
      <div className="w-[180px] shrink-0">
        <span className="text-[16px] font-semibold tracking-tight text-foreground">
          Grand Axis Hotel
        </span>
      </div>

      <div className="flex flex-1 justify-center">
        <div className="relative w-full max-w-[460px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search staff, assets, or rooms..."
            className="h-11 rounded-full border-transparent bg-muted pl-10 text-sm placeholder:text-muted-foreground/70 focus-visible:border-border focus-visible:bg-background"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <IconButton ariaLabel="Notifications">
          <Bell className="size-[18px]" strokeWidth={1.75} />
        </IconButton>
        <IconButton ariaLabel="Help">
          <HelpCircle className="size-[18px]" strokeWidth={1.75} />
        </IconButton>
        <IconButton ariaLabel="Settings">
          <Settings className="size-[18px]" strokeWidth={1.75} />
        </IconButton>

        <div className="ml-2 flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-medium text-foreground" title={email}>
              {name}
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {ROLE_LABEL[role]}
            </p>
          </div>
          <Avatar className="size-9">
            <AvatarFallback className="bg-amber-100 text-sm font-semibold text-amber-700">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}

function IconButton({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
