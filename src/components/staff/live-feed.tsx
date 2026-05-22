import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LIVE_FEED } from "@/lib/staff-data";
import { cn } from "@/lib/utils";

export function LiveFeed() {
  return (
    <Card className="flex flex-col rounded-2xl border-border/70 bg-card p-6 shadow-none">
      <h3 className="text-[18px] font-semibold tracking-tight text-foreground">
        Live Feed
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Staff arrivals and role changes
      </p>

      <ul className="mt-5 flex-1 space-y-4">
        {LIVE_FEED.map((item) => (
          <li key={item.id} className="flex gap-3">
            <span
              className={cn(
                "mt-1.5 inline-block size-2 shrink-0 rounded-full",
                item.tone === "danger"
                  ? "bg-red-500"
                  : item.tone === "info"
                    ? "bg-sky-500"
                    : "bg-foreground"
              )}
            />
            <div className="text-sm">
              <p className="text-foreground">
                <span className="font-semibold">{item.title}</span>
                {item.subject && (
                  <>
                    {" "}
                    <span className="text-foreground/80">{item.subject}</span>
                  </>
                )}
                {item.detail && !item.subject && (
                  <> <span className="text-foreground/80">{item.detail}</span></>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.time}
                {item.subject && item.detail && (
                  <> • {item.detail}</>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <Button
        variant="secondary"
        className="mt-6 h-11 w-full rounded-xl bg-muted text-sm font-medium text-foreground hover:bg-muted/80"
      >
        Refresh Live Feed
      </Button>
    </Card>
  );
}
