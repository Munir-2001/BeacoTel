import Link from "next/link";
import { ArrowLeft, Radar, ShieldX } from "lucide-react";

/** Rendered (HTTP 403) whenever `forbidden()` is thrown — wrong role/permission. */
export default function Forbidden() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <Link
          href="/"
          aria-label="Beacotel home"
          className="flex items-center gap-3"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
            <Radar className="size-6" strokeWidth={1.75} />
          </span>
          <div className="text-left">
            <p className="text-[20px] font-semibold leading-tight tracking-tight text-foreground">
              Beacotel
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              VDA Telkonet
            </p>
          </div>
        </Link>

        <div className="mt-10 grid size-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldX className="size-8" strokeWidth={1.75} />
        </div>

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-destructive">
          403 · Access Denied
        </p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-foreground">
          You don&rsquo;t have permission for this page.
        </h1>
        <p className="mt-3 max-w-sm text-[15px] text-muted-foreground">
          Your role isn&rsquo;t allowed to open this resource. If you think this
          is a mistake, ask an administrator to update your access in RBAC
          Settings.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <ArrowLeft className="size-4" strokeWidth={2} />
            Back to dashboard
          </Link>
          <Link
            href="/personal-portal"
            className="inline-flex h-11 items-center rounded-xl bg-secondary px-5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            My Profile
          </Link>
        </div>
      </div>
    </main>
  );
}
