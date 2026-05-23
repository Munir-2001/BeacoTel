import Link from "next/link";
import { LockKeyhole } from "lucide-react";

/** Rendered (HTTP 401) whenever `unauthorized()` is thrown — no valid session. */
export default function Unauthorized() {
  return (
    <div className="grid min-h-screen place-items-center bg-muted p-6">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
        <div className="grid size-14 place-items-center rounded-xl bg-secondary text-secondary-foreground">
          <LockKeyhole className="size-7" strokeWidth={1.75} />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold text-foreground">
            Sign in required
          </h1>
          <p className="text-sm text-muted-foreground">
            Your session has expired or you’re not signed in.
          </p>
        </div>
        <Link
          href="/login"
          className="mt-1 text-sm font-medium text-primary hover:underline"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
