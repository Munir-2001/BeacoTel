import { HelpCircle, Menu, Search, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
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

      {/* Search — collapsed to an icon-only button on small screens */}
      <div className="flex flex-1 justify-center">
        <div className="relative hidden w-full max-w-[460px] sm:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search staff, assets, or rooms..."
            className="h-11 rounded-full border-transparent bg-muted pl-10 text-sm placeholder:text-muted-foreground/70 focus-visible:border-border focus-visible:bg-background"
          />
        </div>
        <button
          type="button"
          aria-label="Search"
          className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground sm:hidden"
        >
          <Search className="size-[18px]" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <NotificationBell items={activity} />
        <ThemeToggle />
        {/* Help + Settings hidden on the smallest breakpoints to keep the
            cluster compact next to the avatar menu. */}
        <IconButton ariaLabel="Help" className="hidden sm:grid">
          <HelpCircle className="size-[18px]" strokeWidth={1.75} />
        </IconButton>
        <IconButton ariaLabel="Settings" className="hidden lg:grid">
          <Settings className="size-[18px]" strokeWidth={1.75} />
        </IconButton>

        <AvatarMenu name={name} email={email} role={role} />
      </div>
    </header>
  );
}

function IconButton({
  children,
  ariaLabel,
  className,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={`grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
