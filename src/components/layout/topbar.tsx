"use client";

import { Bell, HelpCircle, Search, Settings, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Topbar() {
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
        <Avatar className="ml-2 size-9">
          <AvatarFallback className="bg-amber-100 text-amber-700">
            <UserRound className="size-5" strokeWidth={1.75} />
          </AvatarFallback>
        </Avatar>
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
