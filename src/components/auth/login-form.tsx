"use client";

import { useActionState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { login, type LoginState } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";

const initialState: LoginState = { error: null };

const fieldClass =
  "h-12 rounded-lg border-transparent bg-muted px-4 text-sm text-foreground " +
  "placeholder:text-muted-foreground/55 focus-visible:border-ring focus-visible:bg-background";

const labelClass =
  "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-foreground/65";

export function LoginForm({
  redirectTo,
  notice,
}: {
  redirectTo: string;
  notice: string | null;
}) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex w-full flex-col px-8 py-10 sm:px-12 sm:py-14 md:w-[56%]">
      <header className="mb-7">
        <h1 className="text-[30px] font-bold leading-tight tracking-tight text-foreground">
          Welcome Back
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Please enter your credentials to access the operations dashboard.
        </p>
      </header>

      {notice ? (
        <p className="mb-5 flex items-start gap-2 rounded-lg bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
          {notice}
        </p>
      ) : null}

      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div className="space-y-2">
          <label htmlFor="email" className={labelClass}>
            <Mail className="size-3.5" strokeWidth={2} />
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@vdatelkonet.com"
            className={fieldClass}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className={labelClass}>
              <Lock className="size-3.5" strokeWidth={2} />
              Password
            </label>
            <button
              type="button"
              className="text-xs font-medium text-primary transition-colors hover:underline"
            >
              Forgot Password?
            </button>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className={fieldClass}
          />
        </div>

        <label className="flex w-fit cursor-pointer items-center gap-2.5 select-none">
          <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
            <input type="checkbox" name="remember" className="peer sr-only" />
            <span className="absolute inset-0 rounded-full bg-secondary transition-colors peer-checked:bg-primary" />
            <span className="absolute left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
          </span>
          <span className="text-sm text-foreground/75">Remember Me</span>
        </label>

        {state.error ? (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" strokeWidth={2} />
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="group mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-primary/85 to-primary text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:to-primary/85 focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              Signing in…
            </>
          ) : (
            <>
              Sign In to Suite
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={2}
              />
            </>
          )}
        </button>
      </form>

      <footer className="mt-8 border-t border-border pt-6">
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Protected by hardware-level encryption.&nbsp; · &nbsp;Access
          restricted to authorized personnel only.
        </p>
        <div className="mt-4 flex items-center justify-center gap-7">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/65">
            <Shield className="size-3.5" strokeWidth={2} />
            Secure Core
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/65">
            <ShieldCheck className="size-3.5" strokeWidth={2} />
            Beacotel Global
          </span>
        </div>
      </footer>
    </div>
  );
}
