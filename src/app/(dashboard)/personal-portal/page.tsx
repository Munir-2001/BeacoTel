import { PortalPageHeader } from "@/components/personal-portal/page-header";
import { EditProfileCard } from "@/components/personal-portal/edit-profile-card";
import { QuickActions } from "@/components/personal-portal/quick-actions";
import { MyAssetsCard } from "@/components/personal-portal/my-assets-card";
import { getMyProfile } from "@/lib/personal-portal/me";
import { listMyAssets } from "@/lib/personal-portal/my-assets";

export default async function PersonalPortalPage() {
  const [me, myAssets] = await Promise.all([getMyProfile(), listMyAssets()]);
  const firstName = me.name.trim().split(/\s+/)[0] || me.email.split("@")[0];

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PortalPageHeader firstName={firstName} />

      <div className="flex flex-col gap-6">
        <EditProfileCard initial={me} />
        <MyAssetsCard assets={myAssets} />
        <QuickActions />
      </div>
    </div>
  );
}
