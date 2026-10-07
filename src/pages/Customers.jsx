import { useEffect, useMemo, useState } from 'react'
import { customers as api, orders as ordersApi } from '../api/client'
import { inr, inrK, titleCase } from '../lib/format'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import {
  IconPlus, IconSearch, IconPencil, IconTrash, IconUsers,
  IconStar, IconRupee, IconBag, IconMail, IconPhone, IconMapPin,
} from '../components/icons'

const PAGE = 9

const SEGMENTS = [
  { k: 'patron',     label: 'Patron' },
  { k: 'loyal',      label: 'Loyal' },
  { k: 'new',        label: 'New' },
  { k: 'registered', label: 'Registered' },
]
const SEGMENT_CLASS = {
  patron: 'seg-vip',
  loyal: 'seg-loyal',
  new: 'seg-new',
  registered: 'seg-registered',
}

const EMPTY = {
  name: '', email: '', phone: '', city: '', address: '',
  segment: 'new', notes: '',
}

const initials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export default function Customers() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [orders, setOrders] = useState([])
  const [q, setQ] = useState('')
  const [segFilter, setSegFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))

  useEffect(() => {
    load()
    ordersApi.list().then(setOrders).catch(() => {})
  }, [])

  useEffect(() => { setPage(1) }, [q, segFilter])

  // Build an email → { orderCount, spent } index from the orders store.
  // Customers link to orders by lowercased email (name as a fallback).
  const orderIndex = useMemo(() => {
    const idx = new Map()
    orders.forEach((o) => {
      const key = (o.customer?.email || o.customer?.name || '').trim().toLowerCase()
      if (!key) return
      const prev = idx.get(key) || { orderCount: 0, spent: 0 }
      prev.orderCount += 1
      // Cancelled/refunded orders don't count toward lifetime spent.
      if (o.payment === 'paid' && o.status !== 'cancelled') {
        prev.spent += Number(o.amount) || 0
      }
      idx.set(key, prev)
    })
    return idx
  }, [orders])

  const enriched = useMemo(() => {
    if (!rows) return []
    return rows.map((c) => {
      const key = (c.email || c.name || '').trim().toLowerCase()
      const stats = orderIndex.get(key) || { orderCount: 0, spent: 0 }
      return { ...c, orderCount: stats.orderCount, spent: stats.spent }
    })
  }, [rows, orderIndex])

  const summary = useMemo(() => {
    const total = enriched.length
    const patrons = enriched.filter((c) => c.segment === 'patron').length
    const lifetime = enriched.reduce((a, c) => a + (c.spent || 0), 0)
    const totalOrders = enriched.reduce((a, c) => a + (c.orderCount || 0), 0)
    const aov = totalOrders ? Math.round(lifetime / totalOrders) : 0
    return { total, patrons, lifetime, aov }
  }, [enriched])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return enriched.filter((c) => {
      if (segFilter !== 'all' && (c.segment || 'new') !== segFilter) return false
      if (!query) return true
      const hay = `${c.name} ${c.email} ${c.phone} ${c.city} ${c.address}`.toLowerCase()
      return hay.includes(query)
    })
  }, [enriched, q, segFilter])

  const paged = filtered.slice((page - 1) * PAGE, page * PAGE)

  // ---- Modal helpers ---------------------------------------------------
  function openNew() { setForm(EMPTY); setEditing({}) }
  function openEdit(c) {
    setForm({
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      city: c.city || '',
      address: c.address || '',
      segment: c.segment || 'new',
      notes: c.notes || '',
    })
    setEditing(c)
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save(e) {
    if (e && e.preventDefault) e.preventDefault()
    if (!form.name.trim()) return toast.bad('Customer name is required')
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        segment: form.segment,
        notes: form.notes.trim(),
      }
      if (editing.id) { await api.update(editing.id, payload); toast.ok('Customer updated') }
      else { await api.create(payload); toast.ok('Customer added') }
      setEditing(null); load()
    } catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  async function doDelete() {
    setSaving(true)
    try { await api.remove(confirm.id); toast.ok('Customer removed'); setConfirm(null); load() }
    catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  const chips = [
    { k: 'all', label: 'All', n: summary.total },
    ...SEGMENTS.map((s) => ({
      k: s.k,
      label: s.label,
      n: enriched.filter((c) => (c.segment || 'new') === s.k).length,
    })),
  ]

  const statCards = [
    { label: 'Total Customers',  value: summary.total,          Icon: IconUsers,  cls: 'c-cus' },
    { label: 'Patrons',          value: summary.patrons,        Icon: IconStar,   cls: 'c-ord' },
    { label: 'Lifetime Value',   value: inrK(summary.lifetime), Icon: IconRupee,  cls: 'c-rev' },
    { label: 'Avg. Order Value', value: inr(summary.aov),       Icon: IconBag,    cls: 'c-stk' },
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Customers</h1>
          <p>Your patron relationships in one place · {summary.total} on the book</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}>
            <IconPlus size={18} /> Add Customer
          </button>
        </div>
      </div>

      <div className="stat-grid">
        {statCards.map((c) => (
          <div className="stat stat-dark" key={c.label}>
            <div className="stat-top">
              <div className="st-ico"><c.Icon size={18} /></div>
            </div>
            <div className="st-value">{c.value}</div>
            <div className="st-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="card filter-bar">
        <div className="search-box grow">
          <IconSearch size={18} />
          <input
            placeholder="Search by name, email, phone, city…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="chips">
          {chips.map((c) => (
            <button
              key={c.k}
              className={`chip ${segFilter === c.k ? 'active' : ''}`}
              onClick={() => setSegFilter(c.k)}
            >
              {c.label} · {c.n}
            </button>
          ))}
        </div>
      </div>

      {!rows ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="em-ico">👥</div>
            <p>No customers match this filter</p>
          </div>
        </div>
      ) : (
        <>
          <div className="customer-grid">
            {paged.map((c) => (
              <div className="customer-card" key={c.id}>
                <div className="cc-head">
                  <div className="cc-ident">
                    <span className="avatar">{initials(c.name)}</span>
                    <div className="cc-ident-text">
                      <div className="cc-name">{c.name}</div>
                      <div className="cc-id">{c.id}</div>
                    </div>
                  </div>
                  <span className={`badge ${SEGMENT_CLASS[c.segment] || 'grey'}`}>
                    {titleCase(c.segment || 'new')}
                  </span>
                </div>

                <div className="cc-rows">
                  <div className="cc-row">
                    <IconMail size={14} />
                    <span>{c.email || '—'}</span>
                  </div>
                  <div className="cc-row">
                    <IconPhone size={14} />
                    <span>{c.phone || '—'}</span>
                  </div>
                  <div className="cc-row">
                    <IconMapPin size={14} />
                    <span>{c.city || c.address || '—'}</span>
                  </div>
                </div>

                <div className="cc-foot">
                  <div className="cc-foot-stat">
                    <IconBag size={14} />
                    <span><strong>{c.orderCount}</strong> order{c.orderCount === 1 ? '' : 's'}</span>
                  </div>
                  <div className="cc-foot-stat right">
                    <span className="cc-spent-l">Total spent</span>
                    <span className="cc-spent-v">{inr(c.spent)}</span>
                  </div>
                </div>

                <div className="cc-actions">
                  <button className="btn btn-outline btn-sm cc-edit" onClick={() => openEdit(c)}>
                    <IconPencil size={14} /> Edit
                  </button>
                  <button className="icon-btn danger" title="Remove" onClick={() => setConfirm(c)}>
                    <IconTrash size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} />
        </>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit Customer' : 'Add Customer'}
          subtitle={editing.id ? (editing.name || editing.id) : 'Add a new patron to the client book'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Add Customer'}
              </button>
            </>
          }
        >
          <form onSubmit={save}>
            <div className="field full">
              <label>Full name</label>
              <input
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Ananya Iyer"
                autoFocus
              />
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="name@example.com" />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
              </div>
              <div className="field">
                <label>City</label>
                <input value={form.city} onChange={set('city')} placeholder="e.g. Bengaluru" />
              </div>
              <div className="field">
                <label>Segment</label>
                <select value={form.segment} onChange={set('segment')}>
                  {SEGMENTS.map((s) => <option key={s.k} value={s.k}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="field full">
              <label>Address</label>
              <textarea
                value={form.address}
                onChange={set('address')}
                rows={2}
                placeholder="Street, locality, pincode"
              />
            </div>

            <div className="field full">
              <label>Notes</label>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={3}
                placeholder="Preferences, provenance, upcoming projects…"
              />
            </div>

            {editing.id && (
              <p className="img-hint" style={{ marginTop: 10 }}>
                Order count and lifetime spend are derived live from Orders — not editable here.
              </p>
            )}
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Remove customer"
          message={`Remove ${confirm.name} from the client book? Their orders stay intact; only the customer record is deleted.`}
          confirmLabel="Yes, remove"
          cancelLabel="No, cancel"
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}
    </>
  )
}
