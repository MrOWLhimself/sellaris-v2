# Sellaris — Build Roadmap

Living checklist. Update this file as each step ships, so progress is
always visible at a glance — no need to scroll chat history to remember
where we are.

Legend: ✅ done and verified · 🔜 next up · ⬜ not started

---

## Phase 1 — Foundation
- ✅ GitHub repo set up, real backup (no more lost files)
- ✅ Design system: colors, type, component library (Button, Card, Badge,
  Input, Table, RunningTotalStrip) — real React code, not mockups
- ✅ Supabase project created, dedicated to Sellaris
- ✅ Core multi-tenant schema: tenants, branches, staff, categories, items

## Phase 2 — POS + Inventory core
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
