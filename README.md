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
