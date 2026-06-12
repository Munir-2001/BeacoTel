import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AssetGuardProvider } from "@/components/inventory/asset-guard-provider";
import {
  getCurrentUser,
  getReadableResources,
  hasPermission,
} from "@/lib/auth/dal";
import { getMyRecentActivity } from "@/lib/audit/me";
import { listTrackedAssets } from "@/lib/inventory/list";
import {
  listRecentAssetAlerts,
  type AssetAlertEvent,
} from "@/lib/inventory/alert-actions";
import type { TrackedAsset } from "@/lib/inventory/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authenticates the whole dashboard segment. `getCurrentUser` redirects to
  // /login if there is no valid session or the account is deactivated.
  const [user, readableResources, activity, guardData] = await Promise.all([
    getCurrentUser(),
    getReadableResources(),
    getMyRecentActivity(5),
    loadAssetGuardData(),
  ]);

  return (
    <AssetGuardProvider
      trackedAssets={guardData.trackedAssets}
      initialAlerts={guardData.initialAlerts}
    >
      <DashboardShell
        user={user}
        readableResources={readableResources}
        activity={activity}
      >
        {children}
      </DashboardShell>
    </AssetGuardProvider>
  );
}

/**
 * Tracked assets + recent alerts for the app-wide asset guard. Users without
 * inventory access get an empty guard (no subscription, no alarms) instead
 * of a 403 on every page.
 */
async function loadAssetGuardData(): Promise<{
  trackedAssets: TrackedAsset[];
  initialAlerts: AssetAlertEvent[];
}> {
  if (!(await hasPermission("inventory", "read"))) {
    return { trackedAssets: [], initialAlerts: [] };
  }
  const [trackedAssets, initialAlerts] = await Promise.all([
    listTrackedAssets(),
    listRecentAssetAlerts(),
  ]);
  return { trackedAssets, initialAlerts };
}
