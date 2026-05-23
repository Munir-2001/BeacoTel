import Link from "next/link";
import { ShieldX } from "lucide-react";

/** Rendered (HTTP 403) whenever `forbidden()` is thrown — wrong role/permission. */
export default function Forbidden() {
  return (
    <div className="grid min-h-screen place-items-center bg-muted p-6">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
        <div className="grid size-14 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <ShieldX className="size-7" strokeWidth={1.75} />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold text-foreground">
            Access denied
          </h1>
          <p className="text-sm text-muted-foreground">
            Your role doesn’t have permission to view this page. If you believe
            this is a mistake, contact your administrator.
          </p>
        </div>
        <Link
          href="/"
          className="mt-1 text-sm font-medium text-primary hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
