import { requirePermission } from "@/lib/auth/dal";
import {
  getDeptDistribution,
  getEquipmentMix,
  getHeadcount,
  getRoleDistribution,
  getSigninActivity,
} from "@/lib/analytics/people-activity";
import { HeadcountCards } from "@/components/analytics/headcount-cards";
import { SignInSparkline } from "@/components/analytics/signin-sparkline";
import { DistributionBars } from "@/components/analytics/distribution-bars";
import { EquipmentMixCard } from "@/components/analytics/equipment-mix-card";

export default async function AnalyticsPage() {
  await requirePermission("analytics", "read");

  const [headcount, deptBars, roleBars, signin, equipmentMix] =
    await Promise.all([
      getHeadcount(),
      getDeptDistribution(),
      getRoleDistribution(),
      getSigninActivity(),
      getEquipmentMix(),
    ]);

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="max-w-2xl">
        <h1 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-foreground">
          Analytics
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Workforce composition, sign-in trends, and equipment health at a
          glance.
        </p>
      </header>

      <HeadcountCards stats={headcount} />

      <SignInSparkline points={signin} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DistributionBars
          title="Department"
          subtitle="Headcount by team."
          bars={deptBars}
          accent="sky"
          emptyLabel="No department assignments yet."
        />
        <DistributionBars
          title="Role"
          subtitle="Access tier split."
          bars={roleBars}
          accent="indigo"
        />
        <EquipmentMixCard slices={equipmentMix} />
      </div>
    </div>
  );
}
