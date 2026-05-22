import { Calendar, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ME, WEEKLY_SCHEDULE, type Shift } from "@/lib/personal-portal-data";
import { cn } from "@/lib/utils";

export function WeeklyScheduleCard() {
  const pct = Math.round((ME.hoursLogged / ME.hoursTarget) * 100);

  return (
    <Card className="flex h-full flex-col rounded-2xl border-border/70 bg-card p-6 shadow-none">
      <header className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[20px] font-semibold tracking-tight text-foreground">
          <Calendar className="size-5 text-foreground/70" strokeWidth={1.75} />
          Weekly Schedule
        </h2>
        <button className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-primary">
          View Full
        </button>
      </header>

      <ul className="mt-5 flex-1 space-y-2.5">
        {WEEKLY_SCHEDULE.map((shift) => (
          <ShiftRow key={shift.id} shift={shift} />
        ))}
      </ul>

      <hr className="my-5 border-border/70" />

      <div className="rounded-xl bg-secondary/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Total Hours
            </p>
            <p className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight text-foreground">
              {ME.hoursLogged.toFixed(1)} / {ME.hoursTarget.toFixed(1)}
            </p>
          </div>
          <ProgressRing pct={pct} />
        </div>
      </div>
    </Card>
  );
}

function ShiftRow({ shift }: { shift: Shift }) {
  return (
    <li
      className={cn(
        "flex items-center gap-4 rounded-xl border-l-[3px] px-4 py-3 transition-colors",
        shift.isToday
          ? "border-primary bg-secondary/70"
          : "border-transparent bg-muted/40 hover:bg-muted/70"
      )}
    >
      <div className="flex w-12 shrink-0 flex-col items-start">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {shift.dateLabel.split(" ")[0]}
        </span>
        <span className="text-[22px] font-semibold leading-none text-foreground">
          {shift.dateLabel.split(" ")[1]}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{shift.type}</p>
        {shift.timeRange && (
          <p className="text-xs text-muted-foreground">
            {shift.timeRange}
            {shift.location ? ` • ${shift.location}` : ""}
          </p>
        )}
        {shift.note && (
          <p className="text-xs text-muted-foreground">{shift.note}</p>
        )}
      </div>
      {shift.isToday ? (
        <span className="text-xs font-semibold text-foreground">Today</span>
      ) : (
        <ChevronRight className="size-4 text-muted-foreground" strokeWidth={2} />
      )}
    </li>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const radius = 22;
  const stroke = 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="relative grid size-14 place-items-center">
      <svg className="size-14 -rotate-90" viewBox="0 0 56 56">
        <circle
          cx="28"
          cy="28"
          r={radius}
          stroke="oklch(0.94 0.012 250)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          stroke="currentColor"
          className="text-primary"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="none"
        />
      </svg>
      <span className="absolute text-[10px] font-semibold text-foreground">
        {pct}%
      </span>
    </div>
  );
}
