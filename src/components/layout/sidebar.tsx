"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LifeBuoy, Radar } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type NavCta } from "@/lib/nav";
import type { Resource, Role } from "@/lib/auth/permissions";
import { LogoutButton } from "@/components/layout/logout-button";

export function Sidebar({
  readableResources,
  userRole,
}: {
  /** Resources the signed-in user may read — controls which nav items show. */
  readableResources: Resource[];
  /** Used to role-gate the contextual CTA at the bottom of the sidebar. */
  userRole: Role;
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

  // CTA is page-scoped now: omit when the active page has none, or when this
  // role isn't entitled to use it (e.g. "Add Staff" is admin-only).
  const cta = activeItem?.cta;
  const ctaVisible =
    !!cta &&
    (cta.requiredRoles === undefined || cta.requiredRoles.includes(userRole));

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
            VDA Telkonet
          </p>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-4">
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
        {ctaVisible ? <CtaButton cta={cta!} /> : null}
        <ul className="space-y-1">
          <li>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/75 hover:bg-secondary hover:text-foreground">
              <LifeBuoy className="size-[18px] text-foreground/55" strokeWidth={1.75} />
              Support
            </button>
          </li>
          <li>
            <LogoutButton />
          </li>
        </ul>
      </div>
    </aside>
  );
}

function CtaButton({ cta }: { cta: NavCta }) {
  const Icon = cta.icon;
  if (cta.disabled) {
    return (
      <button
        type="button"
        disabled
        title={cta.disabledReason}
        className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-primary/40 text-sm font-semibold text-primary-foreground/80"
      >
        <Icon className="size-4" strokeWidth={2} />
        {cta.label}
      </button>
    );
  }
  return (
    <Link
      href={cta.href}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
    >
      <Icon className="size-4" strokeWidth={2} />
      {cta.label}
    </Link>
  );
}
