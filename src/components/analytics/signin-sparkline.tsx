import { LogIn, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  signinTotals,
  type SigninPoint,
} from "@/lib/analytics/people-activity";

/**
 * Sign-in activity chart for the last 30 days. SVG line + area fill so the
 * page stays dependency-free; viewBox is normalized to (0..1) on the y-axis
 * and (0..points-1) on the x-axis, then scaled via preserveAspectRatio="none".
 */
export function SignInSparkline({ points }: { points: SigninPoint[] }) {
  const totals = signinTotals(points);
  const max = Math.max(1, ...points.map((p) => p.count));

  const width = 1000;
  const height = 220;
  const padTop = 12;
  const padBottom = 24;
  const usableH = height - padTop - padBottom;
  const stepX = points.length > 1 ? width / (points.length - 1) : width;

  const pathD = points
    .map((p, i) => {
      const x = i * stepX;
      const y = padTop + usableH - (p.count / max) * usableH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const areaD =
    pathD +
    ` L${(width).toFixed(2)},${(height - padBottom).toFixed(2)}` +
    ` L0,${(height - padBottom).toFixed(2)} Z`;

  // Highlight the first, midpoint, last day labels.
  const tickIndices = [
    0,
    Math.floor(points.length / 2),
    points.length - 1,
  ];

  return (
    <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-foreground">
            <LogIn className="size-4 text-primary" strokeWidth={2} />
            Sign-In Activity
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Successful logins over the last 30 days.
          </p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <Metric label="Total" value={totals.total.toString()} />
          <Metric label="Last 7d" value={totals.last7.toString()} />
          <Metric
            label="Peak / day"
            value={totals.peak.toString()}
            icon={<TrendingUp className="size-3.5" strokeWidth={2} />}
          />
        </div>
      </header>

      <div className="mt-6">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-[220px] w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id="signin-fill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="oklch(0.26 0.05 256)"
                stopOpacity="0.22"
              />
              <stop
                offset="100%"
                stopColor="oklch(0.26 0.05 256)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          {/* Baseline grid */}
          {[0.25, 0.5, 0.75].map((t) => {
            const y = padTop + usableH * t;
            return (
              <line
                key={t}
                x1={0}
                x2={width}
                y1={y}
                y2={y}
                stroke="oklch(0.92 0.008 250)"
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            );
          })}

          {/* Area under the line */}
          <path d={areaD} fill="url(#signin-fill)" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="oklch(0.26 0.05 256)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* End-of-line dot */}
          {points.length > 0 ? (
            <circle
              cx={(points.length - 1) * stepX}
              cy={
                padTop +
                usableH -
                (points[points.length - 1].count / max) * usableH
              }
              r={5}
              fill="oklch(0.26 0.05 256)"
              stroke="white"
              strokeWidth={2}
            />
          ) : null}
        </svg>

        <div className="mt-2 flex justify-between text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {tickIndices.map((i) => (
            <span key={i}>{points[i] ? shortDay(points[i].date) : ""}</span>
          ))}
        </div>
      </div>
    </Card>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="mt-0.5 flex items-center gap-1 text-[22px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
        {icon}
        {value}
      </span>
    </div>
  );
}

function shortDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
