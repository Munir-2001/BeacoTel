import { PageHeader } from "@/components/inventory/page-header";
import { FloorplanCard } from "@/components/inventory/floorplan-card";
import { AssetRegistry } from "@/components/inventory/asset-registry";

export default function InventoryPage() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 p-8">
      <PageHeader />
      <FloorplanCard />
      <AssetRegistry />
    </div>
  );
}
