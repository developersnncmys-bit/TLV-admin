import { useEffect, useMemo, useState } from 'react'
import {
  payments as api, orders as ordersApi, customers as customersApi,
} from '../api/client'
import { inr, inrK, fmtDate, titleCase } from '../lib/format'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import {
  IconPlus, IconSearch, IconPencil, IconTrash, IconDownload,
  IconWallet, IconClock, IconRefresh, IconRupee,
} from '../components/icons'

const PAGE = 10

const STATUS_FLOW = ['paid', 'pending', 'refunded']
const STATUS_CLASS = { paid: 'green', pending: 'amber', refunded: 'red' }

const METHODS = [
  { k: 'upi',   label: 'UPI' },
  { k: 'card',  label: 'Card' },
  { k: 'bank',  label: 'Bank transfer' },
  { k: 'cash',  label: 'Cash' },
  { k: 'wire',  label: 'International wire' },
]
const METHOD_LABEL = Object.fromEntries(METHODS.map((m) => [m.k, m.label]))

const EMPTY = {
  ref: '',
  orderId: '',
  customer: { name: '', email: '' },
  amount: 0,
  method: 'upi',
  status: 'paid',
  reference: '',
  notes: '',
}

const initials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export default function Payments() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))

  useEffect(() => {
    load()
    ordersApi.list().then(setOrders).catch(() => {})
    customersApi.list().then(setCustomers).catch(() => {})
  }, [])

  useEffect(() => { setPage(1) }, [q, statusFilter])

  const summary = useMemo(() => {
    const base = { collected: 0, pending: 0, refunded: 0, count: 0 }
    if (!rows) return base
    rows.forEach((p) => {
      base.count += 1
      const amt = Number(p.amount) || 0
      if (p.status === 'paid') base.collected += amt
      else if (p.status === 'pending') base.pending += amt
      else if (p.status === 'refunded') base.refunded += amt
    })
    return base
  }, [rows])

  const filtered = useMemo(() => {
    if (!rows) return []
    const query = q.trim().toLowerCase()
    return rows.filter((p) => {
      if (statusFilter !== 'all' && (p.status || 'pending') !== statusFilter) return false
      if (!query) return true
      const hay = [
        p.ref || p.id, p.orderId, p.reference,
        p.customer?.name, p.customer?.email, p.notes,
      ].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(query)
    })
  }, [rows, q, statusFilter])

  const paged = filtered.slice((page - 1) * PAGE, page * PAGE)

  // ---- Modal helpers ---------------------------------------------------
  function openNew() {
    setForm({ ...EMPTY, customer: { ...EMPTY.customer } })
    setEditing({})
  }

  function openEdit(p) {
    setForm({
      ref: p.ref || p.id || '',
      orderId: p.orderId || '',
      customer: {
        name: p.customer?.name || '',
        email: p.customer?.email || '',
      },
      amount: Number(p.amount) || 0,
      method: p.method || 'upi',
      status: p.status || 'paid',
      reference: p.reference || '',
      notes: p.notes || '',
    })
    setEditing(p)
  }

  function pickOrder(orderId) {
    if (!orderId) {
      setForm((f) => ({ ...f, orderId: '' }))
      return
    }
    const o = orders.find((x) => x.id === orderId)
    if (!o) return
    setForm((f) => ({
      ...f,
      orderId,
      customer: {
        name: o.customer?.name || f.customer.name,
        email: o.customer?.email || f.customer.email,
      },
      amount: Number(o.amount) || f.amount,
    }))
  }

  async function save(e) {
    if (e && e.preventDefault) e.preventDefault()
    if (!form.customer.name.trim()) return toast.bad('Customer name is required')
    const amount = Math.max(0, Number(form.amount) || 0)
    if (amount <= 0) return toast.bad('Amount must be greater than zero')

    setSaving(true)
    try {
      const payload = {
        ref: form.ref.trim() || undefined,
        orderId: form.orderId || '',
        customer: {
          name: form.customer.name.trim(),
          email: form.customer.email.trim(),
        },
        amount,
        currency: 'INR',
        method: form.method,
        status: form.status,
        reference: form.reference.trim(),
        notes: form.notes.trim(),
      }
      if (editing.id) {
        await api.update(editing.id, payload)
        toast.ok('Payment updated')
      } else {
        await api.create(payload)
        toast.ok('Payment recorded')
      }
      setEditing(null)
      load()
    } catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  async function doDelete() {
    setSaving(true)
    try {
      await api.remove(confirm.id)
      toast.ok('Payment removed')
      setConfirm(null)
      load()
    } catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  async function changeStatus(p, status) {
    try {
      await api.update(p.id, { status })
      load()
    } catch (e) { toast.bad(e.message) }
  }

  // CSV export (no server — just a client-side download).
  function exportCsv() {
    const header = ['Payment ID', 'Order', 'Customer', 'Email', 'Amount (INR)', 'Method', 'Status', 'Reference', 'Date', 'Notes']
    const esc = (v) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [header.join(',')]
    filtered.forEach((p) => {
      lines.push([
        p.ref || p.id,
        p.orderId || '',
        p.customer?.name || '',
        p.customer?.email || '',
        Number(p.amount) || 0,
        METHOD_LABEL[p.method] || p.method || '',
        p.status || '',
        p.reference || '',
        p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : '',
        p.notes || '',
      ].map(esc).join(','))
    })
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `luxe-payments-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.ok(`Exported ${filtered.length} payment${filtered.length === 1 ? '' : 's'}`)
  }

  const chips = [
    { k: 'all',      label: 'All',      n: rows?.length || 0 },
    { k: 'paid',     label: 'Paid',     n: rows?.filter((p) => p.status === 'paid').length || 0 },
    { k: 'pending',  label: 'Pending',  n: rows?.filter((p) => p.status === 'pending').length || 0 },
    { k: 'refunded', label: 'Refunded', n: rows?.filter((p) => p.status === 'refunded').length || 0 },
  ]

  const statCards = [
    { label: 'Collected',    value: inrK(summary.collected), Icon: IconWallet },
    { label: 'Pending',      value: inrK(summary.pending),   Icon: IconClock },
    { label: 'Refunded',     value: inrK(summary.refunded),  Icon: IconRefresh },
    { label: 'Transactions', value: summary.count,           Icon: IconRupee },
  ]

  // Customer autocomplete list (unique names from stored customers +
  // any names already seen on an order/payment).
  const customerNames = useMemo(() => {
    const set = new Set()
    customers.forEach((c) => c.name && set.add(c.name))
    orders.forEach((o) => o.customer?.name && set.add(o.customer.name))
    rows?.forEach((p) => p.customer?.name && set.add(p.customer.name))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [customers, orders, rows])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Payments</h1>
          <p>Track transactions, settlements and refunds · {summary.count} on the ledger</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={exportCsv} disabled={!rows?.length}>
            <IconDownload size={16} /> Export
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <IconPlus size={18} /> Record Payment
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
        <div className="search-box grow">
          <IconSearch size={18} />
          <input
            placeholder="Search by payment #, order, customer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {!rows ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="em-ico">💳</div>
            <p>No payments match this filter</p>
          </div>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Order</th>
                    <th>Customer</th>
                    <th className="num">Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700 }}>{p.ref || p.id}</td>
                      <td>
                        {p.orderId
                          ? <span style={{ fontWeight: 600 }}>{p.orderId}</span>
                          : <span style={{ color: 'var(--glass-text-muted)' }}>—</span>}
                      </td>
                      <td>
                        <div className="person">
                          <span className="avatar">{initials(p.customer?.name)}</span>
                          <div>
                            <div className="p-name">{p.customer?.name || '—'}</div>
                            {p.customer?.email && (
                              <div className="p-sub">{p.customer.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="num" style={{ fontWeight: 700 }}>{inr(p.amount)}</td>
                      <td style={{ textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.4, color: 'var(--glass-text-muted)' }}>
                        {METHOD_LABEL[p.method] || p.method || '—'}
                      </td>
                      <td>
                        <select
                          className={`order-status-select st-${p.status || 'pending'}`}
                          value={p.status || 'pending'}
                          onChange={(e) => changeStatus(p, e.target.value)}
                        >
                          {STATUS_FLOW.map((s) => (
                            <option key={s} value={s}>{titleCase(s)}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ color: 'var(--glass-text-muted)' }}>{fmtDate(p.createdAt)}</td>
                      <td>
                        <div className="cell-actions">
                          <button className="icon-btn" title="Edit" onClick={() => openEdit(p)}>
                            <IconPencil size={15} />
                          </button>
                          <button className="icon-btn danger" title="Delete" onClick={() => setConfirm(p)}>
                            <IconTrash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} />
        </>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit Payment' : 'Record Payment'}
          subtitle={editing.id ? (editing.ref || editing.id) : 'Log a payment received against an order'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Record Payment'}
              </button>
            </>
          }
        >
          <form onSubmit={save}>
            <div className="field full">
              <label>Link to order</label>
              <select
                value={form.orderId}
                onChange={(e) => pickOrder(e.target.value)}
              >
                <option value="">— None —</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.ref || o.id} · {o.customer?.name || '—'} · {inr(o.amount)}
                  </option>
                ))}
              </select>
              <span className="img-hint">
                Picking an order fills customer and amount. Leave as "None" for standalone payments
                (consultation fees, deposits, etc.).
              </span>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Customer</label>
                <input
                  value={form.customer.name}
                  onChange={(e) => setForm((f) => ({ ...f, customer: { ...f.customer, name: e.target.value } }))}
                  placeholder="e.g. Ananya Iyer"
                  list="payment-customer-list"
                  autoFocus={!editing.id}
                />
                <datalist id="payment-customer-list">
                  {customerNames.map((n) => <option key={n} value={n} />)}
                </datalist>
              </div>
              <div className="field">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: Math.max(0, Number(e.target.value) || 0) }))}
                  placeholder="142500"
                />
              </div>
            </div>

            <div className="field full" style={{ marginTop: 14 }}>
              <label>Method</label>
              <select
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
              >
                {METHODS.map((m) => <option key={m.k} value={m.k}>{m.label}</option>)}
              </select>
            </div>

            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="field">
                <label>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_FLOW.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                </select>
              </div>
              <div className="field">
                <label>External reference</label>
                <input
                  value={form.reference}
                  onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                  placeholder="Gateway txn id, cheque #, UTR…"
                />
              </div>
            </div>

            <div className="field full" style={{ marginTop: 14 }}>
              <label>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Deposit, final payment, partial refund…"
              />
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete payment"
          message={`Delete ${confirm.ref || confirm.id} (${inr(confirm.amount)})? The linked order is not affected, but the ledger entry is permanently removed.`}
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
