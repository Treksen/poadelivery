import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../utils'
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function VendorMenu() {
  const { profile }         = useAuth()
  const [vendor, setVendor] = useState(null)
  const [categories, setCategories] = useState([])
  const [items, setItems]   = useState([])
  const [showItemForm, setShowItemForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]     = useState({ name: '', description: '', price: '', category_id: '', is_available: true, is_popular: false })
  const [saving, setSaving] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  useEffect(() => {
    if (!profile) return
    supabase.from('vendors').select('*').eq('owner_id', profile.id).maybeSingle()
      .then(({ data }) => {
        setVendor(data)
        if (data) {
          supabase.from('menu_categories').select('*').eq('vendor_id', data.id).order('sort_order').then(({ data: c }) => setCategories(c || []))
          supabase.from('menu_items').select('*').eq('vendor_id', data.id).then(({ data: i }) => setItems(i || []))
        }
      })
  }, [profile])

  const saveItem = async () => {
    if (!form.name || !form.price) { toast.error('Name and price required'); return }
    setSaving(true)
    const payload = { ...form, price: Number(form.price), vendor_id: vendor.id }
    let error
    if (editItem) {
      ;({ error } = await supabase.from('menu_items').update(payload).eq('id', editItem.id))
    } else {
      ;({ error } = await supabase.from('menu_items').insert(payload))
    }
    if (error) toast.error(error.message)
    else {
      toast.success(editItem ? 'Item updated' : 'Item added')
      supabase.from('menu_items').select('*').eq('vendor_id', vendor.id).then(({ data }) => setItems(data || []))
      setShowItemForm(false); setEditItem(null)
      setForm({ name: '', description: '', price: '', category_id: '', is_available: true, is_popular: false })
    }
    setSaving(false)
  }

  const deleteItem = async (id) => {
    if (!confirm('Delete this item?')) return
    await supabase.from('menu_items').delete().eq('id', id)
    setItems(p => p.filter(i => i.id !== id))
    toast.success('Item deleted')
  }

  const addCategory = async () => {
    if (!newCatName.trim()) return
    const { data } = await supabase.from('menu_categories').insert({ vendor_id: vendor.id, name: newCatName.trim(), sort_order: categories.length }).select().single()
    setCategories(p => [...p, data])
    setNewCatName('')
    toast.success('Category added')
  }

  const startEdit = (item) => {
    setEditItem(item)
    setForm({ name: item.name, description: item.description || '', price: item.price, category_id: item.category_id || '', is_available: item.is_available, is_popular: item.is_popular })
    setShowItemForm(true)
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="page-header" style={{ margin: 0 }}>
          <h1 className="page-title">Menu</h1>
          <p className="page-subtitle">{items.length} items</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditItem(null); setForm({ name: '', description: '', price: '', category_id: '', is_available: true, is_popular: false }); setShowItemForm(true) }}>
          <Plus size={14} /> Add item
        </button>
      </div>

      {/* Add category */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Categories</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {categories.map(c => (
            <span key={c.id} className="badge badge-blue">{c.name}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" placeholder="New category name" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={addCategory}><Plus size={14} /></button>
        </div>
      </div>

      {/* Item form modal */}
      {showItemForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700 }}>{editItem ? 'Edit item' : 'Add menu item'}</h3>
              <button className="btn-icon" onClick={() => setShowItemForm(false)}><X size={16} /></button>
            </div>
            {[['name', 'Item name', 'text', 'e.g. Nyama Choma'],['description','Description','text','Short description'],['price','Price (KES)','number','e.g. 450']].map(([key, label, type, ph]) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input className="form-input" type={type} placeholder={ph} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}>
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              {[['is_available', 'Available'], ['is_popular', 'Mark as popular']].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowItemForm(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={saveItem} disabled={saving}>
                {saving ? 'Saving...' : editItem ? 'Update item' : 'Add item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items list */}
      {categories.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => <ItemRow key={item.id} item={item} onEdit={startEdit} onDelete={deleteItem} />)}
        </div>
      ) : (
        categories.map(cat => {
          const catItems = items.filter(i => i.category_id === cat.id)
          return (
            <div key={cat.id} style={{ marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 10, color: 'var(--text-secondary)' }}>{cat.name} <span style={{ fontSize: 12, fontWeight: 400 }}>({catItems.length})</span></h3>
              {catItems.map(item => <ItemRow key={item.id} item={item} onEdit={startEdit} onDelete={deleteItem} />)}
            </div>
          )
        })
      )}
    </div>
  )
}

function ItemRow({ item, onEdit, onDelete }) {
  return (
    <div className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</span>
          {item.is_popular && <span className="badge badge-orange" style={{ fontSize: 9 }}>Popular</span>}
          {!item.is_available && <span className="badge badge-gray" style={{ fontSize: 9 }}>Unavailable</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.description}</div>
        <div style={{ fontWeight: 700, color: 'var(--poa-green-dark)', marginTop: 4, fontSize: 13 }}>{formatCurrency(item.price)}</div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-icon" onClick={() => onEdit(item)}><Edit2 size={13} /></button>
        <button className="btn-icon" style={{ color: '#DC2626' }} onClick={() => onDelete(item.id)}><Trash2 size={13} /></button>
      </div>
    </div>
  )
}
