import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG')}`

export default function PublicMenu() {
  const { slug } = useParams()
  const [items, setItems] = useState([])
  const [businessName, setBusinessName] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('public_menu_items')
        .select('id, name, price, category_name, business_name')
        .eq('tenant_slug', slug)
        .order('category_name')

      if (cancelled) return
      if (error || !data || data.length === 0) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setBusinessName(data[0].business_name)
      setItems(data)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  // Public page: its own minimal dark theme, not wrapped in the staff AppShell
  const grouped = items.reduce((acc, item) => {
    const cat = item.category_name || 'Menu'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-[var(--ink)] text-[var(--ink-text)] p-6">
      <div className="max-w-[560px] mx-auto pt-8">
        {loading ? (
          <p className="text-[13px] text-[var(--ink-text-muted)] text-center">Loading menu\u2026</p>
        ) : notFound ? (
          <div className="text-center pt-16">
            <div className="font-[var(--font-display)] text-[20px] font-semibold mb-3">
              Sell<span className="text-[var(--violet-bright)]">aris</span>
            </div>
            <p className="text-[13px] text-[var(--ink-text-muted)]">
              No menu found for "{slug}".
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="font-[var(--font-display)] text-[26px] font-medium mb-1">{businessName}</h1>
              <p className="text-[12px] text-[var(--ink-text-faint)] font-[var(--font-mono)] uppercase tracking-wide">Menu</p>
            </div>

            {Object.entries(grouped).map(([category, catItems]) => (
              <div key={category} className="mb-7">
                <h2 className="text-[12px] uppercase tracking-wide text-[var(--gold)] mb-3">{category}</h2>
                <div className="flex flex-col gap-3">
                  {catItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-baseline pb-3 border-b border-[var(--line)]">
                      <span className="text-[14px]">{item.name}</span>
                      <span className="font-[var(--font-mono)] text-[13px] text-[var(--ink-text-muted)] whitespace-nowrap ml-4">
                        {naira(item.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <p className="text-center text-[11px] text-[var(--ink-text-faint)] mt-10 mb-6">
              Powered by Sell<span className="text-[var(--violet-bright)]">aris</span>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
