# Sellaris — Business OS for African SMEs

Multi-tenant SaaS platform: POS, inventory, bar/lounge ops, finance, HR/payroll,
and customer loyalty, built Nigeria-first (Naira pricing, PAYE/FIRS-aware,
offline-capable POS for unstable power/data).

First tenant: **Roger's Lounge** (bar/lounge, Ijagun, Ijebu Ode, Ogun State).

## Why this exists
Loyverse, QuickBooks, and Paycita each cover part of what a Nigerian SME
needs, but none cover all of it, and none are built for Nigeria:

- **Loyverse** — free POS, good daily sales ops, but: no real cost tracking
  (items show ₦0 cost, no GRN-based costing), no negative-stock prevention,
  no waiter→barman bar flow, no accounting/HR/payroll.
- **QuickBooks** — powerful but $38–115/mo, USD-centric, poor offline mode,
  complex Nigerian tax setup.
- **Paycita** — HR/payroll/ops, limited scope, mid-market focus.

Sellaris covers POS + inventory + bar flow + finance + HR + loyalty in one
system, priced in Naira, working offline.

## Architecture (rebuild, [current date])

- **Frontend** — React + Vite, Tailwind, shadcn/ui, Zustand → hosted on **Vercel**
- **Database/Auth/Realtime** — **Supabase** (Postgres, RLS per tenant, live
  subscriptions for POS + admin KPIs)
- **Backend API** — Node/Express on **Hostinger KVM VPS** (Node 24, PM2,
  Nginx reverse proxy, Let's Encrypt SSL) — handles Paystack webhooks,
  TicketPass↔Sellaris bridge, WhatsApp receipts, any server-only logic
- **Backups** — this git repo is the source of truth. Push to GitHub after
  every meaningful session. Hostinger VPS daily backups on. Supabase PITR
  once real tenant data is live.

## Core modules (build order)

1. Design system & component library
2. POS + Bar Flow (waiter → barman → waiter dispatch, no dockets)
3. Inventory + GRN (goods received) — auto cost from GRN, no manual entry,
   no sale without stock arriving via GRN first (fixes Loyverse's negative
   stock problem). Expanded scope based on direct Loyverse comparison:
   - Purchase orders — plan purchases, send to suppliers, track receipts
   - Transfer orders — move stock between branches
   - Stock adjustments — increase/decrease for damage, loss, received items
   - Inventory counts — full or partial stocktake, barcode scanner or manual
   - Production — track stock of items produced from ingredients (e.g. a
     cocktail made from several bottles)
   - Inventory history — full adjustment log
   - Inventory valuation report — cost + potential profit of current stock
   - Label printing — barcode labels for items/POs/counts
   - Suppliers directory
4. Finance & Settings — Nigerian tax engine, P&L, VAT auto-compute.
   Settings should include granular feature toggles, matched/beaten
   against Loyverse's set:
   - Shifts (cash in/out tracking per drawer)
   - Time clock (staff clock in/out, hours worked)
   - Open tickets (save/edit orders before payment — this is the bar tab)
   - Kitchen printers / kitchen display
   - Customer-facing display
   - Dining options (dine in / takeout / delivery)
   - Low stock notifications (daily email)
   - **Negative stock alerts** — warn cashier attempting to sell more than
     in stock (Loyverse has this as an opt-in toggle; Sellaris should
     enforce this by default per our GRN-first design decision, not just
     warn)
   - Weight-embedded barcode scanning
5. Customers & Loyalty + Online Menu
6. Super Admin console (`/admin`) — platform KPIs, MRR/ARR, tenant
   management, support tickets, activity log
7. PWA offline mode — service worker, IndexedDB queue, background sync
8. Onboarding wizard + public landing page

## Sales summary report (from direct Loyverse comparison)

Loyverse's report bar: date range picker, all-day/time filter, employee
filter, gross sales, refunds, discounts, net sales, gross profit — each
with a % change indicator — plus a trend chart (by day/week/month, by
area) and an exportable date-by-date table. Sellaris should match this
exactly and then go further with the cost data Loyverse can't show
(real gross profit, since cost is properly tracked via GRN).

## Pricing (Naira, subject to re-validation)

| Plan | Price | Branches | Staff | Key features |
|---|---|---|---|---|
| Solo | ₦3,000/mo | 1 | 2 | Full offline POS, inventory, online menu, WhatsApp receipts |
| Business | ₦8,500/mo | 3 | 15 | + Bar/lounge mode, GRN, staff debt, P&L + VAT |
| Pro | ₦22,000/mo | Unlimited | Unlimited | + Full HR/payroll, pension/NSITF, bank reconciliation, FIRS exports, API |

## Known integration points

- **TicketPass hotel integration** — two-way webhook bridge. TicketPass
  calls Sellaris for room availability + incoming bookings. Sellaris fires
  webhooks to TicketPass on room status change (walk-in bookings, checkouts).
  Sellaris is single source of truth for availability.

## Known gotchas from the last build (don't repeat)

- Onboarding must use real Supabase columns: `type`, `slug` (required, easy
  to forget). Tenant ownership resolved via the `staff` table by role — not
  a foreign key on `tenants`.
- No backup existed last time → full loss of the codebase. This repo +
  regular GitHub pushes fixes that permanently.

## Supabase project

- **Project**: `Sellaris` (`wguxhkuigcotsevvcerk`, eu-west-1, org: 1105 Media NG)
- **URL**: https://wguxhkuigcotsevvcerk.supabase.co
- Separate from the CitiPlug/Skor Africa project (`uysipsegizbixwgvwdzl`) and
  the Ijebu Shutdown project — Sellaris gets its own dedicated project.
- Migrations applied: core tenancy (tenants/branches/staff), items +
  inventory (categories/items/suppliers/purchase_orders/GRNs), orders +
  bar flow (orders/order_items/payments/staff_debt).
- **Key mechanism verified working**: GRN receipt auto-updates item cost
  (weighted average) and stock via trigger — no manual cost entry. Selling
  more than available stock is blocked at the database level (tested:
  raises `Insufficient stock` and rejects the transaction). This is the
  structural fix for both Loyverse problems observed at Roger's Lounge
  (₦0 cost, negative stock).
- Roger's Lounge seeded as tenant #1, Ijagun as its branch, with the same
  9-item menu the POS UI uses, now with real weighted-avg cost (45% margin)
  after a test GRN.
- **Not yet built: staff auth/login.** RLS policies are scoped to
  `auth.uid()` via the `staff` table, so the app currently can't read data
  without a logged-in session — this is intentionally left secure rather
  than opened up for convenience. Auth is the next required piece before
  the frontend shows live data end to end.
- `.env.local` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
  — gitignored, see `.env.example` for the shape.

## Auth (staff login)

- Email/password auth via Supabase Auth (`AuthContext.jsx`).
- First-time setup: sign up with any email/password, then "claim"
  Roger's Lounge as owner via the `claim_tenant_owner` RPC — a
  security-definer function that only succeeds once per tenant (blocks
  a second person from claiming an already-owned business). Anon access
  to this function is explicitly revoked; only logged-in users can call it.
- All routes except `/login` are behind `ProtectedRoute`, which checks
  both a valid session AND a linked `staff` row — being logged in isn't
  enough, you need to be staff at a tenant.
- POS and Dashboard now read `tenant_id`/`branch_id` from the logged-in
  staff member (`useAuth().staff`), not a hardcoded constant.
- Security advisors: zero unintended warnings (one expected warning
  remains on `claim_tenant_owner` being callable by any authenticated
  user — that's by design, the function's own logic is the real gate).

## Platform naming rule (important)

Sellaris is a multi-tenant platform for ANY business — Roger's Lounge is
the pilot/test tenant used during development, nothing more. It must
never appear as hardcoded UI text anywhere in the app. All business and
branch names shown on screen are pulled live from the database via
`useAuth().staff.businessName` / `.branchName`, never a string literal.
This was fixed across Dashboard, POS, and the login/claim screen — worth
re-checking on every new page as it's built.

## Warehouse-first inventory model

Every business gets exactly one **warehouse** branch, auto-created the
instant a tenant is created (database trigger, not an app-level step —
can't be skipped or forgotten). All purchases (GRNs) are enforced to land
in the warehouse only; the database rejects a GRN aimed at a store branch
outright. Stock only reaches a customer-facing store via an explicit
**transfer order** (warehouse → store), which also enforces no
negative stock on the warehouse side.

This changed the stock model from a single tenant-wide `items.stock`
number to a proper per-branch `item_stock` table (`branch_id`, `item_id`,
`stock`) — required for warehouse vs. store to be meaningfully
different places. `items.stock` has been dropped entirely.

Verified working end to end on Roger's Lounge: GRN → stock lands in
warehouse only (direct-to-store GRN correctly rejected) → transfer
order moves stock warehouse → Ijagun store → POS sale at Ijagun
correctly decrements Ijagun's stock, not the warehouse's.

Not yet built: a UI for creating/completing transfer orders (currently
only testable via SQL) — this is the next piece under the Inventory
module.

## Sharing a preview build

Build with `npx vite build --base=./ --outDir dist-preview` and copy
the whole `dist-preview` folder (index.html + assets) to outputs — this
is the method actually verified working via real interactive testing
(POS, Inventory) in earlier sessions. A single-file inlined build
(`vite-plugin-singlefile`) was tried and reverted — it broke
`import.meta.url` resolution inside the preview sandbox and threw
"Invalid URL" errors. Stick with the multi-file relative-path build.

## Known bug fixed: RLS self-reference on staff table

The original "staff can view colleagues" policy checked tenant
membership via a subquery that referenced the `staff` table from
within its own policy (`tenant_id in (select tenant_id from staff
where user_id = auth.uid())`). This self-referencing pattern caused
sign-in to fail to find the user's own staff row after a successful
login, sending them back to the claim-ownership screen even though
they already owned the business.

Fixed by adding a direct, unambiguous policy: `user_id = auth.uid()`.
No subquery, no self-reference. Since Postgres OR's multiple permissive
policies together, the original colleagues-visibility policy is
unaffected — this just guarantees your OWN row is always visible
regardless of how the tenant-scoped policy resolves.

Lesson for future RLS policies: prefer a direct match on `auth.uid()`
wherever possible over a subquery on the same table, even when a
subquery seems more "correct" for a broader visibility rule.

## Correction to the earlier RLS fix

The earlier fix (adding "staff can view own row directly") was
necessary but NOT sufficient — the actual broken policy
("staff can view colleagues") was still present and Postgres was
throwing a hard error: "infinite recursion detected in policy for
relation staff", confirmed directly from Postgres logs
(`get_logs(service="postgres")`). Every staff query was returning
500, not silently failing — which is why "sign out and back in"
didn't help; it wasn't a caching issue.

**Real fix**: drop the recursive policy entirely.
`staff can view own row directly` (a plain `user_id = auth.uid()`
check) is sufficient for everything the app currently does. If
"view other staff at my business" is needed later (e.g. a Staff
management page), implement it via a SECURITY DEFINER function
instead of a self-referencing RLS policy — self-reference on the
same table is what causes this class of bug.

Lesson: when a query fails with 500 (not 403/empty), always check
Postgres logs directly (`get_logs`) for the real error before
guessing — don't assume RLS silently hides rows; sometimes it
crashes instead.

## Bug fixed: owner accounts created with no branch assigned

`claim_tenant_owner` was creating the owner's staff row without a
`branch_id`, which broke every branch-scoped screen (POS threw a raw
"invalid input syntax for type uuid: null" error). Fixed two ways:

1. The RPC now auto-assigns the tenant's main store branch to every
   new owner — falls back to any non-warehouse branch if none is
   flagged `is_main` yet.
2. POS now checks for a missing `branch_id` up front and shows a
   plain-language message instead of ever hitting a raw SQL error —
   defensive UI matters even after the root cause is fixed, since a
   future staff-invite flow could hit the same gap.

Backfilled the existing TicketPass NG owner account with Ijagun as
its branch.

## Getting Telegram notifications working (your action needed)

1. Open Telegram, message **@BotFather**
2. Send `/newbot`, follow the prompts to name it (e.g. "Sellaris Alerts")
3. BotFather gives you a token like `123456:ABC-DEF1234...` — send
   that to me (or store it somewhere I can access as a Supabase secret)
4. I'll then build the Edge Function that actually sends messages using
   that token — this is the one piece that genuinely can't be built
   before the token exists.

Each business owner then gets their own chat ID (message the bot,
it replies with their ID) and pastes it into Settings → Telegram
notifications.

## Theme flip: dark → light background

Switched the base surfaces from dark violet-ink to light, per direct
request. Kept the sidebar intentionally dark (Notion/Linear/Vercel
pattern) rather than going fully flat white everywhere, so navigation
still feels branded.

This wasn't a simple value swap — two real bugs had to be caught and
fixed along the way:

1. `--violet-dim` was used both in the (still-dark) sidebar's active
   nav state AND on the (now-light) MetricCard accent border. Split
   into `--violet-dim-dark` for the sidebar and left MetricCard using
   the solid `--violet` for its border, since a light lavender tint
   is invisible as a border on white.
2. Button's "primary" variant used the shared `--ink-text` token for
   its label — that token now means "dark text for light surfaces,"
   but a violet-filled button always needs light text regardless of
   the overall theme. Hardcoded that one, on purpose, with a comment
   explaining why.

The sidebar's dark-appropriate text tokens are scoped via a
`.sidebar-dark` class in tokens.css that locally overrides
`--ink-text`/`--ink-text-muted`/`--line` for that subtree, so nav
labels don't go invisible against the dark background — verified with
an actual screenshot, not just a "no JS errors" check.

## Item images/colors on POS (and hardware/feature reference)

Checked loyverse.com/hardware, /customer-display-system, /dashboard,
/employee-management for reference. Takeaways:

- **Hardware page**: extensive printer/scanner/cash-drawer compatibility
  list. Our Bluetooth+Serial printer support is the right approach;
  worth extending printer.js with a cash-drawer-kick ESC/POS command
  later (drawers are usually triggered through the receipt printer,
  not a separate integration).
- **Customer Display System**: a genuinely separate second-screen app
  (order details facing the customer, works over local Wi-Fi even
  offline). Not built \u2014 real future feature, noted for the roadmap,
  not attempted this round.
- **Employee Management**: confirms our roles/permissions/invite
  approach matches their model. One real gap worth flagging: Loyverse
  uses PIN-based quick staff switching AT the POS (for busy
  bars/restaurants swapping cashiers fast), while Sellaris currently
  only has full email/password login. Worth a future PIN-login mode
  for POS specifically.

**Built this round**: items can now be represented on POS by either a
color swatch (8 brand-tuned colors, matches Loyverse's picker pattern)
or a real uploaded photo (Supabase Storage, public-read bucket,
staff-only write). Verified end to end: a color-flagged item
correctly flows through to the public menu view with zero manual
wiring needed elsewhere, since it was added to the view once and both
POS and PublicMenu already share the same query pattern.
