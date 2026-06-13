/** Shared RFID-tracking types + display vocab. Runtime-agnostic (no server
 *  imports) so both server modules and client components can use it. */

/** Loose controlled vocabulary for soft assets. Stored as plain text in
 *  rfid_tags.category, so unknown values still round-trip. */
export type RfidCategory = "beverage" | "snack" | "other";

export type RfidReader = {
  id: string;
  label: string;
  location: string | null;
};

/** One physical tagged item (1 tag = 1 item). */
export type RfidTag = {
  id: string;
  /** The RFID tag id (EPC). */
  epc: string;
  productName: string;
  category: string | null;
  readerId: string | null;
  readerLabel: string | null;
  /** True while the item is in the fridge; false once withdrawn. */
  present: boolean;
  lastWithdrawnAt: string | null;
  createdAt: string;
};

/** Direction of a fridge movement event. */
export type MovementKind = "withdrawn" | "returned";

/** One append-only movement record (withdrawal or return) — drives the feed. */
export type WithdrawalEvent = {
  id: number;
  tagId: string | null;
  epc: string;
  productName: string;
  readerLabel: string | null;
  /** 'withdrawn' = left the fridge; 'returned' = put back. */
  kind: MovementKind;
  withdrawnAt: string;
};

export type RfidStats = {
  totalTags: number;
  inFridge: number;
  withdrawnToday: number;
};

export const RFID_CATEGORY_OPTIONS: { value: RfidCategory; label: string }[] = [
  { value: "beverage", label: "Beverage" },
  { value: "snack", label: "Snack" },
  { value: "other", label: "Other" },
];

export function rfidCategoryLabel(category: string | null): string {
  if (!category) return "—";
  const found = RFID_CATEGORY_OPTIONS.find((o) => o.value === category);
  return found ? found.label : category[0].toUpperCase() + category.slice(1);
}
