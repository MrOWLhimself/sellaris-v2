import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'

// Export/import for items. The import side is deliberately tolerant
// of a REAL Loyverse export file (bracketed per-store columns like
// "Price [Store Name]"), so migrating off Loyverse is a real,
// one-file operation rather than a manual re-entry job. Cost is never
// imported or exported as an editable field — it stays derived from
// GRNs, consistent with the rest of the platform.

export function exportItemsCsv(rows, branches) {
  const headers = [
    'Name', 'Category', 'Description', 'SKU', 'Barcode', 'Price', 'Cost',
    'Track stock', 'Available for sale',
    ...branches.map((b) => `In stock [${b.name}]`),
  ]

  const lines = rows.map((r) => {
    const stockByBranch = Object.fromEntries((r.stockByBranch || []).map((sb) => [sb.branchId, sb.stock]))
    return [
      r.name,
      r.categoryName === '\u2014' ? '' : r.categoryName,
      r.description || '',
      r.sku || '',
      r.barcode || '',
      r.price,
      r.cost,
      r.track_stock === false ? 'N' : 'Y',
      r.is_active === false ? 'N' : 'Y',
      ...branches.map((b) => stockByBranch[b.id] ?? 0),
    ]
  })

  const csv = Papa.unparse({ fields: headers, data: lines })
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sellaris-items-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function findHeader(headers, matcher) {
  return headers.find(matcher) || null
}

// Parses a CSV (ours or a real Loyverse export) into a preview list,
// tolerant of Loyverse's exact column names including bracketed
// per-store columns.
export function parseItemsCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || []
        const nameCol = findHeader(headers, (h) => h === 'Name')
        const categoryCol = findHeader(headers, (h) => h === 'Category')
        const descCol = findHeader(headers, (h) => h === 'Description')
        const skuCol = findHeader(headers, (h) => h === 'SKU')
        const barcodeCol = findHeader(headers, (h) => h === 'Barcode')
        const trackStockCol = findHeader(headers, (h) => h === 'Track stock')
        const activeCol = findHeader(headers, (h) => h.startsWith('Available for sale'))
        // "Price [Store]" but never "Purchase cost" — we never import cost.
        const priceCol = findHeader(headers, (h) => h.startsWith('Price') && !h.toLowerCase().includes('purchase'))

        if (!nameCol) {
          reject(new Error('No "Name" column found in this file.'))
          return
        }

        const parsed = results.data
          .map((row) => {
            const name = row[nameCol]?.trim()
            if (!name) return null
            const rawPrice = priceCol ? row[priceCol] : ''
            const price = rawPrice && !isNaN(Number(rawPrice)) ? Number(rawPrice) : 0
            return {
              name,
              category: categoryCol ? row[categoryCol]?.trim() || null : null,
              description: descCol ? row[descCol]?.trim() || null : null,
              sku: skuCol ? row[skuCol]?.trim() || null : null,
              barcode: barcodeCol ? row[barcodeCol]?.trim() || null : null,
              price,
              trackStock: trackStockCol ? row[trackStockCol]?.trim().toUpperCase() !== 'N' : true,
              isActive: activeCol ? row[activeCol]?.trim().toUpperCase() !== 'N' : true,
            }
          })
          .filter(Boolean)

        resolve(parsed)
      },
      error: (err) => reject(err),
    })
  })
}

// Commits parsed rows: creates any missing categories first, then
// bulk-inserts items. Cost is never set here — new items always start
// at ₦0.00 and only rise via a real GRN.
export async function importItems(tenantId, parsedRows) {
  const { data: existingCats } = await supabase.from('categories').select('id, name').eq('tenant_id', tenantId)
  const catMap = new Map((existingCats || []).map((c) => [c.name.toLowerCase(), c.id]))

  const neededCatNames = [...new Set(parsedRows.map((r) => r.category).filter(Boolean))]
    .filter((name) => !catMap.has(name.toLowerCase()))

  if (neededCatNames.length > 0) {
    const { data: created, error } = await supabase
      .from('categories')
      .insert(neededCatNames.map((name) => ({ tenant_id: tenantId, name })))
      .select('id, name')
    if (error) throw error
    for (const c of created) catMap.set(c.name.toLowerCase(), c.id)
  }

  const toInsert = parsedRows.map((r) => ({
    tenant_id: tenantId,
    category_id: r.category ? catMap.get(r.category.toLowerCase()) || null : null,
    name: r.name,
    description: r.description,
    sku: r.sku,
    barcode: r.barcode,
    price: r.price,
    track_stock: r.trackStock,
    is_active: r.isActive,
  }))

  const { error, data } = await supabase.from('items').insert(toInsert).select('id')
  if (error) throw error
  return data.length
}
