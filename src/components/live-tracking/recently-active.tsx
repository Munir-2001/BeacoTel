"use client";

import { User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLiveBeacons } from "@/lib/positioning/live-beacons";

/** The painting's beacon — tracked on the Inventory asset map, never a person. */
const ASSET_BEACON_ID = 77;

/**
 * One staff row per currently-active beacon (from beacon_live_positions),
 * excluding the asset beacon (77). Stale beacons — e.g. the fixed calibration
 * corners — drop off, so the count reflects who's actually moving right now.
 */
export function RecentlyActive() {
  const { beacons } = useLiveBeacons({ enabled: true });

  const staff = beacons
    .filter((b) => b.beacon_id !== ASSET_BEACON_ID && !b.stale)
    .sort((a, b) => a.beacon_id - b.beacon_id);

  return (
    <div>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Recently Active
      </h3>

      {staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active beacons right now.
        </p>
      ) : (
        <ul className="space-y-3.5">
          {staff.map((b) => (
            <li key={b.beacon_id} className="flex items-center gap-3">
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
                  Staff Member
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Tracked • online
                </p>
              </div>
              <Badge
                variant="secondary"
                className="rounded-full bg-secondary px-2.5 py-1 font-mono text-[11px] font-medium text-secondary-foreground"
              >
                Beacon #{b.beacon_id}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
