import { hasPermission, requirePermission } from "@/lib/auth/dal";
import {
  getRfidStats,
  listReaders,
  listRecentWithdrawals,
  listTags,
} from "@/lib/rfid/list";
import { PageHeader } from "@/components/rfid/page-header";
import { WithdrawalFeed } from "@/components/rfid/withdrawal-feed";
import { TagRegistry } from "@/components/rfid/tag-registry";

export default async function RfidTrackingPage() {
  await requirePermission("rfid-tracking", "read");

  const [stats, tags, readers, withdrawals, canEdit] = await Promise.all([
    getRfidStats(),
    listTags(),
    listReaders(),
    listRecentWithdrawals(),
    hasPermission("rfid-tracking", "update"),
  ]);

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader stats={stats} />
      <WithdrawalFeed initial={withdrawals} />
      <TagRegistry tags={tags} readers={readers} canEdit={canEdit} />
    </div>
  );
}
