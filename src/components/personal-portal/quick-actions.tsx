import { BriefcaseMedical, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <ActionCard
        title="Benefits Portal"
        subtitle="Insurance and wellness"
        icon={<BriefcaseMedical className="size-6" strokeWidth={1.75} />}
        tint="bg-emerald-50/80"
        iconBg="bg-emerald-100"
        iconFg="text-emerald-700"
      />
      <ActionCard
        title="Payroll Docs"
        subtitle="Paystubs and Tax Info"
        icon={<Banknote className="size-6" strokeWidth={1.75} />}
        tint="bg-sky-50/80"
        iconBg="bg-sky-100"
        iconFg="text-sky-700"
      />
    </div>
  );
}

function ActionCard({
  title,
  subtitle,
  icon,
  tint,
  iconBg,
  iconFg,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tint: string;
  iconBg: string;
  iconFg: string;
}) {
  return (
    <button
      className={cn(
        "group flex flex-col items-start gap-6 rounded-2xl border border-border/70 p-5 text-left transition-colors hover:border-border",
        tint
      )}
    >
      <div className={cn("grid size-12 place-items-center rounded-xl", iconBg, iconFg)}>
        {icon}
      </div>
      <div>
        <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </button>
  );
}
