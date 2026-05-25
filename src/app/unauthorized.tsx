import Link from "next/link";
import { LockKeyhole, LogIn, Radar } from "lucide-react";

/** Rendered (HTTP 401) whenever `unauthorized()` is thrown — no valid session. */
export default function Unauthorized() {
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

        <div className="mt-10 grid size-16 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
          <LockKeyhole className="size-8" strokeWidth={1.75} />
        </div>

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          401 · Sign-in Required
        </p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-foreground">
          Your session ended.
        </h1>
        <p className="mt-3 max-w-sm text-[15px] text-muted-foreground">
          For your security, you&rsquo;ve been signed out. Sign in again to
          pick up where you left off.
        </p>

        <Link
          href="/login"
          className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <LogIn className="size-4" strokeWidth={2} />
          Go to sign in
        </Link>
      </div>
    </main>
  );
}
