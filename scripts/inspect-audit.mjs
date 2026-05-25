/**
 * Quick read-only sanity check. Run with:
 *   node --env-file=.env.local scripts/inspect-audit.mjs
 */
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data, error } = await admin
  .from("audit_logs")
  .select("action, resource_id, occurred_at, new_values")
  .order("occurred_at", { ascending: false })
  .limit(50);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const counts = {};
for (const r of data) {
  const cat = r.action.startsWith("permission.")
    ? "security"
    : r.action.startsWith("equipment.")
      ? "maintenance"
      : r.action.startsWith("inventory.")
        ? "inventory"
        : "staff";
  counts[cat] = (counts[cat] ?? 0) + 1;
  console.log(
    `${r.occurred_at.slice(0, 16).replace("T", " ")}  [${cat.padEnd(11)}]  ${r.action}`,
  );
}
console.log("");
console.log("Category counts:", counts);
