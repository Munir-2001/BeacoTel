"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

/**
 * Sign in with email + password. Used as a form action via `useActionState`.
 * On success it redirects (so it never "returns" in the success case).
 */
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const requested = String(formData.get("redirectTo") ?? "");
  // Only allow same-site relative redirects — never an attacker-supplied URL.
  // "/" resolves to the user's role-appropriate landing page.
  const redirectTo =
    requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/";

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    // Deliberately vague — do not reveal whether the email exists.
    return { error: "Invalid email or password." };
  }

  // Best-effort: record the login. Never block sign-in on this.
  await supabase
    .from("profiles")
    .update({ last_login: new Date().toISOString() })
    .eq("id", data.user.id);

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

/** Sign out and return to the login screen. */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
