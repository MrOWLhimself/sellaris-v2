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
- ✅ Barman-side receiving screen — kanban board (New \u2192 Preparing \u2192
  Ready), auto-refreshes every 5s so waiters/barmen see updates without
  a manual reload
- ✅ Open tickets / bar tabs (live in Finance \u2192 Payments now, since
  they're the same underlying "unsettled order" concept)
- ⬜ Push notification when order is ready (currently requires being on
  the Bar Flow screen; polling isn't the same as a notification)

## Phase 4 — Finance
- ✅ Payment confirmation workflow — record a payment against an open
  ticket, confirm or reject it; confirming enough payments auto-settles
  the order; rejecting auto-creates staff debt (trigger already existed,
  now has a real UI)
- ✅ Sales summary report — date range, gross sales, cost of goods,
  gross profit, margin, daily trend chart, per-day table
- ✅ Historical accuracy fix: sale cost is now snapshotted at the moment
  of sale (order_items.unit_cost), so profit reports stay correct even
  after item costs change later via new GRNs
- ⬜ Nigerian tax engine beyond VAT (PAYE needs a payroll module, not
  built)
- ⬜ Full P&L report (needs expense tracking, not built)
- ⬜ Refunds/discounts (not tracked yet \u2014 sales summary currently
  shows gross = net, noted honestly in the UI itself)

## Phase 5 — Customers & Loyalty
- ✅ Customer database (name, phone, email, notes)
- ✅ Loyalty program \u2014 auto-awards 1 point per \u20a6100 spent when an
  order settles; POS looks up or creates a customer by phone at the
  till so points accrue from real sales, not a separate manual step
- ✅ Online menu (view-only, public, no login) \u2014 see Phase 6 below,
  built together since they share the same underlying customer-facing
  surface

## Phase 6 — Multi-domain architecture
- ✅ Public menu feature itself \u2014 live at `/menu/:slug` (e.g.
  `/menu/rogers-lounge`), reads from a dedicated `public_menu_items`
  VIEW that exposes only name/price/category/business name \u2014 no
  cost, no stock, no internal data, regardless of how it's queried
  (stronger guarantee than RLS alone, verified: exactly 6 safe columns
  exist on the view)
- ⬜ **Blocked on infrastructure, not code**: true wildcard subdomains
  (`{tenant-slug}.sellaris.com`) require owning `sellaris.com` and
  configuring wildcard DNS in Vercel \u2014 neither has happened yet.
  The feature above is the real implementation; moving it to its own
  subdomain later is a domain/DNS step, not a rebuild.
- ⬜ `v.sellaris.com` — all tenant dashboards/POS (works today on
  `sellaris-mu.vercel.app`; renaming needs the same domain purchase)
- ⬜ `sellaris.com` — landing page
- ⬜ `sellaris.com/login` — staff login entry point
- ⬜ Public ordering (customers order directly from the public menu) —
  biggest single feature, deliberately last

## Phase 7 — Notifications & hardware
- ⬜ Telegram bot — owner/manager notifications (new sale, low stock,
  big order)
- ⬜ Receipt printer support — mobile (Bluetooth or cable), desktop
  (cable/USB)

## Phase 8 — Platform-level
- ⬜ Super Admin console (`/admin`) — platform KPIs, MRR/ARR, tenant
  management, support tickets
- ⬜ Business onboarding wizard (self-serve signup for new tenants,
  not just the manual claim-ownership flow used for Roger's Lounge)
- ⬜ Settings page — feature toggles matched against Loyverse's set
  (shifts, time clock, kitchen printers, customer display, dining
  options, low stock notifications, weight-embedded barcodes)
- ⬜ PWA offline mode (works through power/data outages)

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
