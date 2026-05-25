/**
 * Seeds demo rows into public.audit_logs so the System Logs page has data to
 * render. Uses the service-role client because audit_logs has no INSERT
 * policy by design.
 *
 * Run from the Beacotel directory:
 *   node --env-file=.env.local scripts/seed-audit-logs.mjs
 *
 * Re-running is safe — each invocation just appends another batch. Wipe with:
 *   delete from public.audit_logs where actor_email like '%@unitn.it';
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Resolve the seeded staff so the rows reference real actors.
const { data: people, error: peopleErr } = await admin
  .from("profiles")
  .select("id, email, name")
  .in("email", [
    "marcus.vane@unitn.it",
    "elena.rodriguez@unitn.it",
    "julian.thorne@unitn.it",
    "sasha.kim@unitn.it",
  ]);

if (peopleErr) {
  console.error("Could not fetch demo profiles:", peopleErr.message);
  process.exit(1);
}

const byEmail = Object.fromEntries(people.map((p) => [p.email, p]));
const julian = byEmail["julian.thorne@unitn.it"]; // admin
const marcus = byEmail["marcus.vane@unitn.it"]; // manager
const elena = byEmail["elena.rodriguez@unitn.it"]; // staff
const sasha = byEmail["sasha.kim@unitn.it"]; // staff

if (!julian || !marcus || !elena || !sasha) {
  console.error(
    "Some demo users are missing — run scripts/seed-staff.mjs first.",
  );
  process.exit(1);
}

// Idempotency for the inventory + maintenance demo rows: they use synthetic
// resource_ids (asset codes) that never collide with real profile UUIDs, so
// it's safe to clear them on every run. Profile-resource rows (logins, role
// changes) just append — running this script multiple times adds more history
// to look at, which is fine for a demo.
const DEMO_RESOURCE_IDS = [
  // Today
  "AST-VAC-V15-07",
  "MINIBAR-402-CHARD",
  "AST-LFT-02",
  "AST-HVAC-04",
  "LIN-SUITE-411",
  "AST-401-SH",
  "manager:maintenance:update",
  // Yesterday
  "MINIBAR-208-CHAMP",
  "AST-LFT-03",
  "AST-MOP-07",
  "AST-POOL-FLT",
  "staff:maintenance:create",
];
await admin.from("audit_logs").delete().in("resource_id", DEMO_RESOURCE_IDS);

// Helper: minutes ago → ISO timestamp.
const ago = (minutes) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

const events = [
  // --- Today ---------------------------------------------------------------
  {
    actor_user_id: julian.id,
    actor_email: julian.email,
    action: "login.success",
    resource_type: "profile",
    resource_id: julian.id,
    occurred_at: ago(8),
  },
  {
    actor_user_id: marcus.id,
    actor_email: marcus.email,
    action: "login.success",
    resource_type: "profile",
    resource_id: marcus.id,
    occurred_at: ago(45),
  },
  {
    actor_user_id: julian.id,
    actor_email: julian.email,
    action: "user.role_change",
    resource_type: "profile",
    resource_id: marcus.id,
    old_values: { role: "staff" },
    new_values: { role: "manager" },
    occurred_at: ago(60),
  },
  {
    actor_user_id: julian.id,
    actor_email: julian.email,
    action: "staff.update",
    resource_type: "profile",
    resource_id: elena.id,
    old_values: { department: "concierge" },
    new_values: { department: "security" },
    occurred_at: ago(95),
  },
  {
    actor_user_id: marcus.id,
    actor_email: marcus.email,
    action: "profile.self_update",
    resource_type: "profile",
    resource_id: marcus.id,
    old_values: { name: "Marcus V." },
    new_values: { name: "Marcus Vane" },
    occurred_at: ago(150),
  },
  {
    actor_user_id: julian.id,
    actor_email: julian.email,
    action: "permission.grant",
    resource_type: "permission",
    resource_id: "manager:analytics:read",
    new_values: { role: "manager", resource: "analytics", action: "read" },
    occurred_at: ago(180),
  },
  // --- Yesterday -----------------------------------------------------------
  {
    actor_user_id: sasha.id,
    actor_email: sasha.email,
    action: "login.success",
    resource_type: "profile",
    resource_id: sasha.id,
    occurred_at: ago(60 * 18),
  },
  {
    actor_user_id: julian.id,
    actor_email: julian.email,
    action: "user.set_active",
    resource_type: "profile",
    resource_id: sasha.id,
    new_values: { is_active: false },
    occurred_at: ago(60 * 20),
  },
  {
    actor_user_id: julian.id,
    actor_email: julian.email,
    action: "user.set_active",
    resource_type: "profile",
    resource_id: sasha.id,
    new_values: { is_active: true },
    occurred_at: ago(60 * 20 + 15),
  },
  {
    actor_user_id: julian.id,
    actor_email: julian.email,
    action: "staff.create",
    resource_type: "profile",
    resource_id: elena.id,
    new_values: {
      email: elena.email,
      name: elena.name,
      role: "staff",
      department: "security",
    },
    occurred_at: ago(60 * 26),
  },
  {
    actor_user_id: julian.id,
    actor_email: julian.email,
    action: "permission.revoke",
    resource_type: "permission",
    resource_id: "staff:inventory:create",
    new_values: { role: "staff", resource: "inventory", action: "create" },
    occurred_at: ago(60 * 30),
  },
  // --- Two days back -------------------------------------------------------
  {
    actor_user_id: marcus.id,
    actor_email: marcus.email,
    action: "staff.update",
    resource_type: "profile",
    resource_id: sasha.id,
    old_values: { employee_id: null },
    new_values: { employee_id: "EMP-00099" },
    occurred_at: ago(60 * 50),
  },
  {
    actor_user_id: julian.id,
    actor_email: julian.email,
    action: "login.success",
    resource_type: "profile",
    resource_id: julian.id,
    occurred_at: ago(60 * 52),
  },

  // --- Inventory + Maintenance + Security: demo activity so the System Logs
  //     page renders rich rose / emerald / navy rows interleaved with staff
  //     activity. These mirror the visual rhythm of the original mock and
  //     stop being needed once the equipment + inventory modules ship and
  //     start writing their own real rows via recordAudit(). --------------------
  {
    actor_user_id: julian.id,
    actor_email: julian.email,
    action: "inventory.assigned",
    resource_type: "inventory",
    resource_id: "AST-VAC-V15-07",
    new_values: { item: "Dyson V15 Vacuum", to: "Elena Rodriguez" },
    occurred_at: ago(20),
  },
  {
    actor_user_id: sasha.id,
    actor_email: sasha.email,
    action: "inventory.removed",
    resource_type: "inventory",
    resource_id: "MINIBAR-402-CHARD",
    new_values: { item: "1× Chardonnay", location: "Room 402 Minibar" },
    occurred_at: ago(55),
  },
  {
    actor_user_id: julian.id,
    actor_email: julian.email,
    action: "equipment.inspection_completed",
    resource_type: "equipment",
    resource_id: "AST-LFT-02",
    new_values: { equipment: "Service Lift A", by: "Julian Thorne" },
    occurred_at: ago(90),
  },
  {
    actor_user_id: marcus.id,
    actor_email: marcus.email,
    action: "equipment.maintenance_started",
    resource_type: "equipment",
    resource_id: "AST-HVAC-04",
    new_values: { equipment: "HVAC Unit 4-East", reason: "scheduled service" },
    occurred_at: ago(115),
  },
  {
    actor_user_id: elena.id,
    actor_email: elena.email,
    action: "inventory.added",
    resource_type: "inventory",
    resource_id: "LIN-SUITE-411",
    new_values: { item: "Linen Bundle (Suite 411)", location: "Housekeeping Cart 3" },
    occurred_at: ago(170),
  },
  {
    actor_user_id: julian.id,
    actor_email: julian.email,
    action: "equipment.status_change",
    resource_type: "equipment",
    resource_id: "AST-401-SH",
    old_values: { status: "maintenance" },
    new_values: { status: "operational" },
    occurred_at: ago(220),
  },
  {
    actor_user_id: julian.id,
    actor_email: julian.email,
    action: "permission.grant",
    resource_type: "permission",
    resource_id: "manager:maintenance:update",
    new_values: { role: "manager", resource: "maintenance", action: "update" },
    occurred_at: ago(270),
  },
  // --- Yesterday: more variety -------------------------------------------------
  {
    actor_user_id: sasha.id,
    actor_email: sasha.email,
    action: "inventory.removed",
    resource_type: "inventory",
    resource_id: "MINIBAR-208-CHAMP",
    new_values: { item: "1× Champagne", location: "Room 208 Minibar" },
    occurred_at: ago(60 * 16),
  },
  {
    actor_user_id: marcus.id,
    actor_email: marcus.email,
    action: "equipment.inspection_completed",
    resource_type: "equipment",
    resource_id: "AST-LFT-03",
    new_values: { equipment: "Service Lift B", by: "Marcus Vane" },
    occurred_at: ago(60 * 19),
  },
  {
    actor_user_id: elena.id,
    actor_email: elena.email,
    action: "inventory.assigned",
    resource_type: "inventory",
    resource_id: "AST-MOP-07",
    new_values: { item: "Industrial Mop Set", to: "Sasha Kim" },
    occurred_at: ago(60 * 23),
  },
  {
    actor_user_id: julian.id,
    actor_email: julian.email,
    action: "equipment.maintenance_started",
    resource_type: "equipment",
    resource_id: "AST-POOL-FLT",
    new_values: { equipment: "Pool Filter Unit", reason: "monthly cleaning" },
    occurred_at: ago(60 * 27),
  },
  {
    actor_user_id: julian.id,
    actor_email: julian.email,
    action: "permission.revoke",
    resource_type: "permission",
    resource_id: "staff:maintenance:create",
    new_values: { role: "staff", resource: "maintenance", action: "create" },
    occurred_at: ago(60 * 32),
  },
];

const { error: insertErr, count } = await admin
  .from("audit_logs")
  .insert(events, { count: "exact" });

if (insertErr) {
  console.error("Insert failed:", insertErr.message);
  process.exit(1);
}

console.log(`Inserted ${count ?? events.length} audit rows.`);
