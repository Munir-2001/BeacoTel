"use client";

import { useState } from "react";
import { StaffPageHeader } from "@/components/staff/page-header";
import { StaffStats } from "@/components/staff/stat-cards";
import { StaffTable } from "@/components/staff/staff-table";
import {
  EditStaffSheet,
  rowToDraft,
  type StaffDraft,
} from "@/components/staff/edit-staff-sheet";
import type { StaffRow, StaffStats as StaffStatsData } from "@/lib/staff/admin";

export function StaffDirectoryClient({
  rows,
  stats,
  currentUserId,
  canCreate,
  canChangeRole,
  canChangeDepartment,
}: {
  rows: StaffRow[];
  stats: StaffStatsData;
  currentUserId: string;
  canCreate: boolean;
  canChangeRole: boolean;
  canChangeDepartment: boolean;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<StaffDraft | undefined>(undefined);

  function openCreate() {
    setEditing(undefined);
    setSheetOpen(true);
  }
  function openEdit(row: StaffRow) {
    setEditing(rowToDraft(row));
    setSheetOpen(true);
  }

  return (
    <>
      <StaffPageHeader onAdd={openCreate} canCreate={canCreate} />
      <StaffStats stats={stats} />
      <StaffTable
        rows={rows}
        currentUserId={currentUserId}
        canChangeRole={canChangeRole}
        canChangeDepartment={canChangeDepartment}
        onRowOpen={openEdit}
      />
      <EditStaffSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={editing}
        currentUserId={currentUserId}
        canChangeRole={canChangeRole}
        onSaved={() => setSheetOpen(false)}
      />
    </>
  );
}
