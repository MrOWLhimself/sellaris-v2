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
- ⬜ Stock adjustments screen (damage, loss, manual correction)
- ⬜ Inventory counts (stocktake)
- ✅ Suppliers directory
- ⬜ Inventory valuation report

## Phase 3 — Bar Flow
- ⬜ Barman-side receiving screen (sees orders sent from POS, marks
  items ready)
- ⬜ Waiter notification when order is ready to serve
- ⬜ Open tickets / bar tabs (save order before payment)

## Phase 4 — Finance
- ⬜ Nigerian tax engine (VAT, PAYE)
- ⬜ P&L report
- ⬜ Payment confirmation workflow + staff debt (schema already built,
  needs UI)
- ⬜ Sales summary report (matched against the Loyverse screenshots —
  gross sales, refunds, discounts, net sales, gross profit, trend chart)

## Phase 5 — Customers & Loyalty
- ⬜ Customer database
- ⬜ Loyalty program
- ⬜ Online menu (view-only, tenant dashboard side)

## Phase 6 — Multi-domain architecture
- ⬜ `v.sellaris.com` — all tenant dashboards/POS, resolved by staff
  session (mostly already true of what we've built — needs real
  subdomain deployment)
- ⬜ `sellaris.com` — landing page
- ⬜ `sellaris.com/login` — staff login entry point
- ⬜ `{tenant-slug}.sellaris.com` — public menu, wildcard subdomain,
  no login required, separate lightweight app
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
- ⬜ Deploy frontend to Vercel
- ⬜ Backend API on Hostinger VPS (webhooks, WhatsApp, Paystack)
- ⬜ Real pricing/billing wired to Paystack
- ⬜ TicketPass hotel integration webhook bridge

---

## How to use this doc
Say "what's next" or "where are we" any time and I'll check this file
and tell you exactly what's done and what's queued. When we finish
something, I'll flip its box and commit the update — so this file is
always the current source of truth, not memory.
