import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getCurrentUser, getReadableResources } from "@/lib/auth/dal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authenticates the whole dashboard segment. `getCurrentUser` redirects to
  // /login if there is no valid session or the account is deactivated.
  const [user, readableResources] = await Promise.all([
    getCurrentUser(),
    getReadableResources(),
  ]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar readableResources={readableResources} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={user.name} email={user.email} role={user.role} />
        <main className="min-h-0 flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
