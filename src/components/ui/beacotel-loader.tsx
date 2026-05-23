import { Radar } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Full-screen branded loader. Default `variant="overlay"` blurs whatever is
 * underneath; `variant="page"` paints a solid background, suited for
 * route-level loading.tsx fallbacks.
 *
 * Driven entirely by CSS keyframes defined in globals.css (no JS animation
 * loop) so it stays cheap on slow connections.
 */
export function BeacotelLoader({
  variant = "page",
  label = "Loading…",
}: {
  variant?: "overlay" | "page";
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "fixed inset-0 z-[60] grid place-items-center",
        variant === "overlay"
          ? "bg-background/70 backdrop-blur-sm"
          : "bg-background",
      )}
      style={{ animation: "beacon-fade-in 200ms ease-out both" }}
    >
      <div className="flex flex-col items-center gap-7">
        {/* Radar + concentric pulses */}
        <div className="relative grid size-24 place-items-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-primary/40"
              style={{
                animation: "beacon-ping 2.3s ease-out infinite",
                animationDelay: `${i * 0.6}s`,
              }}
            />
          ))}
          <span className="relative grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Radar className="size-7" strokeWidth={1.75} />
          </span>
        </div>

        {/* Wordmark */}
        <div className="text-center">
          <p className="text-[20px] font-semibold tracking-tight text-foreground">
            Beacotel
          </p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {label}
          </p>
        </div>

        {/* Shimmer bar */}
        <div className="relative h-[3px] w-44 overflow-hidden rounded-full bg-secondary">
          <span
            aria-hidden
            className="absolute inset-y-0 -left-1/3 w-1/3 rounded-full bg-primary"
            style={{
              animation: "beacon-shimmer 1.9s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
