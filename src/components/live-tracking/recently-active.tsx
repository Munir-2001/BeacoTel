import { User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RECENTLY_ACTIVE } from "@/lib/mock-data";

/** The single staff member shown, and the beacon assigned to them. */
const ASSIGNED_BEACON_ID = 1;
const STAFF_NAME = "Staff Member";

export function RecentlyActive() {
  // One tracked staff member, tied to a beacon for the demo.
  const member = RECENTLY_ACTIVE[0];

  return (
    <div>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Recently Active
      </h3>
      <ul className="space-y-3.5">
        <li className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="size-10 bg-secondary text-secondary-foreground">
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                <User className="size-5" strokeWidth={1.75} />
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {STAFF_NAME}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {member?.zone ?? "On-site"} • {member?.status ?? "Active"}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="rounded-full bg-secondary px-2.5 py-1 font-mono text-[11px] font-medium text-secondary-foreground"
          >
            Beacon #{ASSIGNED_BEACON_ID}
          </Badge>
        </li>
      </ul>
    </div>
  );
}
