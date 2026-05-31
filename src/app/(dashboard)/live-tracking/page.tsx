import { FloorPlan } from "@/components/live-tracking/floor-plan";
import { MetricsCards } from "@/components/live-tracking/metrics-cards";
import { RecentlyActive } from "@/components/live-tracking/recently-active";
import { Separator } from "@/components/ui/separator";

export default function LiveTrackingPage() {
  return (
    <div className="flex h-full min-h-0 gap-6 p-6">
      <FloorPlan />

      <aside className="flex w-[320px] shrink-0 flex-col gap-6 overflow-y-auto pr-1">
        <MetricsCards />
        <Separator />
        <RecentlyActive />
      </aside>
    </div>
  );
}
