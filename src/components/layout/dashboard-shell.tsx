"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { Resource, Role } from "@/lib/auth/permissions";
import type { MyActivityRow } from "@/lib/audit/me";
import { cn } from "@/lib/utils";

/**
 * Client shell that wraps Sidebar + Topbar. Holds the mobile drawer state so
 * the hamburger button in the topbar and the slide-in sidebar can coordinate
 * without prop-drilling through a context.
 */
export function DashboardShell({
  user,
  readableResources,
  activity,
  children,
}: {
  user: { id: string; name: string; email: string; role: Role };
  readableResources: Resource[];
  activity: MyActivityRow[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Always close the drawer on route change so a link click on mobile
  // doesn't leave the drawer hanging open.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll while the mobile drawer is open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Mobile backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-30 bg-foreground/40 backdrop-blur-[1px] transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Sidebar — relative on md+, fixed slide-in on mobile */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-out md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <Sidebar
          readableResources={readableResources}
          userRole={user.role}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          name={user.name}
          email={user.email}
          role={user.role}
          activity={activity}
          onMenuClick={() => setOpen(true)}
        />
        <main className="min-h-0 flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
