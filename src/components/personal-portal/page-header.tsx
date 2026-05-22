export function PortalPageHeader({ firstName }: { firstName: string }) {
  return (
    <header>
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-primary">
        Personal Portal
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back, {firstName}
      </p>
    </header>
  );
}
