import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentUser, getReadableResources } from "@/lib/auth/dal";
import { getMyRecentActivity } from "@/lib/audit/me";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authenticates the whole dashboard segment. `getCurrentUser` redirects to
  // /login if there is no valid session or the account is deactivated.
  const [user, readableResources, activity] = await Promise.all([
    getCurrentUser(),
    getReadableResources(),
    getMyRecentActivity(5),
  ]);

  return (
    <DashboardShell
      user={user}
      readableResources={readableResources}
      activity={activity}
    >
      {children}
    </DashboardShell>
  );
}
