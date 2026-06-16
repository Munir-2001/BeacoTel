# Beacotel — Software Overview (Frontend · Backend · Database)

A friendly tour of how the **software** is built. Hardware/BLE ingestion is out
of scope here — we only cover the web app (frontend), its server logic
(backend), and the database. If you've never seen this stack before, read
sections 1–4 first; the rest is reference.

---

## 1. What the app is

Beacotel is an **indoor tracking + asset management dashboard** for a FabLab.
It shows, in real time on a floor plan:
- where **people (beacons)** are (Live Tracking + a movement Heatmap),
- **assets** (e.g. a tracked painting) and alarms if one leaves its safe zone,
- **RFID "soft assets"** (fridge items) being withdrawn,
- plus admin tooling: **Inventory, Staff Directory, RBAC, Analytics, System Logs,
  Personal Portal, Maintenance**.

---

## 2. The stack 

| Layer | Tech | What it means |
|---|---|---|
| **Frontend** | **Next.js 16 (App Router) + React 19** | The UI — pages and components rendered in the browser. |
| | **Tailwind CSS v4** | Styling via utility classes in `className`. |
| | **lucide-react** | Icons. **base-ui / shadcn-style** primitives in `components/ui`. |
| **Backend** | **Next.js Server Actions + one API route** | Server-side functions (no separate server) that read/write the DB. |
| **Database** | **Supabase = hosted PostgreSQL** + Auth + Realtime | Tables, SQL functions, triggers, row-level security, live updates. |

There is **no separate backend server**. Next.js runs both the frontend and the
backend logic. "Backend" here = **Server Components**, **Server Actions**, and SQL.

---

## 3. The three Next.js building blocks (important!)

Everything follows one of these three patterns:

1. **Server Components** (default `page.tsx`) — run on the server, fetch data
   directly from the DB, send HTML to the browser. No `"use client"` at top.
2. **Client Components** (`"use client"`) — run in the browser; handle clicks,
   state, realtime, animations.
3. **Server Actions** (`"use server"`) — async functions a client component can
   call like an API; they run on the server and write to the DB. This is how
   forms/buttons save data.

**Typical flow:** a page (Server Component) loads data → passes it to a Client
Component → user clicks a button → button calls a Server Action → action writes
to the DB and `revalidatePath()` refreshes the page.

---

## 4. Cross-cutting: Auth, RBAC, and DB access

### Authentication & roles
- **Supabase Auth** handles login/passwords/sessions (JWT in cookies).
- Three roles (`app_role` enum): **admin, manager, staff**.
- A **`permissions` table** is the source of truth for "which role can do what"
  on each resource (page): `(role, resource, action)` where action ∈
  read/create/update/delete.
- The **Data Access Layer** `src/lib/auth/dal.ts` enforces it:
  - `requirePermission(resource, action)` — throws/redirects if not allowed.
  - `hasPermission(...)` — boolean check (for conditionally showing UI).
  - `getReadableResources()` — which pages a user may see (drives the sidebar).
- **Row-Level Security (RLS)** in Postgres is the final gate — even if app code
  is wrong, the DB won't return rows a user shouldn't see. The SQL helper
  `jwt_role()` reads the role from the signed token.

> Mental model: **3 gates** — the proxy redirect (optimistic), `requirePermission`
> in the action/page (app-level), and RLS (database-level, authoritative).

### Two Supabase clients (`src/lib/supabase/`)
- `client.ts` → **browser** client (anon key). Everything it does is constrained
  by RLS. Used by Client Components for realtime/live reads.
- `server.ts` → **server** client (honours the user's cookie/session) **and**
  `createAdminClient()` (service-role key, bypasses RLS) for privileged writes
  like creating users or audit logging. Service-role key never reaches the browser.

---

## 5. Design decisions — functional & non-functional

"Functional" = *what* the software does and the choices behind those features.
"Non-functional" = *how well* it does it (the quality attributes: security,
performance, reliability, etc.). These are the decisions to defend in a review.

### 5.1 Functional decisions (what + why)
| Decision | Why |
|---|---|
| **Real-time floor plan** (live dots) instead of a refresh-button list | An indoor-tracking product is only useful if positions update as people move. |
| **Pre-aggregated heatmap** with selectable windows (1h/6h/24h/7d) | Operators want "where is it busy lately?" at a glance; windows answer different questions. |
| **Geofence alarm for high-value assets** (warning → 4 s grace → red alarm + log) | Theft/loss prevention; the grace timer avoids false alarms from BLE jitter. |
| **RFID withdrawal tracking** (snapshot diff → withdrawal/return events) | Tracks consumable "soft assets" leaving the fridge — a different problem than positioning. |
| **Two item types** (`inventory` vs `asset`) on one `equipment` table | Most items are ordinary inventory; only a few are geofenced assets — one model, backward compatible. |
| **RBAC with an editable `permissions` matrix** (not hard-coded roles) | Admins can change who-can-do-what without code changes. |
| **Audit log on every write** | Accountability + the System Logs / activity timeline come for free. |
| **Pseudonymous tracking** (beacon IDs on the map, not names) | Privacy-by-design; identity is a separate, permissioned join. |
| **Personal Portal** (self-service edit + release own assets) | Keeps staff out of admin pages while letting them manage their own data. |

### 5.2 Non-functional decisions (quality attributes + how we meet them)
| Attribute | Decision / mechanism |
|---|---|
| **Security & privacy** | Postgres **Row-Level Security** as the final gate + app-level `requirePermission` + role-in-JWT (`jwt_role`); service-role key is **server-only**; passwords handled by Supabase Auth; tracking is pseudonymous. |
| **Performance** | **Pre-aggregation**: the heatmap reads a small rollup (`heatmap_cells`, sparse grid × time buckets) instead of scanning raw history — bounded query size regardless of data volume. |
| **Reliability / availability** | **Graceful degradation**: live UIs use Realtime **plus a ~2 s polling fallback**, so they keep working if the websocket drops; the pipeline is **decoupled** (live map keeps working even if the history/heatmap triggers fail); stale beacons are flagged, never silently wrong. |
| **Scalability / storage** | History is **capped (≤ 1000 rows)** and old heatmap buckets are **prunable** — storage stays bounded over time. |
| **Maintainability** | One **consistent per-feature pattern** (`page.tsx` + `components/<f>` + `lib/<f>/list.ts` + `actions.ts`); schema lives in **ordered SQL migrations**; shared helpers (`validation.ts`, `ui/confirm-dialog.tsx`) avoid duplication. |
| **Usability** | **Inline form validation** with friendly messages (client for instant feedback, server as the gate); **confirm dialogs** for destructive actions; responsive realtime so the UI feels live. |
| **Data integrity** | DB **CHECK constraints + triggers** enforce invariants (e.g. an assigned asset must be `in_use`); validation mirrored client + server. |
| **Portability / cost** | Built entirely on **managed Supabase** (DB + Auth + Realtime) and Next.js — no servers to run; deployable to any Node/Vercel host. |

> One-line summary: **functionally** it's a real-time, role-gated tracking +
> asset dashboard; **non-functionally** it favors privacy (RLS + pseudonymity)

---

## 6. Features — frontend / backend / database

### 6.1 Live Tracking & Heatmap  (`/live-tracking`)
- **Frontend:** `components/live-tracking/`
  - `floor-plan.tsx` — the map shell: zoom, **drag-to-pan**, Live/Heatmap toggle.
  - `live-overlay.tsx` — live beacon dots (shows beacon id + live x/y).
  - `heatmap-overlay.tsx` + `heatmap-legend.tsx` — density heatmap (window picker
    1h/6h/24h/7d).
  - `nodes-layer.tsx` — fixed receiver nodes drawn from the `nodes` table.
  - `recently-active.tsx` — one "Staff Member · Beacon #" row per live beacon.
  - `floorplan/fablab-map.tsx` — the SVG floor plan.
- **Frontend logic:** `lib/positioning/`
  - `live-beacons.ts` → **`useLiveBeacons()`** hook: subscribes to Supabase
    **Realtime** + polls every ~2 s; flags stale beacons.
  - `coords.ts` → `toViewBox()` converts Pi metres → screen coordinates.
- **Database:** reads `beacon_live_positions` (one row per beacon, live) and
  `heatmap_cells` (aggregated). Heatmap reads via the **`heatmap_window(since)`**
  SQL function.
- **Note:** the data *into* `beacon_live_positions` comes from hardware ingestion
  (out of scope). Everything above just **reads/visualizes** it.

### 6.2 Inventory & Asset geofence  (`/inventory`)
- **Frontend:** `components/inventory/`
  - `asset-registry.tsx` — the equipment table (search, filter, paginate, CSV).
  - `edit-asset-sheet.tsx` — add/edit form **with field validation** (see §8).
  - `floorplan-card.tsx` — the asset map.
  - `asset-guard.tsx` + `asset-guard-provider.tsx` — **geofence alarm**: if a
    tracked asset (e.g. beacon 77, the painting) leaves its safe radius → warning
    popup → 4 s grace → red full-screen alarm + siren + audit log. The provider is
    mounted app-wide so the alarm fires on any page.
- **Backend:** `lib/inventory/`
  - `list.ts` → `listAssets()`, `listTrackedAssets()`, `getInventoryStats()`.
  - `actions.ts` → `createAsset`, `updateAsset`, `archiveAsset`, `setAssetStatus`,
    `releaseAsset`, `markInspected` (each validates + writes + audits).
  - `alert-actions.ts` → `logAssetMovedAlert`, `returnAssetHome`,
    `listRecentAssetAlerts`.
- **Database:** `equipment` table (with `item_type` = inventory|asset, geofence
  columns `beacon_id/home_x/home_y/geofence_radius`).

### 6.3 RFID Tracking  (`/rfid-tracking`)
- **Frontend:** `components/rfid/`
  - `tag-registry.tsx` — table of tags → soft assets; Withdraw / delete (with a
    **confirm dialog**).
  - `withdrawal-feed.tsx` — live feed of withdrawals/returns (paginated 3/page).
  - `register-tag-sheet.tsx` — register a new tagged item.
- **Frontend logic:** `lib/rfid/live.ts` → `useWithdrawalFeed()`,
  `useTagChanges()` (realtime).
- **Backend:** `lib/rfid/` — `list.ts` (`listTags`, `listReaders`,
  `listRecentWithdrawals`, `getRfidStats`) and `actions.ts` (`recordWithdrawal`,
  `returnTag`, `registerTag`, `unregisterTag`).
- **Database:** `rfid_tags`, `rfid_readers`, `rfid_withdrawal_events`.

### 6.4 Staff Directory  (`/staff-directory`)
- **Frontend:** `components/staff/` — `staff-directory-client.tsx`, `staff-table.tsx`,
  `edit-staff-sheet.tsx` (create/edit, **email validation**, deactivate with
  **confirm dialog**), `stat-cards.tsx`.
- **Backend:** `lib/staff/` — `admin.ts` (`listStaff`, `getStaffStats`),
  `actions.ts` (`createStaff`, `updateStaff`, `setStaffActive`).
- **Database:** `profiles` (extends Supabase Auth users with name/role/department/
  employee_id/active).

### 6.5 RBAC Settings  (`/rbac-settings`, admin only)
- **Frontend:** `components/rbac/` — `users-panel.tsx` (add user / change role /
  activate), `permission-matrix.tsx` (toggle role×resource×action).
- **Backend:** `lib/auth/admin.ts` (`listUsers`, `listPermissions`) +
  `admin-actions.ts` (`createUser`, `updateUserRole`, `setUserActive`,
  `togglePermission`).
- **Database:** `profiles` + `permissions`.

### 6.6 Personal Portal  (`/personal-portal`, every user)
- **Frontend:** `components/personal-portal/` — edit own profile, see my assets,
  quick actions.
- **Backend:** `lib/personal-portal/` — `me.ts` (`getMyProfile`), `my-assets.ts`
  (`listMyAssets`), `actions.ts` (`updateMyProfile`). Staff can release their own
  assigned assets via `releaseMyAsset` (in inventory actions).

### 6.7 Analytics  (`/analytics`)
- **Frontend:** `components/analytics/` — headcount cards, sign-in sparkline,
  department/role distribution bars, equipment mix.
- **Backend:** `lib/analytics/people-activity.ts` — `getHeadcount`,
  `getDeptDistribution`, `getRoleDistribution`, `getSigninActivity`,
  `getEquipmentMix` (computed from `profiles`, `audit_logs`, `equipment`).

### 6.8 System Logs  (`/system-logs`)
- **Frontend:** `components/system-logs/` — filterable, date-ranged event list.
- **Backend:** `lib/system-logs/list.ts` → `listAuditLogs()` reshapes `audit_logs`
  rows into human-readable events.

### 6.9 Maintenance  (`/maintenance`)
- **Frontend:** `components/maintenance/` — kanban-style board of equipment by
  status; reuses inventory actions (`setAssetStatus`, `markInspected`).

### 6.10 Audit logging (cross-cutting)
- `lib/audit/log.ts` → **`recordAudit()`** is called by almost every write action
  to append to `audit_logs` (who/what/when/IP). `history.ts` + `me.ts` read it
  for the activity timeline and the notification bell.

---

## 7. Database reference (`supabase/migrations/`)

**Tables**
| Table | Purpose |
|---|---|
| `profiles` | users (name, role, department, employee_id, active) — extends Auth |
| `permissions` | RBAC matrix (role, resource, action) |
| `audit_logs` | append-only activity trail |
| `equipment` | inventory + tracked assets (item_type, geofence fields) |
| `nodes` | fixed BLE receiver positions (shown on map) |
| `beacon_live_positions` | one live row per beacon (read by Live Tracking) |
| `beacon_position_history` | raw movement log (capped ≤ 1000 rows) |
| `heatmap_cells` | aggregated heatmap (sparse grid × 15-min buckets) |
| `rfid_tags` / `rfid_readers` / `rfid_withdrawal_events` | RFID soft-asset tracking |

**SQL functions** — `jwt_role` (role from token, used by RLS), `handle_new_user`
(auto-create profile on signup), `custom_access_token_hook` (put role in JWT),
`next_asset_code` / `next_employee_id` (sequences), `heatmap_cell_xy`
(position→grid cell), `heatmap_window` (read heatmap for a time window),
`heatmap_rollup_on_history` / `beacon_live_to_history` / `cap_beacon_history` /
`prune_beacon_history` (the data-pipeline + housekeeping).

**Triggers** — `on_auth_user_created` (signup → profile), `trg_live_to_history`
(live update → history), `trg_heatmap_rollup` (history → heatmap counts),
`trg_cap_beacon_history` (keep history ≤ 1000 rows).

**Security model:** every table has **RLS** enabled; reads are gated to
`authenticated`, writes to admin/manager (or service-role) per `jwt_role()`.

---

## 8. Validation & UX conventions
- `lib/validation.ts` → `isValidEmail()` (shared by staff/user create, client + server).
- Forms validate **client-side for instant messages** and **server-side as the
  real gate** (e.g. `edit-asset-sheet.tsx` shows per-field errors; `inventory/
  actions.ts` `validate()` re-checks).
- `components/ui/confirm-dialog.tsx` → reusable **SweetAlert-style confirm** for
  destructive actions (employee deactivate, tag delete). Rendered via a React
  portal so it always centers on screen.
- Realtime UIs (`useLiveBeacons`, `useWithdrawalFeed`) use **Realtime + a polling
  fallback**, so they keep updating even if the websocket drops.

---

## 9. "Important functions" cheat-sheet

| Function | File | Does |
|---|---|---|
| `requirePermission(resource, action)` | `lib/auth/dal.ts` | gate a page/action by RBAC |
| `getReadableResources()` | `lib/auth/dal.ts` | which pages the sidebar shows |
| `recordAudit(input)` | `lib/audit/log.ts` | append to the audit trail |
| `createClient()` / `createAdminClient()` | `lib/supabase/*` | get a DB client (RLS / service-role) |
| `listAssets()` / `createAsset()` / `updateAsset()` | `lib/inventory/*` | inventory read/write |
| `logAssetMovedAlert()` / `returnAssetHome()` | `lib/inventory/alert-actions.ts` | geofence alarm + recover |
| `useLiveBeacons()` | `lib/positioning/live-beacons.ts` | live beacon stream (Realtime+poll) |
| `recordWithdrawal()` / `registerTag()` | `lib/rfid/actions.ts` | RFID withdrawals + registry |
| `createStaff()` / `updateStaff()` / `setStaffActive()` | `lib/staff/actions.ts` | staff CRUD |
| `createUser()` / `togglePermission()` | `lib/auth/admin-actions.ts` | RBAC admin |
| `listAuditLogs()` | `lib/system-logs/list.ts` | system logs feed |
| `isValidEmail()` | `lib/validation.ts` | email validation (client+server) |

---

## 10. How to run / explore
- `npm run dev` — start the app. Pages live under `src/app/(dashboard)/`.
- Database changes are SQL files in `supabase/migrations/`, applied in numeric
  order in the Supabase SQL editor.
- To trace any feature: open its `page.tsx` → follow the `components/<feature>`
  it renders → find the `lib/<feature>/actions.ts` the buttons call → see which
  table it touches.
</content>
