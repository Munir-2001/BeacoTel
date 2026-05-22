import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RBAC_DEFINITIONS } from "@/lib/staff-data";

export function RbacDefinitions() {
  return (
    <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-none">
      <h3 className="text-[18px] font-semibold tracking-tight text-foreground">
        RBAC Role Definitions
      </h3>

      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-3">
        {RBAC_DEFINITIONS.map((r) => (
          <div key={r.role}>
            <p
              className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground`}
            >
              <span className={`inline-block size-2 rounded-full ${r.color}`} />
              {r.role}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/85">
              {r.description}
            </p>
          </div>
        ))}
      </div>

      <button className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        View Full Permission Matrix
        <ArrowUpRight className="size-4" strokeWidth={2} />
      </button>
    </Card>
  );
}
