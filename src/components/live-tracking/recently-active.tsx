import { User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RECENTLY_ACTIVE } from "@/lib/mock-data";

export function RecentlyActive() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Recently Active
        </h3>
        <button className="text-xs font-medium text-primary hover:underline">
          View All
        </button>
      </div>
      <ul className="space-y-3.5">
        {RECENTLY_ACTIVE.map((p) => {
          const isManager = p.role === "manager";
          return (
            <li key={p.id} className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="size-10 bg-secondary text-secondary-foreground">
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    <User className="size-5" strokeWidth={1.75} />
                  </AvatarFallback>
                </Avatar>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card ${
                    p.status.includes("Idle") ? "bg-red-500" : "bg-emerald-500"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {p.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.zone} • {p.status}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
              >
                {isManager ? "Manager" : "Staff"}
              </Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
