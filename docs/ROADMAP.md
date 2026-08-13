# Sellaris — Build Roadmap

Living checklist. Update this file as each step ships, so progress is
always visible at a glance — no need to scroll chat history to remember
where we are.

Legend: ✅ done and verified · 🔜 next up · ⬜ not started

---

## Architecture note: Universal Core + Operational Layers

Sellaris is a **business operating system for African businesses**,
not a lounge-management product. Roger's Lounge is the pilot tenant
and testing environment — it does not define the product.

Every tenant gets the same universal core (Sales/POS, Inventory, Staff,
Finance, Customers, Suppliers, Branches, Reports, Payments,
Notifications, Admin). Hospitality-specific concepts (Table, Bar Flow,
Barman) are an **optional operational layer**, activated per tenant by
business type at signup, not a baked-in assumption. See README.md
("Universal core vs. operational layers") for the full model and
honest status per business type.

This changed two concrete things already built:
- `tenants.enabled_modules` (jsonb array) + `src/lib/modules.js` now
  drive which nav items a tenant actually sees — a retail shop never
  sees "Bar flow" in its sidebar.
- POS's till label was hardcoded `"Table 5"` for every tenant
  regardless of business type — now `hasTables` (derived from
  `enabled_modules`) decides whether the till shows an editable table
  field or a generic "New sale" label.

---

## Chapter 2 — Toward a Dependable Business OS (8-phase plan)

This supersedes the old "what's next" list below as the forward plan.
Phases 1–9 below are now build history (mostly complete — the
foundation this new plan builds on). Sequencing rationale: harden what
exists before adding surface area; HR/payroll before deeper finance,
since that's where the differentiation from Loyverse actually is.

**Priority order**: 1 (Immediate) → 2 (Immediate) → 3 (High) → 4 (High)
→ 5 (High) → 7 (High) → 6 (Medium) → 8 (Later)

### Phase 1 — Production hardening 🔜 *(in progress)*
- ✅ Atomic POS order creation — `create_pos_sale()` RPC replaces the
  old two-step order+order_items insert. **Verified, not assumed**: ran
  a direct transaction test that intentionally fails on the stock
  check mid-way through — confirmed zero orphaned order rows survive.
  A function body is one Postgres transaction; this makes the old
  failure mode structurally impossible, not just less likely.
- ✅ Same atomicity for offline sale sync — `offlineSync.js` now calls
  the same RPC instead of its own separate two-insert sequence.
- ✅ Idempotency protection — every sale (online or queued offline)
  carries a client-generated UUID key; the RPC treats a repeat of the
  same key as "already done" and returns the existing order instead of
  creating a duplicate. Backed by a unique index on
  `(tenant_id, idempotency_key)`.
- ✅ Remove hardcoded `"Table 5"` — done, replaced with order-type-aware
  labeling
- ✅ Proper order type selection: Table / Walk-in / Takeaway / Delivery
  / Bar tab — hospitality tenants see all 5, universal-core tenants see
  only the 3 that apply to them (no "Table"/"Bar tab" forced on a
  retail shop)
- ✅ PIN attempt throttling/lockout — 5 wrong attempts locks that
  profile out for 60s on that device, tracked locally (IndexedDB)
- ✅ Explicit active branch state + branch switching — `BranchContext`
  gives back-office roles (owner/administrator/manager) a real switcher
  in the sidebar when they have more than one store; cashiers stay
  pinned to their assigned branch. POS reads/writes against the
  *active* branch, not a permanently fixed one.
- ✅ Global error handling — a React `ErrorBoundary` now wraps the
  whole app. **Verified properly, including catching my own first test
  mistake**: an inline throw during JSX construction doesn't route
  through React's error boundary at all (different failure mode from
  a real component crash) — caught that, rewrote the test as an actual
  component throwing during its own render, confirmed the recovery
  screen shows instead of a blank page, then removed all test code
  and confirmed zero trace of it remains.
- ✅ Application audit log — real `audit_log` table (RLS: staff see
  their tenant's log only, any authenticated user can log their own
  actions), wired into sign-in success, staff invites, and app crashes
  (via the ErrorBoundary). **Known honest gap**: failed sign-in
  attempts can't be logged yet — there's no session to attribute them
  to client-side; would need a server-side function.
- ✅ Failed-operation monitoring — offline sync failures now log to
  the audit trail too, and Super Admin has a real cross-tenant "Recent
  errors" feed (last 20, app crashes + sync failures), so a failure
  is visible to you even if nobody happens to be standing at the till
  where it happened.
- ⬜ Live device testing: PIN login, offline sales, receipt printers
  (all built, none exercised on real hardware/real users yet)
- ✅ Full RLS review pass across every tenant-facing table — systematic,
  not spot-checked: queried every public table's RLS status + policy
  count. **Found and fixed a real bug**: `branches` had a SELECT
  policy only, no INSERT/UPDATE — the "Add store" feature in Settings
  has been silently broken this entire time, RLS would have rejected
  the insert with no obvious surfaced error. `staff` and
  `platform_admins` being SELECT-only turned out to be correct by
  design (writes go through security-definer RPCs, not raw inserts).
- ✅ Migrations formally versioned in Git *(already true — every
  migration in this project has been a tracked, named Supabase
  migration from day one, not ad-hoc SQL)*

### Phase 2 — Complete the Loyverse-level operations layer ⬜
POS: table management, floor layout, order types, modifiers, variants,
split bill/payment, multi-payment-method orders, per-item and
per-receipt discounts, void item/receipt, manager approval for
restricted actions, hold/merge/move tickets, receipt history + reprint,
barcode scanning (incl. camera + weight-embedded), cash drawer mgmt.
Shift management: open/close shift, cash in/out, expected vs actual
cash, shift reports. Customer Display System (separate screen, local
connection). Kitchen Display System (generalizes the existing Bar Flow
kanban to route by item category — Cocktail→Bar, Food→Kitchen, etc.)

### Phase 3 — HR and workforce (the Paycita phase) ⬜
Full employee profiles (ID, photo, next of kin, employment history,
documents), departments with managers/cost centres, attendance
(clock in/out via the existing PIN infrastructure, breaks, overtime,
lateness), leave (types, requests, approvals, balances, calendar),
and reusable multi-level workflow approvals (leave, expenses,
procurement, refunds, stock adjustments — one engine, not bespoke per
feature).

### Phase 4 — Payroll and Nigerian compliance ⬜
Salary structures, allowances, deductions (PAYE, pension, loans,
advances), payroll runs (draft → preview → approval → lock → pay),
payslips (PDF, YTD), and compliance calculations built as a separate,
versionable module. Approved payroll must post to Finance as a salary
expense automatically — no manual re-entry.

### Phase 5 — QuickBooks-level finance ⬜
Chart of accounts, general ledger (every transaction posts real
journal entries — sales, inventory/COGS, payroll), bank/cash accounts
+ reconciliation, accounts payable (Supplier → PO → GRN → Bill →
Payment, connecting directly to the existing inventory module),
accounts receivable, upgraded expenses (vendors, approvals, recurring,
reimbursement, cost centres), and the full financial report suite
(P&L, Balance Sheet, Cash Flow, Trial Balance, GL, AR/AP aging, VAT,
payroll liability, branch profitability).

### Phase 6 — Business operations & Sellaris-exclusive features ⬜
Procurement (Request → Approval → PO → Supplier → GRN → Bill →
Payment — the existing PO/GRN modules already cover the back half),
business assets (distinct from resale inventory — generators, POS
terminals, furniture — with depreciation/maintenance/disposal),
employee loans/salary advances with automatic payroll deduction, and
(later) appraisal/performance reviews.

### Phase 7 — Payments, billing and integrations ⬜
Real Paystack billing (Tenant → Plan → Subscription → Webhook →
Entitlement, where plans control actual capability gating, not just
displayed price), payment collection (transfer verification, card
terminal refs, QR, wallet), the TicketPass integration bridge, and
WhatsApp notifications (receipts, low stock, daily summary, payroll,
invoices, payment reminders). Telegram: pipeline already built, just
needs the bot token (see Phase 7 note in build history below).

### Phase 8 — Owner intelligence ⬜
Proactive daily briefings (not just reports — "3 items may run out
tomorrow," "Cashier 04 has a ₦7,500 shift difference"), a business
health score, and forecasting (stock depletion, cash requirements,
payroll obligations, sales trends, anomalies). Deliberately last — AI
advisory features are only trustworthy once the underlying financial
and operating data genuinely is.

---

## Build history: Phases 1–9 (V1 — mostly complete)

The chapter below is the original build sequence that got Sellaris
from nothing to a working multi-tenant platform. Kept for reference —
it's the foundation Chapter 2 builds on, not a separate plan.

---

## Phase 1 — Foundation
- ✅ GitHub repo set up, real backup (no more lost files)
- ✅ Design system: colors, type, component library (Button, Card, Badge,
  Input, Table, RunningTotalStrip) — real React code, not mockups
- ✅ Supabase project created, dedicated to Sellaris
- ✅ Core multi-tenant schema: tenants, branches, staff, categories, items

## Phase 2 — Commerce and operations engine
*(renamed from "POS + Inventory core" — some Sellaris tenants may never
use a traditional POS; this is the commerce/inventory engine underneath
POS, not POS itself)*
- ✅ POS till page: cart, category filter, qty controls, VAT calc
- ✅ GRN → auto cost + stock (fixes Loyverse's ₦0-cost problem)
- ✅ Negative-stock blocked at the database level (fixes Roger's Lounge's
  overselling problem)
- ✅ Staff login (email/password) + protected routes
- ✅ First-time "claim your business" owner setup flow
- ✅ No hardcoded business names anywhere in the UI — pulled from DB
- ✅ Warehouse-first stock model: every business auto-gets a warehouse;
  purchases can only land there; stock reaches a store only via transfer
- ✅ **Create Item form** — previously items could only be added via
  direct SQL (a real gap). Now a proper form in Inventory → Items:
  name, description, category, price, SKU, barcode, low-stock
  threshold, "available for sale" and "track stock" toggles. Cost is
  deliberately NOT an input here — verified a new item starts at
  ₦0.00 cost and only rises via a real GRN, never manual entry.
- ✅ **Item color/photo representation on POS** — matches Loyverse's
  "Representation on POS" pattern (8 brand-tuned color swatches or a
  real uploaded photo). Live on POS product grid, Inventory item list,
  and the public menu. Supabase Storage bucket (public read, staff
  write only), verified end to end with a real test insert flowing
  through to the public menu view.
- ✅ **Item Import/Export (CSV)** — matches Loyverse's own export
  column structure exactly, so a business migrating off Loyverse can
  import their existing catalog file directly with zero reformatting
  (bracketed per-store columns like `Price [Store Name]` are detected
  and read correctly). Verified against a real Loyverse export file's
  header row and sample data, not synthetic test data — confirmed
  names/categories/prices parse correctly and a non-numeric price
  ("variable") falls back to 0 instead of crashing the import. New
  categories are auto-created on import. Cost is never imported or
  exported as an editable value — consistent with the rest of the
  platform, it stays derived from real GRNs only.
- ✅ **Transfer order screen** — staff can move stock warehouse → store
  from a real form, with a full history list
- ✅ Purchase orders screen (plan a purchase, send to supplier) +
  "Mark received" which auto-generates the GRN into the warehouse
- ✅ Stock adjustments screen (damage, loss, theft, expired, correction,
  manual receive — reason-driven, negative reasons block going below 0)
- ✅ Inventory counts (stocktake) — partial or full, expected vs
  physically counted, reconciles against current stock on completion
  (not stale snapshot, avoids race conditions with sales/transfers
  during the count)
- ✅ Suppliers directory (expanded: contact, phone, email, address)
- ✅ Inventory history — unified audit log (stock_movements table),
  every GRN/transfer/sale/adjustment/production/count writes here
  automatically
- ✅ Inventory valuation report (total inventory value, retail value,
  potential profit, margin — per item and overall)
- ✅ Production (composite items) — turn ingredients into a made item
  (e.g. a cocktail), output cost computed automatically from what was
  actually consumed, not manually entered

**Phase 2 is fully complete.**

## Phase 3 — Bar Flow
- ✅ Barman-side receiving screen — kanban board (New → Preparing →
  Ready), auto-refreshes every 5s so waiters/barmen see updates without
  a manual reload
- ✅ Open tickets / bar tabs (live in Finance → Payments now, since
  they're the same underlying "unsettled order" concept)
- ⬜ Push notification when order is ready (currently requires being on
  the Bar Flow screen; polling isn't the same as a notification)

## Phase 4 — Finance
- ✅ Payment confirmation workflow — record a payment against an open
  ticket, confirm or reject it; confirming enough payments auto-settles
  the order; rejecting auto-creates staff debt (trigger already existed,
  now has a real UI)
- ✅ Sales summary report — date range, gross sales, cost of goods,
  gross profit, margin, daily trend chart, per-day table. Fully matches
  the Loyverse reference layout, including the Discounts card that was
  previously missing.
- ✅ Full reports suite under Finance → Reports: Sales by item,
  Sales by category, Sales by employee, Sales by payment type,
  Discounts (per-order breakdown), Taxes (VAT collected) — matching
  the full Loyverse reports menu
- ✅ Historical accuracy fix: sale cost is now snapshotted at the moment
  of sale (order_items.unit_cost), so profit reports stay correct even
  after item costs change later via new GRNs
- ⬜ Nigerian tax engine beyond VAT (PAYE needs a payroll module, not
  built)
- ✅ Full P&L report — Revenue → Refunds → Net revenue → COGS
  → Gross profit → Expenses (by category) → Net profit, date-range
  filterable, at Finance → Profit & Loss
- ✅ Refunds — issued against any settled order, tracked in their own
  auditable table (not a negative payment), correctly subtracted in
  both Sales Summary and P&L
- ✅ Discounts — flat or percentage, applied at settlement; the
  payment-confirmation trigger now correctly checks against the
  discounted total, not the full price
- ✅ Expense tracking — categorized (Rent, Salaries, Utilities,
  Maintenance, Marketing, Other — auto-seeded for every new business),
  with a running list and total

## Phase 5 — Customers & Loyalty
- ✅ Customer database (name, phone, email, notes)
- ✅ Loyalty program — auto-awards 1 point per ₦100 spent when an
  order settles; POS looks up or creates a customer by phone at the
  till so points accrue from real sales, not a separate manual step
- ✅ Online menu (view-only, public, no login) — see Phase 6 below,
  built together since they share the same underlying customer-facing
  surface

## Phase 6 — Multi-domain architecture
- ✅ Public menu feature itself — live at `/menu/:slug` (e.g.
  `/menu/rogers-lounge`), reads from a dedicated `public_menu_items`
  VIEW that exposes only name/price/category/business name — no
  cost, no stock, no internal data, regardless of how it's queried
  (stronger guarantee than RLS alone, verified: exactly 6 safe columns
  exist on the view)
- ⬜ **Blocked on infrastructure, not code**: true wildcard subdomains
  (`{tenant-slug}.sellaris.com`) require owning `sellaris.com` and
  configuring wildcard DNS in Vercel — neither has happened yet.
  The feature above is the real implementation; moving it to its own
  subdomain later is a domain/DNS step, not a rebuild.
- ⬜ `v.sellaris.com` — all tenant dashboards/POS (works today on
  `sellaris-mu.vercel.app`; renaming needs the same domain purchase)
- ⬜ `sellaris.com` — landing page
- ⬜ `sellaris.com/login` — staff login entry point
- ⬜ Public ordering (customers order directly from the public menu) —
  paused for now, revisit later

## Phase 7 — Notifications & hardware
- ✅ Telegram notification pipeline — database side ready
  (`tenants.telegram_chat_id`, `get_low_stock_items()`), Settings page
  has the field to configure it. **One manual step left**: creating
  the actual Telegram bot via @BotFather requires a Telegram account
  — that's on you, not something I can do. Once you have a bot
  token, I'll build the Supabase Edge Function that actually sends
  messages (the piece that needs the token to exist first).
- ✅ Receipt printer support — Web Bluetooth (mobile) and Web
  Serial (desktop/cable) both wired into POS as real print buttons
  after an order is sent to bar. Built against the standard ESC/POS
  command set. **Untested against real hardware** — needs an actual
  thermal printer to confirm the exact service/characteristic UUIDs
  match (these vary by manufacturer); the code is structurally correct
  but this is the honest gap until real hardware is in hand.

## Phase 8 — Platform-level
- ✅ Super Admin console (`/admin`) — platform-wide KPIs (total
  businesses, active in 30 days, all-time GMV) and a business list.
  Locked behind `AdminGuard`, checking a real `platform_admins` table
  (not a hardcoded email) via a security-definer function. Your
  TicketPass NG account is the first platform admin.
- ✅ Self-serve onboarding wizard (`/signup`) — a genuinely new
  business can sign up, name their business, and get a tenant +
  warehouse (auto) + main store + owner staff role, all in one atomic
  database call. This is what makes Sellaris actually multi-tenant in
  practice, not just in schema — previously the only way to get a
  business onto the platform was me manually inserting rows.
- ✅ Settings page — feature toggles matched against the Loyverse
  reference (shifts, time clock, kitchen printers, customer display,
  dining options, low stock notifications, weight-embedded barcodes),
  plus the Telegram chat ID field. Expanded into a full sub-nav
  (Features, Payment types, Loyalty, Taxes, Receipt, Stores) — VAT
  rate and loyalty percentage were previously hardcoded in the
  frontend; both are now genuinely configurable and read live by POS.
- ✅ Staff management — Employee list + Access Rights (roles), matching
  the Loyverse reference exactly (Owner/Administrator/Manager/Cashier,
  each with independent POS/Back-office toggles, tenant-customizable).
  Invite-by-email flow: an owner invites an email address, and that
  person is automatically attached as staff the moment they sign up
  with a matching email — no manual admin user creation needed.
- ✅ PWA offline mode — built with `vite-plugin-pwa` (app-shell
  precaching, service worker, branded manifest + icons) + a hand-built
  IndexedDB sync queue (via `idb`) specifically for POS sales. Verified
  with real tests, not just "it built": (1) service worker actually
  registers at runtime, (2) app reloads and renders correctly with the
  network fully disabled in a headless browser, zero errors. Offline
  sales queue locally, sync automatically on reconnect (browser's
  `online` event + a 30s fallback poll), and a sale that fails to sync
  (e.g. stock ran out from other sales while offline) is marked
  visible-for-review in POS, not silently dropped.
- ✅ PIN-based quick login per device — one real email/password login
  per staff per till, then instant PIN switching after that (cached
  session, not a server-side auth factor — see README for the real
  mechanism). Handles refresh-token rotation correctly.
  **Neither PWA-offline-sales nor PIN-login has been exercised by a
  real logged-in user yet** — both need live testing, since neither
  can be simulated from this sandbox (no authenticated session
  possible here).

## Phase 9 — Launch prep
- ✅ Deploy frontend to Vercel — live at https://sellaris-mu.vercel.app,
  connected to GitHub for auto-deploy on every push
- ⬜ Backend API on Hostinger VPS (webhooks, WhatsApp, Paystack)
- ⬜ Real pricing/billing wired to Paystack
- ⬜ TicketPass hotel integration webhook bridge

---

## How to use this doc
Say "what's next" or "where are we" any time and I'll check this file
and tell you exactly what's done and what's queued. When we finish
something, I'll flip its box and commit the update — so this file is
always the current source of truth, not memory.
