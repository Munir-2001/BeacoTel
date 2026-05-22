import { Construction } from "lucide-react";

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <div className="grid size-14 place-items-center rounded-xl bg-secondary text-secondary-foreground">
          <Construction className="size-6" strokeWidth={1.75} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {description ?? "This screen is coming next."}
          </p>
        </div>
      </div>
    </div>
  );
}
