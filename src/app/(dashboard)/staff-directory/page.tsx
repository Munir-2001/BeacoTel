"use client";

import { useState } from "react";
import { StaffPageHeader } from "@/components/staff/page-header";
import { StaffStats } from "@/components/staff/stat-cards";
import { StaffTable } from "@/components/staff/staff-table";
import { RbacDefinitions } from "@/components/staff/rbac-definitions";
import { LiveFeed } from "@/components/staff/live-feed";
import {
  EditStaffSheet,
  memberToDraft,
  type StaffDraft,
} from "@/components/staff/edit-staff-sheet";
import type { StaffMember } from "@/lib/staff-data";

export default function StaffDirectoryPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<StaffDraft | undefined>(undefined);

  function openCreate() {
    setEditing(undefined);
    setSheetOpen(true);
  }
  function openEdit(member: StaffMember) {
    setEditing(memberToDraft(member));
    setSheetOpen(true);
  }

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-8">
      <StaffPageHeader onAdd={openCreate} />
      <StaffStats />
      <StaffTable onRowOpen={openEdit} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <RbacDefinitions />
        <LiveFeed />
      </div>

      <EditStaffSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={editing}
        onSave={() => setSheetOpen(false)}
        onDeactivate={() => setSheetOpen(false)}
      />
    </div>
  );
}
