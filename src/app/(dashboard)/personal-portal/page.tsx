import { PortalPageHeader } from "@/components/personal-portal/page-header";
import { CurrentStatusBanner } from "@/components/personal-portal/current-status";
import { EditProfileCard } from "@/components/personal-portal/edit-profile-card";
import { QuickActions } from "@/components/personal-portal/quick-actions";
import { WeeklyScheduleCard } from "@/components/personal-portal/weekly-schedule";
import { ME } from "@/lib/personal-portal-data";

export default function PersonalPortalPage() {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-8">
      <PortalPageHeader firstName={ME.firstName} />
      <CurrentStatusBanner />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <EditProfileCard />
          <QuickActions />
        </div>
        <WeeklyScheduleCard />
      </div>
    </div>
  );
}
