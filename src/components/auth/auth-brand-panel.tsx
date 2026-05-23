import { Radar } from "lucide-react";

/**
 * Navy left-hand panel of the login screen — brand mark + concierge quote
 * over a subtle architectural grid. Static (Server Component).
 */
export function AuthBrandPanel() {
  return (
    <div className="relative hidden w-[44%] shrink-0 flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground md:flex">
      {/* Diagonal light sheen */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(150deg,rgba(255,255,255,0.10),transparent_55%)]" />
      {/* Architectural grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "76px 76px",
        }}
      />
      {/* Soft glow lower-left */}
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-white/5 blur-2xl" />

      {/* Brand mark */}
      <div className="relative flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <Radar className="size-7" strokeWidth={1.75} />
          <span className="text-[22px] font-semibold tracking-tight">
            Beacotel
          </span>
        </div>
        <span className="pl-[38px] text-[11px] font-medium uppercase tracking-[0.22em] text-primary-foreground/55">
          Management Suite
        </span>
      </div>

      {/* Concierge quote */}
      <div className="relative">
        <p className="max-w-[18ch] text-[26px] font-semibold leading-snug tracking-tight">
          &ldquo;Precision in operations is the foundation of luxury
          service.&rdquo;
        </p>
        <div className="mt-5 flex items-center gap-3">
          <span className="h-px w-9 bg-primary-foreground/40" />
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary-foreground/55">
            The Operations Concierge
          </span>
        </div>
      </div>
    </div>
  );
}
