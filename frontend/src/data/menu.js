// Placeholder menu data. Shape mirrors what the Supabase `items` table
// will return once wired up, so swapping this for a real fetch later
// is a drop-in change, not a rewrite.

export const categories = ['All', 'Drinks', 'Food', 'Bar']

export const menuItems = [
  { id: 'itm_1', name: 'Amber Star', price: 1500, category: 'Drinks', stock: 42 },
  { id: 'itm_2', name: 'Chapman', price: 2000, category: 'Drinks', stock: 18 },
  { id: 'itm_3', name: 'Hennessy VS (shot)', price: 3500, category: 'Bar', stock: 9 },
  { id: 'itm_4', name: 'Smirnoff Ice', price: 1800, category: 'Drinks', stock: 30 },
  { id: 'itm_5', name: 'Peppersoup \u2014 goat', price: 3500, category: 'Food', stock: 14 },
  { id: 'itm_6', name: 'Suya platter', price: 3500, category: 'Food', stock: 20 },
  { id: 'itm_7', name: 'Small chops', price: 4000, category: 'Food', stock: 11 },
  { id: 'itm_8', name: 'Jollof rice \u2014 chicken', price: 3000, category: 'Food', stock: 25 },
  { id: 'itm_9', name: 'Grey Goose (shot)', price: 4500, category: 'Bar', stock: 6 },
]

export const VAT_RATE = 0.075
