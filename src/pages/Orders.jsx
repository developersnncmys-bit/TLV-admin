import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { orders as api, products as prodApi } from '../api/client'
import { inr, fmtDate, titleCase } from '../lib/format'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { IconPlus, IconSearch, IconPencil, IconTrash } from '../components/icons'

const STATUS_FLOW = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
const PAYMENT_OPTIONS = ['paid', 'pending', 'refunded']
const PAGE = 8

const PAYMENT_CLASS = {
  paid: 'green',
  pending: 'amber',
  refunded: 'red',
}

const initials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

// Simplified single-product shape. Multi-item seed data still renders
// in the table (first item + "+N more") but editing collapses to the
// headline piece — matches the Thridhavarnam-style single-line order.
const EMPTY = {
  ref: '',
  customer: { name: '', city: '' },
  productId: '',
  qty: 1,
  amount: 0,
  payment: 'pending',
  status: 'pending',
}

export default function Orders() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [products, setProducts] = useState([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [amountTouched, setAmountTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))

  useEffect(() => {
    load()
    prodApi.list().then(setProducts).catch(() => {})
  }, [])

  useEffect(() => { setPage(1) }, [q, statusFilter])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      openNew()
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const counts = useMemo(() => {
    const base = { all: rows?.length || 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 }
    if (!rows) return base
    rows.forEach((o) => {
      const s = (o.status || 'pending').toLowerCase()
      if (base[s] != null) base[s] += 1
    })
    return base
  }, [rows])

  const filtered = useMemo(() => {
    if (!rows) return []
    const query = q.trim().toLowerCase()
    return rows.filter((o) => {
      if (statusFilter !== 'all' && (o.status || 'pending') !== statusFilter) return false
      if (!query) return true
      const hay = [
        o.ref || o.id,
        o.customer?.name, o.customer?.email, o.customer?.city,
        ...(o.items || []).map((it) => `${it.name} ${it.reference}`),
      ].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(query)
    })
  }, [rows, q, statusFilter])

  const paged = filtered.slice((page - 1) * PAGE, page * PAGE)
  const pendingCount = counts.pending

  // ---- Modal helpers ---------------------------------------------------
  function openNew() {
    setForm({ ...EMPTY, customer: { ...EMPTY.customer } })
    setAmountTouched(false)
    setEditing({})
  }

  function openEdit(o) {
    const first = o.items?.[0]
    setForm({
      ref: o.ref || o.id || '',
      customer: {
        name: o.customer?.name || '',
        city: o.customer?.city || '',
      },
      productId: first?.productId || '',
      qty: Number(o.itemsCount) || Number(first?.qty) || 1,
      amount: Number(o.amount) || 0,
      payment: o.payment || 'pending',
      status: o.status || 'pending',
    })
    setAmountTouched(true) // existing amount is authoritative; don't auto-overwrite
    setEditing(o)
  }

  const setCustomer = (k) => (e) =>
    setForm((f) => ({ ...f, customer: { ...f.customer, [k]: e.target.value } }))

  function pickProduct(productId) {
    const p = products.find((x) => x.id === productId)
    const unit = Number(p?.price) || 0
    setForm((f) => ({
      ...f,
      productId,
      amount: amountTouched ? f.amount : unit * (Number(f.qty) || 1),
    }))
  }

  function setQty(nextQty) {
    const qty = Math.max(1, Number(nextQty) || 1)
    setForm((f) => {
      const p = products.find((x) => x.id === f.productId)
      const unit = Number(p?.price) || 0
      return {
        ...f,
        qty,
        amount: amountTouched ? f.amount : unit * qty,
      }
    })
  }

  function setAmount(v) {
    setAmountTouched(true)
    setForm((f) => ({ ...f, amount: Math.max(0, Number(v) || 0) }))
  }

  async function save(e) {
    if (e && e.preventDefault) e.preventDefault()
    if (!form.customer.name.trim()) return toast.bad('Customer name is required')
    if (!form.productId) return toast.bad('Pick a piece from the catalogue')

    const p = products.find((x) => x.id === form.productId)
    if (!p) return toast.bad('Selected piece is no longer in the catalogue')

    const qty = Math.max(1, Number(form.qty) || 1)
    const amount = Math.max(0, Number(form.amount) || 0)
    const unitPrice = qty > 0 ? Math.round(amount / qty) : amount

    setSaving(true)
    try {
      const payload = {
        ref: form.ref.trim() || undefined,
        customer: {
          name: form.customer.name.trim(),
          city: form.customer.city.trim(),
          // Preserve any existing email/phone on edit (not shown in UI).
          email: editing.customer?.email || '',
          phone: editing.customer?.phone || '',
        },
        items: [{
          productId: p.id,
          name: p.name,
          reference: p.reference || p.id,
          qty,
          price: unitPrice,
        }],
        itemsCount: qty,
        amount,
        currency: 'INR',
        payment: form.payment,
        status: form.status,
        // Preserve existing fulfilment fields when editing.
        shippingAddress: editing.shippingAddress || '',
        notes: editing.notes || '',
      }
      if (editing.id) {
        await api.update(editing.id, payload)
        toast.ok('Order updated')
      } else {
        await api.create(payload)
        toast.ok('Order created')
      }
      setEditing(null)
      load()
    } catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  async function doDelete() {
    setSaving(true)
    try {
      await api.remove(confirm.id)
      toast.ok('Order deleted')
      setConfirm(null)
      load()
    } catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  async function changeStatus(o, status) {
    try {
      await api.update(o.id, { status })
      load()
    } catch (e) { toast.bad(e.message) }
  }

  const chips = [
    { k: 'all',        label: 'All',        n: counts.all },
    { k: 'pending',    label: 'Pending',    n: counts.pending },
    { k: 'processing', label: 'Processing', n: counts.processing },
    { k: 'shipped',    label: 'Shipped',    n: counts.shipped },
    { k: 'delivered',  label: 'Delivered',  n: counts.delivered },
    { k: 'cancelled',  label: 'Cancelled',  n: counts.cancelled },
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Order Management</h1>
          <p>
            {rows
              ? `${rows.length} order${rows.length === 1 ? '' : 's'} · ${pendingCount} pending`
              : 'Loading orders…'}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}>
            <IconPlus size={18} /> New Order
          </button>
        </div>
      </div>

      <div className="card filter-bar">
        <div className="search-box grow">
          <IconSearch size={18} />
          <input
            placeholder="Search by order #, customer, piece…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="chips">
          {chips.map((c) => (
            <button
              key={c.k}
              className={`chip ${statusFilter === c.k ? 'active' : ''}`}
              onClick={() => setStatusFilter(c.k)}
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
            <div className="em-ico">📦</div>
            <p>No orders match this filter</p>
          </div>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Pieces</th>
                    <th className="num">Items</th>
                    <th className="num">Amount</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((o) => {
                    const firstItem = o.items?.[0]
                    const extra = Math.max(0, (o.items?.length || 0) - 1)
                    return (
                      <tr key={o.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{o.ref || o.id}</div>
                          <div style={{ fontSize: 12, color: 'var(--glass-text-muted)' }}>
                            {fmtDate(o.createdAt)}
                          </div>
                        </td>
                        <td>
                          <div className="person">
                            <span className="avatar">{initials(o.customer?.name)}</span>
                            <div>
                              <div className="p-name">{o.customer?.name || '—'}</div>
                              <div className="p-sub">{o.customer?.city || o.customer?.email || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ maxWidth: 320 }}>
                            {firstItem ? (
                              <>
                                <div style={{ fontWeight: 600 }}>{firstItem.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--glass-text-muted)' }}>
                                  {firstItem.reference}
                                  {extra > 0 && ` · +${extra} more`}
                                </div>
                              </>
                            ) : <span style={{ color: 'var(--glass-text-muted)' }}>—</span>}
                          </div>
                        </td>
                        <td className="num">{o.itemsCount || o.items?.reduce((a, it) => a + (it.qty || 0), 0) || 0}</td>
                        <td className="num" style={{ fontWeight: 700 }}>{inr(o.amount)}</td>
                        <td>
                          <span className={`badge ${PAYMENT_CLASS[o.payment] || 'grey'}`}>
                            {titleCase(o.payment || 'pending')}
                          </span>
                        </td>
                        <td>
                          <select
                            className={`order-status-select st-${o.status || 'pending'}`}
                            value={o.status || 'pending'}
                            onChange={(e) => changeStatus(o, e.target.value)}
                          >
                            {STATUS_FLOW.map((s) => (
                              <option key={s} value={s}>{titleCase(s)}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div className="cell-actions">
                            <button
                              className="icon-btn"
                              title="Edit"
                              onClick={() => openEdit(o)}
                            >
                              <IconPencil size={15} />
                            </button>
                            <button
                              className="icon-btn danger"
                              title="Delete"
                              onClick={() => setConfirm(o)}
                            >
                              <IconTrash size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} />
        </>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit Order' : 'Create order'}
          subtitle={editing.id ? (editing.ref || editing.id) : 'Record a sale or bespoke commission'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Save order'}
              </button>
            </>
          }
        >
          <form onSubmit={save}>
            <div className="form-grid">
              <div className="field">
                <label>Customer</label>
                <input
                  value={form.customer.name}
                  onChange={setCustomer('name')}
                  placeholder="e.g. Ananya Iyer"
                  autoFocus
                />
              </div>
              <div className="field">
                <label>City</label>
                <input
                  value={form.customer.city}
                  onChange={setCustomer('city')}
                  placeholder="e.g. Chennai"
                />
              </div>
            </div>

            <div className="field full" style={{ marginTop: 14 }}>
              <label>Product</label>
              <select
                value={form.productId}
                onChange={(e) => pickProduct(e.target.value)}
              >
                <option value="">— pick from catalogue —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.reference || p.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="field">
                <label>Items</label>
                <input
                  type="number"
                  min="1"
                  value={form.qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="18999"
                />
              </div>
            </div>

            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="field">
                <label>Order status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_FLOW.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Payment</label>
                <select
                  value={form.payment}
                  onChange={(e) => setForm((f) => ({ ...f, payment: e.target.value }))}
                >
                  {PAYMENT_OPTIONS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                </select>
              </div>
            </div>

            <p className="img-hint" style={{ marginTop: 14 }}>
              Picking a piece pre-fills the amount from its selling price × items. Edit the amount
              freely for bespoke pricing or discounts.
            </p>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete order"
          message={`Delete order ${confirm.ref || confirm.id}? The customer, items and payment record are removed. This cannot be undone.`}
          confirmLabel="Yes, delete"
          cancelLabel="No, cancel"
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}
    </>
  )
}
