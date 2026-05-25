"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Light/Dark toggle. Mirrors `<html>.classList.contains("dark")` after mount
 * so SSR stays consistent (the initial class is set by the inline script in
 * the root layout, before React hydrates).
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Storage may be unavailable (private mode, quota) — preference just
      // won't persist across reloads.
    }
    setIsDark(next);
  }

  // Render a stable, mode-agnostic icon on the server / before hydration so
  // markup matches exactly. Once mounted, swap to the correct one.
  const Icon = !mounted ? Sun : isDark ? Sun : Moon;
  const label = !mounted
    ? "Toggle theme"
    : isDark
      ? "Switch to light mode"
      : "Switch to dark mode";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={toggle}
      className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Icon className="size-[18px]" strokeWidth={1.75} />
    </button>
  );
}
