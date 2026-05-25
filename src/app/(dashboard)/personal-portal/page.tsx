import { PortalPageHeader } from "@/components/personal-portal/page-header";
import { CurrentStatusBanner } from "@/components/personal-portal/current-status";
import { EditProfileCard } from "@/components/personal-portal/edit-profile-card";
import { QuickActions } from "@/components/personal-portal/quick-actions";
import { WeeklyScheduleCard } from "@/components/personal-portal/weekly-schedule";
import { MyAssetsCard } from "@/components/personal-portal/my-assets-card";
import { getMyProfile } from "@/lib/personal-portal/me";
import { listMyAssets } from "@/lib/personal-portal/my-assets";

export default async function PersonalPortalPage() {
  const [me, myAssets] = await Promise.all([getMyProfile(), listMyAssets()]);
  const firstName = me.name.trim().split(/\s+/)[0] || me.email.split("@")[0];

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PortalPageHeader firstName={firstName} />
      <CurrentStatusBanner />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <EditProfileCard initial={me} />
          <MyAssetsCard assets={myAssets} />
          <QuickActions />
        </div>
        <WeeklyScheduleCard />
      </div>
    </div>
  );
}
