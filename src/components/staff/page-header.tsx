import Link from "next/link";
import { ChevronRight, Download, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StaffPageHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-6">
      <div className="max-w-2xl">
        <nav className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Link href="/staff-directory" className="hover:text-foreground">
            Directory
          </Link>
          <ChevronRight className="size-3" strokeWidth={2.5} />
          <span className="text-foreground/80">Global Staff List</span>
        </nav>
        <h1 className="mt-3 text-[34px] font-semibold leading-[1.1] tracking-tight text-foreground">
          Staff Directory
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-muted-foreground">
          Oversee access levels and monitor staff movement across the Grand Arch
          Regency estate.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          className="h-12 gap-2 rounded-xl bg-card px-5 text-sm font-medium text-foreground shadow-sm ring-1 ring-border hover:bg-muted"
        >
          <Download className="size-4" strokeWidth={1.75} />
          Export
        </Button>
        <Button
          onClick={onAdd}
          className="h-12 gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <UserPlus className="size-4" strokeWidth={2} />
          Add New Staff
        </Button>
      </div>
    </header>
  );
}
