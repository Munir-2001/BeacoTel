import { Menu } from "lucide-react";
import { AvatarMenu } from "@/components/layout/avatar-menu";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { Role } from "@/lib/auth/permissions";
import type { MyActivityRow } from "@/lib/audit/me";

export function Topbar({
  name,
  email,
  role,
  activity,
  onMenuClick,
}: {
  name: string;
  email: string;
  role: Role;
  activity: MyActivityRow[];
  /** Mobile-only: opens the sidebar drawer. */
  onMenuClick?: () => void;
}) {
  return (
    <header className="flex h-[68px] items-center gap-3 border-b border-border bg-background px-4 sm:gap-6 sm:px-8">
      {/* Hamburger — mobile only */}
      <button
        type="button"
        aria-label="Open menu"
        onClick={onMenuClick}
        className="-ml-1 grid size-10 shrink-0 place-items-center rounded-lg text-foreground hover:bg-muted md:hidden"
      >
        <Menu className="size-5" strokeWidth={1.75} />
      </button>

      {/* Brand — hidden on mobile to save room (sidebar drawer shows it) */}
      <div className="hidden w-[180px] shrink-0 md:block">
        <span className="text-[16px] font-semibold tracking-tight text-foreground">
          VDA Telkonet
        </span>
      </div>

      {/* Spacer — pushes the action cluster to the right edge */}
      <div className="flex-1" />

      <div className="flex items-center gap-1 sm:gap-2">
        <NotificationBell items={activity} />
        <ThemeToggle />
        <AvatarMenu name={name} email={email} role={role} />
      </div>
    </header>
  );
}
