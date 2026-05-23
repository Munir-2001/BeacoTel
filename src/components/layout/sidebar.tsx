"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LifeBuoy, LogOut, Radar } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_CTA, NAV_ITEMS } from "@/lib/nav";
import type { Resource } from "@/lib/auth/permissions";
import { logout } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function Sidebar({
  readableResources,
}: {
  /** Resources the signed-in user may read — controls which nav items show. */
  readableResources: Resource[];
}) {
  const pathname = usePathname();

  // Only show pages this user is allowed to open. The page itself + RLS are
  // the real gates; this just keeps the nav honest.
  const allowed = new Set(readableResources);
  const navItems = NAV_ITEMS.filter((i) => allowed.has(i.resource));

  const activeItem =
    navItems.find(
      (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
    ) ?? null;
  const cta = activeItem?.cta ?? DEFAULT_CTA;
  const CtaIcon = cta.icon;

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <Link href="/" className="flex items-center gap-3 px-6 pt-7 pb-7">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Radar className="size-5" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-[18px] font-semibold leading-tight tracking-tight text-foreground">
            Beacotel
          </p>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Hotel Operations
          </p>
        </div>
      </Link>

      <nav className="flex-1 px-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/75 hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[18px]",
                      active ? "text-primary-foreground" : "text-foreground/55",
                    )}
                    strokeWidth={1.75}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 px-4 pb-6">
        <Button className="h-11 w-full justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">
          <CtaIcon className="size-4" strokeWidth={2} />
          {cta.label}
        </Button>
        <ul className="space-y-1">
          <li>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/75 hover:bg-secondary hover:text-foreground">
              <LifeBuoy className="size-[18px] text-foreground/55" strokeWidth={1.75} />
              Support
            </button>
          </li>
          <li>
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/75 hover:bg-secondary hover:text-foreground"
              >
                <LogOut className="size-[18px] text-foreground/55" strokeWidth={1.75} />
                Log Out
              </button>
            </form>
          </li>
        </ul>
      </div>
    </aside>
  );
}
