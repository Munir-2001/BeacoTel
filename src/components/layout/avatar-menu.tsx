"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logout } from "@/lib/auth/actions";
import { BeacotelLoader } from "@/components/ui/beacotel-loader";
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

export function AvatarMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: Role;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function handleLogout() {
    startTransition(async () => {
      await logout();
    });
  }

  return (
    <>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="ml-2 flex items-center gap-3 rounded-full px-1 py-1 hover:bg-muted"
        >
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
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 z-40 mt-2 w-[260px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
          >
            <div className="border-b border-border/70 px-4 py-3">
              <p className="text-sm font-semibold text-foreground" title={email}>
                {name}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {email}
              </p>
              <p className="mt-1 inline-block rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
                {ROLE_LABEL[role]}
              </p>
            </div>

            <ul className="py-1.5 text-sm">
              <li>
                <Link
                  href="/personal-portal"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-foreground/85 hover:bg-muted"
                >
                  <UserRound className="size-4 text-muted-foreground" strokeWidth={1.75} />
                  My Profile
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={pending}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-foreground/85 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut className="size-4 text-muted-foreground" strokeWidth={1.75} />
                  Log Out
                </button>
              </li>
            </ul>
          </div>
        ) : null}
      </div>

      {pending ? (
        <BeacotelLoader variant="overlay" label="Signing out…" />
      ) : null}
    </>
  );
}
