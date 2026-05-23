# Supabase Auth & RBAC — Setup

The auth system is **layered, defense-in-depth**:

| Layer | File | Job |
|---|---|---|
| Proxy | `src/proxy.ts` | Refresh session, bounce signed-out users to `/login`. Optimistic — never the security gate. |
| Data Access Layer | `src/lib/auth/dal.ts` | Re-verify the JWT server-side, enforce fine-grained `(resource, action)` permissions. **The real authz gate.** |
| Postgres RLS | `supabase/migrations/0001_auth_rbac.sql` | The database refuses unauthorized rows even if the app has a bug. **The final backstop.** |

The role travels as a **signed JWT claim** (`user_role`), injected by a Custom Access Token Hook, so it cannot be forged client-side.

Everything runs inside this Next.js app (Server Components, Server Actions, Route Handlers, the proxy) — no separate backend. Deploys as serverless functions.

---

## One-time setup

### 1. Environment variables

Copy `.env.example` to `.env.local` and fill in real values from
**Supabase Dashboard → Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon / publishable key (safe to expose; RLS protects data)
- `SUPABASE_SERVICE_ROLE_KEY` — service-role secret (**server-only**, never `NEXT_PUBLIC_`)

`.env.local` is gitignored. Never commit it.

### 2. Run the database migration

In **Dashboard → SQL Editor**, paste and run the full contents of
`supabase/migrations/0001_auth_rbac.sql`.

This creates the `profiles` and `permissions` tables, seeds the permission
matrix, enables Row Level Security, adds a signup trigger, and defines the
`custom_access_token_hook` function.

### 3. Enable the Custom Access Token Hook

**Dashboard → Authentication → Hooks → Customize Access Token (JWT) Claims**

- Enable the hook
- Select the function `public.custom_access_token_hook`

Without this, the `user_role` claim is missing and every user is treated as
`staff`.

### 4. Auth provider settings

**Dashboard → Authentication → Sign In / Providers**

- Keep **Email** enabled.
- For an internal tool, turn **off** public sign-ups
  (**Authentication → Sign Ups → Allow new users to sign up**) so accounts are
  created only by admins.
- Optionally turn off "Confirm email" for faster internal onboarding.

### 5. Create the first admin

There is no admin until you make one. In **Dashboard → Authentication → Users
→ Add user**, create your account, then in **SQL Editor** run:

```sql
update public.profiles set role = 'admin' where email = 'you@grandaxishotel.com';
```

The signup trigger already created the `profiles` row; this just promotes it.
Sign out and back in so a fresh JWT carries the new role.

---

## Roles & page access

`admin` — full access · `manager` — everything except RBAC Settings ·
`staff` — Personal Portal + Inventory (incl. asset requests) only.

Edit the `permissions` table to change the matrix — no redeploy needed
(the future RBAC Settings page will do this through the UI).

---

## Using auth in code

```ts
// Protect a Server Component page / Server Action / Route Handler:
import { requirePermission, requireRole, getCurrentUser } from "@/lib/auth/dal";

await requirePermission("inventory", "create"); // 403 if not allowed
await requireRole("admin");                     // 403 if wrong role
const user = await getCurrentUser();            // { id, name, email, role, ... }
```

A whole route segment is already gated by its two-line `layout.tsx`
(see `src/lib/auth/guard.tsx`). For **mutations**, call `requirePermission`
again inside the Server Action — never rely on the page guard alone.

## Adding new protected pages

1. Add the resource to the `Resource` type and `PAGE_READ_ROLES` in
   `src/lib/auth/permissions.ts`.
2. Seed `(role, resource, action)` rows in the `permissions` table.
3. Add a `layout.tsx`: `export default permissionLayout("your-resource");`
4. Add the nav entry (with its `resource`) to `src/lib/nav.ts`.
