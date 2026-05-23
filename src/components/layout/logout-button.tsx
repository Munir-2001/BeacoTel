"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/auth/actions";
import { BeacotelLoader } from "@/components/ui/beacotel-loader";

/**
 * Logout button that shows the branded overlay between the click and the
 * redirect to /login. Calls the server action inside a transition so React
 * keeps the UI responsive while the server signs the user out.
 */
export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logout();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/75 hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut className="size-[18px] text-foreground/55" strokeWidth={1.75} />
        Log Out
      </button>
      {pending ? <BeacotelLoader variant="overlay" label="Signing out…" /> : null}
    </>
  );
}
