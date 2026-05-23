import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const { redirectTo, error } = await searchParams;

  return (
    <div className="flex w-full max-w-[1040px] flex-col items-center">
      <div className="flex w-full min-h-[620px] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_24px_60px_-20px_rgba(15,30,60,0.28)]">
        <AuthBrandPanel />
        <LoginForm
          redirectTo={redirectTo ?? "/"}
          notice={
            error === "account-disabled"
              ? "This account has been deactivated. Contact an administrator."
              : null
          }
        />
      </div>
      <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/55">
        Beacotel Operations · © 2026 Grand Axis Hotel
      </p>
    </div>
  );
}
