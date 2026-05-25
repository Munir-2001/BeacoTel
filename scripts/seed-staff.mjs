/**
 * Seeds a handful of demo staff accounts via the Supabase Auth Admin API.
 *
 * Run from the Beacotel directory:
 *   node --env-file=.env.local scripts/seed-staff.mjs
 *
 * Safe to re-run: existing accounts (matched by email) get their profile
 * patched in place. The OLD_EMAILS list at the bottom deletes earlier
 * iterations of the same demo users so the directory stays clean.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_PASSWORD = "12345678";

const SEED = [
  {
    email: "marcus.vane@unitn.it",
    name: "Marcus Vane",
    role: "manager",
    department: "front_desk",
  },
  {
    email: "elena.rodriguez@unitn.it",
    name: "Elena Rodriguez",
    role: "staff",
    department: "security",
  },
  {
    email: "julian.thorne@unitn.it",
    name: "Julian Thorne",
    role: "admin",
    department: "it_operations",
  },
  {
    email: "sasha.kim@unitn.it",
    name: "Sasha Kim",
    role: "staff",
    department: "concierge",
  },
];

// Earlier domains used for these demo users — deleted on every run so we
// don't accumulate duplicates as the seed evolves.
const OLD_EMAILS = [
  "marcus.vane@grandarch.com",
  "elena.rodriguez@grandarch.com",
  "julian.thorne@grandarch.com",
  "sasha.kim@grandarch.com",
];

async function findExistingUserId(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;
    const match = data?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) return match.id;
    if (!data || data.users.length < 100) return null;
    page += 1;
  }
}

// 1. Clean up stale demo accounts from previous runs.
for (const email of OLD_EMAILS) {
  const id = await findExistingUserId(email);
  if (id) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.warn(`! could not delete ${email}: ${error.message}`);
    else console.log(`- deleted ${email}`);
  }
}

// 2. Create / patch the current seed list.
let created = 0;
let patched = 0;

for (const u of SEED) {
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { name: u.name, role: u.role },
  });

  let userId = data?.user?.id ?? null;

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("already") || msg.includes("duplicate")) {
      userId = await findExistingUserId(u.email);
      if (!userId) {
        console.error(`× ${u.email} — exists but could not resolve id`);
        continue;
      }
      // Reset password so demo creds stay consistent.
      const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
        password: DEFAULT_PASSWORD,
      });
      if (pwErr) console.warn(`  password reset failed: ${pwErr.message}`);
      console.log(`· ${u.email} — exists, patching profile`);
      patched += 1;
    } else {
      console.error(`× ${u.email} — ${error.message}`);
      continue;
    }
  } else if (userId) {
    console.log(`+ ${u.email}`);
    created += 1;
  }

  if (!userId) continue;

  const { error: upErr } = await admin
    .from("profiles")
    .update({
      name: u.name,
      role: u.role,
      department: u.department,
    })
    .eq("id", userId);
  if (upErr) console.warn(`  profile patch failed: ${upErr.message}`);
}

console.log("");
console.log(`Created: ${created}, Patched: ${patched}`);
console.log(`Default password for all seeded users: ${DEFAULT_PASSWORD}`);
