"use client";

import { useState } from "react";
import { ZoneDensityHeader, type ViewMode } from "@/components/analytics/page-header";
import { PlaybackCard } from "@/components/analytics/playback-card";
import {
  AvgDwellTimeCard,
  PeakOccupancyCard,
} from "@/components/analytics/charts";
import {
  PlaybackLogic,
  PlaybackSummary,
  ZoneBreakdown,
} from "@/components/analytics/right-rail";
import { PLAYBACK } from "@/lib/analytics-data";

export default function ZoneDensityPage() {
  const [mode, setMode] = useState<ViewMode>("playback");

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-8">
      <ZoneDensityHeader
        mode={mode}
        onChange={setMode}
        dateLabel={PLAYBACK.dateLabel}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <PlaybackCard />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <PeakOccupancyCard />
            <AvgDwellTimeCard />
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <PlaybackSummary />
          <ZoneBreakdown />
          <PlaybackLogic />
        </aside>
      </div>
    </div>
  );
}
