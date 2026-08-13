// The universal core of Sellaris — every tenant, regardless of
// business type, has these. Not gated behind enabled_modules at all,
// since they're not optional.
export const CORE_NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/inventory', label: 'Inventory' },
  { to: '/finance', label: 'Finance' },
  { to: '/shifts', label: 'Shifts' },
  { to: '/customers', label: 'Customers' },
  { to: '/staff', label: 'Staff' },
  { to: '/settings', label: 'Settings' },
]

// Optional operational-layer modules — activated per tenant by
// business type at signup (tenants.enabled_modules), editable later.
// "pos" is technically optional too: a pure service/wholesale/B2B
// business might run entirely on invoices, no till at all.
export const MODULE_NAV_ITEMS = {
  pos: { to: '/pos', label: 'POS / Till' },
  bar_flow: { to: '/bar-flow', label: 'Bar flow' },
}

// Insert POS right after Dashboard, everything else optional after
// Inventory, matching a natural "sell → stock → operate" reading order.
export function getNavItemsForModules(enabledModules = []) {
  const items = [CORE_NAV_ITEMS[0]] // Dashboard

  if (enabledModules.includes('pos')) items.push(MODULE_NAV_ITEMS.pos)
  if (enabledModules.includes('bar_flow')) items.push(MODULE_NAV_ITEMS.bar_flow)

  items.push(...CORE_NAV_ITEMS.slice(1)) // Inventory, Finance, Customers, Staff, Settings
  return items
}

// Shown at signup — matches the universal-core-plus-operational-layer
// model. Types without a dedicated built industry layer yet still get
// the full universal core; they just don't see hospitality-only nav
// items they'd never use.
export const BUSINESS_TYPES = [
  { value: 'retail', label: 'Retail' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar_lounge', label: 'Bar & Lounge' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'salon', label: 'Salon & Beauty' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'services', label: 'Professional Services' },
  { value: 'other', label: 'Other' },
]
