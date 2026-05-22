"use client";

import { useState } from "react";
import { FloorPlan } from "@/components/live-tracking/floor-plan";
import { MetricsCards } from "@/components/live-tracking/metrics-cards";
import { RoleFilter } from "@/components/live-tracking/role-filter";
import { RecentlyActive } from "@/components/live-tracking/recently-active";
import { Separator } from "@/components/ui/separator";
import { STAFF_POINTS, type Role } from "@/lib/mock-data";

type Filter = "all" | Role;

export default function LiveTrackingPage() {
  const [roleFilter, setRoleFilter] = useState<Filter>("all");

  return (
    <div className="flex h-full min-h-0 gap-6 p-6">
      <FloorPlan points={STAFF_POINTS} activeRole={roleFilter} />

      <aside className="flex w-[320px] shrink-0 flex-col gap-6 overflow-y-auto pr-1">
        <MetricsCards />
        <RoleFilter value={roleFilter} onChange={setRoleFilter} />
        <Separator />
        <RecentlyActive />
      </aside>
    </div>
  );
}
