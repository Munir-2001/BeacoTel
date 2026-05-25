import Link from "next/link";
import { BarChart3, Radar } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "people" | "zone";

/**
 * Shared tab strip across the two Analytics surfaces. `zone` is hardware-
 * driven (BLE) and still mock; `people` is the new live tab.
 */
export function AnalyticsTabs({ active }: { active: Tab }) {
  return (
    <nav
      aria-label="Analytics sections"
      className="inline-flex rounded-2xl bg-secondary p-1.5"
    >
      <TabLink
        href="/analytics"
        active={active === "people"}
        icon={<BarChart3 className="size-4" strokeWidth={2} />}
        label="People & Activity"
      />
      <TabLink
        href="/analytics/zone-density"
        active={active === "zone"}
        icon={<Radar className="size-4" strokeWidth={2} />}
        label="Zone Density"
        subtitle="BLE"
      />
    </nav>
  );
}

function TabLink({
  href,
  active,
  icon,
  label,
  subtitle,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
      {subtitle ? (
        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          {subtitle}
        </span>
      ) : null}
    </Link>
  );
}
