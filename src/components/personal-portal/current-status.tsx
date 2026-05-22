"use client";

import { useState } from "react";
import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ME, type ClockStatus } from "@/lib/personal-portal-data";
import { cn } from "@/lib/utils";

export function CurrentStatusBanner() {
  const [status, setStatus] = useState<ClockStatus>(ME.clockStatus);
  const checkedIn = status === "clocked_in";

  return (
    <Card className="relative overflow-hidden rounded-2xl border-border/70 bg-[oklch(0.94_0.012_250)] p-7 shadow-none">
      {/* Decorative timer mark in the corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -bottom-6 text-foreground/[0.04]"
      >
        <Timer className="size-56" strokeWidth={1} />
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[34px] font-semibold leading-none tracking-tight text-foreground">
            Current Status
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider",
                checkedIn
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              )}
            >
              <span
                className={cn(
                  "inline-block size-2 rounded-full",
                  checkedIn ? "bg-emerald-600" : "bg-rose-600"
                )}
              />
              {checkedIn ? "Currently Clocked In" : "Currently Clocked Out"}
            </span>
            <span className="text-sm text-muted-foreground">
              Last action: {ME.lastAction}
            </span>
          </div>
        </div>

        <Button
          onClick={() =>
            setStatus(checkedIn ? "clocked_out" : "clocked_in")
          }
          className="h-14 gap-3 rounded-xl bg-primary px-7 text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
        >
          <Timer className="size-5" strokeWidth={2} />
          {checkedIn ? "Check Out of Shift" : "Check-In for Shift"}
        </Button>
      </div>
    </Card>
  );
}
