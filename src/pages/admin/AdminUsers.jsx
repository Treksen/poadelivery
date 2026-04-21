import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../utils'
import {
  Plus, Search, Edit2, Trash2, X, Eye, EyeOff,
  UserCheck, Users, Truck, Store, ShieldCheck, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Constants ────────────────────────────────────────────────
const ROLES = ['customer', 'rider', 'vendor', 'admin']
const ROLE_BADGE = {
  customer: { bg: '#EEF2FF', color: '#4338CA', label: 'Customer' },
  rider:    { bg: '#FFF7ED', color: '#C2410C', label: 'Rider' },
  vendor:   { bg: '#F0FDF4', color: '#15803D', label: 'Vendor' },
  admin:    { bg: '#FDF4FF', color: '#7E22CE', label: 'Admin' },
}
const ROLE_ICON = { customer: Users, rider: Truck, vendor: Store, admin: ShieldCheck }

// ── Confirm dialog helper ────────────────────────────────────
function useConfirm() {
  const [state, setState] = useState(null)
  const resolve = useRef(null)

  const confirm = (msg) =>
    new Promise((res) => { setState(msg); resolve.current = res })

  const handleYes = () => { setState(null); resolve.current?.(true) }
  const handleNo  = () => { setState(null); resolve.current?.(false) }

  const Dialog = () =>
    state ? (
      <div style={{ position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center' }}>
        <div style={{ background:'var(--bg-card)',borderRadius:14,padding:'28px 32px',maxWidth:380,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}>
          <p style={{ fontWeight:600,fontSize:15,marginBottom:22,color:'var(--text-primary)',lineHeight:1.5 }}>{state}</p>
          <div style={{ display:'flex',gap:10,justifyContent:'flex-end' }}>
            <button onClick={handleNo}  className="btn" style={{ background:'var(--bg-elevated)',color:'var(--text-secondary)' }}>Cancel</button>
            <button onClick={handleYes} className="btn btn-danger">Delete</button>
          </div>
        </div>
      </div>
    ) : null

  return { confirm, Dialog }
}

// ── User Modal (Create / Edit) ────────────────────────────────
function UserModal({ user, onClose, onSaved }) {
  const isNew = !user

  const [form, setForm] = useState({
    name:     user?.name     || '',
    email:    user?.email    || '',
    phone:    user?.phone    || '',
    role:     user?.role     || 'customer',
    password: '',
  })
  const [showPass,  setShowPass]  = useState(false)
  const [saving,    setSaving]    = useState(false)

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim())  return toast.error('Name is required')
    if (!form.email.trim()) return toast.error('Email is required')
    if (isNew && !form.password) return toast.error('Password is required for new users')

    setSaving(true)
    try {
      if (isNew) {
        // 1. Create auth user via Supabase Admin API (client-side signUp)
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email:    form.email.trim(),
          password: form.password,
          options:  { data: { name: form.name.trim(), role: form.role } },
        })
        if (authErr) throw authErr

        const uid = authData?.user?.id
        if (!uid) throw new Error('User created but no ID returned')

        // 2. Upsert profile row with the correct role
        const { error: profErr } = await supabase.from('profiles').upsert({
          id:    uid,
          name:  form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          role:  form.role,
        })
        if (profErr) throw profErr

        toast.success(`${ROLE_BADGE[form.role].label} account created ✅`)
        onSaved({ id: uid, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim()||null, role: form.role, created_at: new Date().toISOString() })
      } else {
        // Update profile row
        const updates = {
          name:  form.name.trim(),
          phone: form.phone.trim() || null,
          role:  form.role,
        }
        const { error: profErr } = await supabase.from('profiles').update(updates).eq('id', user.id)
        if (profErr) throw profErr

        toast.success('User updated ✅')
        onSaved({ ...user, ...updates })
      }
      onClose()
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "var(--bg-main)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 460,
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div>
            <h2
              style={{
                fontWeight: 800,
                fontSize: 18,
                fontFamily: "var(--font-display)",
              }}
            >
              {isNew ? "Create User" : "Edit User"}
            </h2>
            {!isNew && (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                ID: {user?.id?.slice(0, 16) || "—"}…
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Role selector */}
        <div style={{ marginBottom: 20 }}>
          <label className="form-label">Role</label>
          <div
            style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}
          >
            {ROLES.map((r) => {
              const { bg, color, label } = ROLE_BADGE[r];
              const Icon = ROLE_ICON[r];
              return (
                <button
                  key={r}
                  onClick={() => setForm((p) => ({ ...p, role: r }))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 99,
                    border: `2px solid ${form.role === r ? color : "var(--border)"}`,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    background: form.role === r ? bg : "transparent",
                    color: form.role === r ? color : "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}
                >
                  <Icon size={13} /> {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fields */}
        <div className="form-group">
          <label className="form-label">Full name *</label>
          <input
            className="form-input"
            value={form.name}
            onChange={set("name")}
            placeholder="e.g. Jane Kamau"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Email address *</label>
          <input
            className="form-input"
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="jane@example.com"
            disabled={!isNew}
            style={!isNew ? { opacity: 0.6 } : {}}
          />
          {!isNew && (
            <div
              style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}
            >
              Email cannot be changed after creation
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Phone number</label>
          <input
            className="form-input"
            value={form.phone}
            onChange={set("phone")}
            placeholder="+254 7XX XXX XXX"
          />
        </div>

        {isNew && (
          <div className="form-group">
            <label className="form-label">Password *</label>
            <div style={{ position: "relative" }}>
              <input
                className="form-input"
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                placeholder="Min. 6 characters"
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 0,
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
          <button
            className="btn"
            onClick={onClose}
            style={{
              flex: 1,
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 2 }}
          >
            {saving ? "Saving…" : isNew ? "Create user" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main AdminUsers component ─────────────────────────────────
export default function AdminUsers() {
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [modal,      setModal]      = useState(null)   // null | 'create' | user-object
  const { confirm, Dialog: ConfirmDialog } = useConfirm()

  // ── Load profiles ──────────────────────────────────────────
  // const loadUsers = async () => {
  //   setLoading(true)
  //   const { data, error } = await supabase
  //     .from('profiles')
  //     .select('id, name, email, phone, role, created_at, is_active')
  //     .order('created_at', { ascending: false })
  //   if (error) toast.error(error.message)
  //   setUsers(data || [])
  //   setLoading(false)
  // }
  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, phone, role, created_at, is_active")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (err) {
      console.error("Load users error:", err);
      toast.error("Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers() }, [])

  // ── Filter ─────────────────────────────────────────────────
 const filtered = (users || []).filter((u) => {
   if (!u) return false;
   const matchRole = roleFilter === "all" || u.role === roleFilter;
   const q = search.toLowerCase();
   const matchSearch =
     !q ||
     u.name?.toLowerCase().includes(q) ||
     u.email?.toLowerCase().includes(q) ||
     u.phone?.includes(q);
   return matchRole && matchSearch;
 });

  // ── Counts ─────────────────────────────────────────────────
  const counts = ROLES.reduce((acc, r) => ({ ...acc, [r]: users.filter(u => u.role === r).length }), {})

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = async (user) => {
    const yes = await confirm(`Delete "${user.name}" (${user.email})?\n\nThis removes their profile. Their auth account may still exist.`)
    if (!yes) return
    const { error } = await supabase.from('profiles').delete().eq('id', user.id)
    if (error) return toast.error(error.message)
    setUsers(p => p.filter(u => u.id !== user.id))
    toast.success('User deleted')
  }

  // ── Toggle active ──────────────────────────────────────────
  const toggleActive = async (user) => {
    const next = !user.is_active
    const { error } = await supabase.from('profiles').update({ is_active: next }).eq('id', user.id)
    if (error) return toast.error(error.message)
    setUsers(p => p.map(u => u.id === user.id ? { ...u, is_active: next } : u))
    toast.success(next ? 'User activated' : 'User deactivated')
  }

  // ── Modal save callback ────────────────────────────────────
  const handleSaved = (saved) => {
    setUsers(prev => {
      const idx = prev.findIndex(u => u.id === saved.id)
      if (idx === -1) return [saved, ...prev]
      const next = [...prev]
      next[idx] = saved
      return next
    })
  }

  return (
    <div className="page">
      <ConfirmDialog />
      {modal && (
        <UserModal
          user={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={(saved) => { handleSaved(saved); setModal(null) }}
        />
      )}

      {/* Header */}
      <div className="page-header" style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12 }}>
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{users.length} total accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')} style={{ display:'flex',alignItems:'center',gap:7 }}>
          <Plus size={15}/> Create User
        </button>
      </div>

      {/* Role tab counts */}
      <div style={{ display:'flex',gap:10,flexWrap:'wrap',marginBottom:20 }}>
        {[['all', 'All', users.length], ...ROLES.map(r => [r, ROLE_BADGE[r].label, counts[r]])].map(([r, label, count]) => {
          const active = roleFilter === r
          const { color, bg } = ROLE_BADGE[r] || { color:'var(--text-primary)', bg:'var(--bg-elevated)' }
          return (
            <button key={r} onClick={() => setRoleFilter(r)}
              style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:99,border:`1.5px solid ${active ? color : 'var(--border)'}`,cursor:'pointer',fontSize:12,fontWeight:700,background: active ? bg : 'transparent',color: active ? color : 'var(--text-secondary)',transition:'all 0.15s' }}>
              {label}
              <span style={{ background: active ? color : 'var(--border)', color: active ? '#fff' : 'var(--text-muted)', borderRadius:99, padding:'1px 7px', fontSize:10, fontWeight:800 }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:20, maxWidth:380 }}>
        <Search size={15} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)' }}/>
        <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or phone…" style={{ paddingLeft:36 }} />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display:'flex',alignItems:'center',gap:10,padding:40,color:'var(--text-muted)' }}><div className="spinner"/>Loading users…</div>
      ) : (
        <div className="card" style={{ padding:0,overflow:'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding:48, textAlign:'center', color:'var(--text-muted)' }}>
              <Users size={36} style={{ margin:'0 auto 12px',opacity:0.3 }}/>
              <p style={{ fontWeight:600 }}>No users found</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th style={{ textAlign:'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => {
                    const { bg, color, label } = ROLE_BADGE[u.role] || ROLE_BADGE.customer
                    const Icon = ROLE_ICON[u.role] || Users
                    return (
                      <tr key={u.id}>
                        {/* User cell */}
                        <td>
                          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                            <div style={{ width:34,height:34,borderRadius:10,background:bg,color,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,flexShrink:0 }}>
                              {u.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div style={{ fontWeight:700,fontSize:13 }}>{u.name}</div>
                              <div style={{ fontSize:11,color:'var(--text-muted)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td>
                          <span style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:99,background:bg,color,fontSize:11,fontWeight:700 }}>
                            <Icon size={11}/>{label}
                          </span>
                        </td>

                        {/* Phone */}
                        <td style={{ fontSize:13,color:'var(--text-secondary)' }}>{u.phone || <span style={{ color:'var(--text-muted)' }}>—</span>}</td>

                        {/* Status */}
                        <td>
                          <button onClick={() => toggleActive(u)}
                            style={{ padding:'3px 10px',borderRadius:99,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,background: u.is_active!==false ? 'var(--poa-green-light)' : '#FEE2E2', color: u.is_active!==false ? 'var(--poa-green-dark)' : '#DC2626' }}>
                            {u.is_active !== false ? '● Active' : '● Inactive'}
                          </button>
                        </td>

                        {/* Joined */}
                        <td style={{ fontSize:11,color:'var(--text-muted)',whiteSpace:'nowrap' }}>{u.created_at ? formatDateTime(u.created_at) : '—'}</td>

                        {/* Actions */}
                        <td>
                          <div style={{ display:'flex',gap:6,justifyContent:'flex-end' }}>
                            <button onClick={() => setModal(u)} title="Edit user"
                              style={{ padding:'6px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-elevated)',cursor:'pointer',color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:4,fontSize:12,fontWeight:600 }}>
                              <Edit2 size={13}/> Edit
                            </button>
                            <button onClick={() => handleDelete(u)} title="Delete user"
                              style={{ padding:'6px 10px',borderRadius:8,border:'1px solid #FCA5A5',background:'#FEF2F2',cursor:'pointer',color:'#DC2626',display:'flex',alignItems:'center',gap:4,fontSize:12,fontWeight:600 }}>
                              <Trash2 size={13}/> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p style={{ fontSize:12,color:'var(--text-muted)',marginTop:12,textAlign:'right' }}>
          Showing {filtered.length} of {users.length} users
        </p>
      )}
    </div>
  )
}
