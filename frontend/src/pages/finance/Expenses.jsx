import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Input'

const naira = (n) => `\u20a6${Number(n).toLocaleString('en-NG')}`

export default function Expenses() {
  const { staff } = useAuth()
  const [categories, setCategories] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10))

  async function load() {
    setLoading(true)
    const [{ data: cats }, { data: exp }] = await Promise.all([
      supabase.from('expense_categories').select('id, name').eq('tenant_id', staff.tenant_id).order('name'),
      supabase
        .from('expenses')
        .select('id, amount, description, expense_date, expense_categories(name)')
        .eq('tenant_id', staff.tenant_id)
        .order('expense_date', { ascending: false })
        .limit(50),
    ])
    setCategories(cats || [])
    if (cats?.length && !categoryId) setCategoryId(cats[0].id)
    setExpenses(exp || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [staff.tenant_id])

  async function addExpense(e) {
    e.preventDefault()
    if (!Number(amount) || Number(amount) <= 0) return
    setSaving(true)
    await supabase.from('expenses').insert({
      tenant_id: staff.tenant_id,
      branch_id: staff.branch_id,
      category_id: categoryId || null,
      amount: Number(amount),
      description,
      expense_date: expenseDate,
      recorded_by: staff.id,
    })
    setSaving(false)
    setAmount(''); setDescription('')
    setShowForm(false)
    load()
  }

  if (loading) return <p className="text-[13px] text-[var(--ink-text-muted)]">Loading\u2026</p>

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-[13px] text-[var(--ink-text-muted)]">
          Rent, salaries, utilities \u2014 anything outside cost of goods. Last 50 shown, total {naira(total)}.
        </p>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add expense'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={addExpense} className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--radius)] p-5 mb-6">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Category</Label>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
          </div>
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className="mb-4" />
          <Button type="submit" variant="primary" disabled={saving} className="w-full">
            {saving ? 'Saving\u2026' : 'Save expense'}
          </Button>
        </form>
      )}

      <div className="bg-[var(--surface-2)] rounded-[var(--radius)] overflow-hidden">
        {expenses.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-text-faint)] p-5">No expenses recorded yet.</p>
        ) : (
          expenses.map((e, i) => (
            <div key={e.id} className={`flex justify-between items-center p-4 ${i !== expenses.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
              <div>
                <div className="text-[13px] font-medium">{e.expense_categories?.name || 'Uncategorized'}</div>
                <div className="text-[12px] text-[var(--ink-text-muted)]">{e.description || '\u2014'} \u00b7 {e.expense_date}</div>
              </div>
              <span className="font-[var(--font-mono)] text-[13px] text-[var(--danger)]">{naira(e.amount)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
