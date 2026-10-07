import { useEffect, useMemo, useState } from 'react'
import { products as api, categories as catApi } from '../api/client'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { inr } from '../lib/format'
import {
  IconBox, IconAlert, IconBoxX, IconRupee, IconRefresh, IconSearch, IconPlus,
} from '../components/icons'

const PAGE_SIZE = 8
const LOW_THRESHOLD = 2
const RESTOCK_STEP = 10

const STATUS_FILTERS = [
  { key: 'any',    label: 'Any stock' },
  { key: 'active', label: 'Active' },
  { key: 'low',    label: 'Low' },
  { key: 'out',    label: 'Out of stock' },
]

function levelFor(stock) {
  if (!stock || stock === 0) return { bucket: 'out', color: 'red', pct: 0 }
  if (stock <= LOW_THRESHOLD) return { bucket: 'low', color: 'amber', pct: 25 }
  if (stock <= 10) return { bucket: 'active', color: 'blue', pct: 60 }
  return { bucket: 'active', color: 'green', pct: 100 }
}

const STATUS_PILL = {
  out:    { label: 'Out',    color: '#fb7185', border: 'rgba(251, 113, 133, 0.35)', bg: 'rgba(251, 113, 133, 0.12)' },
  low:    { label: 'Low',    color: '#f59e0b', border: 'rgba(245, 158, 11, 0.35)',  bg: 'rgba(245, 158, 11, 0.12)' },
  active: { label: 'Active', color: '#4ade80', border: 'rgba(74, 222, 128, 0.35)',  bg: 'rgba(74, 222, 128, 0.12)' },
}

export default function Inventory() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [cats, setCats] = useState([])
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('any')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState(null)
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))
  useEffect(() => {
    load()
    catApi.list().then(setCats).catch(() => {})
  }, [])
  useEffect(() => { setPage(1) }, [q, catFilter, statusFilter])

  const catName = (id) => cats.find((c) => c.id === id)?.name || id

  const stats = useMemo(() => {
    if (!rows) return { units: 0, low: 0, out: 0, value: 0 }
    let units = 0, low = 0, out = 0, value = 0
    rows.forEach((p) => {
      const s = Number(p.stock) || 0
      units += s
      if (s === 0) out += 1
      else if (s <= LOW_THRESHOLD) low += 1
      value += s * (Number(p.price) || 0)
    })
    return { units, low, out, value }
  }, [rows])

  const filtered = useMemo(() => {
    if (!rows) return []
    const needle = q.trim().toLowerCase()
    return rows.filter((p) => {
      if (catFilter !== 'all' && p.category !== catFilter) return false
      const bucket = levelFor(p.stock).bucket
      if (statusFilter !== 'any' && bucket !== statusFilter) return false
      if (needle) {
        const hay = `${p.name} ${p.reference || p.id} ${p.materials || ''} ${catName(p.category)}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, q, catFilter, statusFilter, cats])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function restockOne(p, by = RESTOCK_STEP) {
    setBusyId(p.id)
    try {
      const next = (Number(p.stock) || 0) + by
      await api.update(p.id, { stock: next })
      toast.ok(`${p.name}: +${by} units (now ${next})`)
      load()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setBusyId(null)
    }
  }

  async function restockAllLow() {
    if (!rows) return
    const targets = rows.filter((p) => (Number(p.stock) || 0) <= LOW_THRESHOLD)
    if (!targets.length) {
      setConfirmBulk(false)
      toast.ok('Nothing to restock — no low or out-of-stock pieces.')
      return
    }
    setBulkSaving(true)
    try {
      for (const p of targets) {
        const next = (Number(p.stock) || 0) + RESTOCK_STEP
        // eslint-disable-next-line no-await-in-loop
        await api.update(p.id, { stock: next })
      }
      toast.ok(`Restocked ${targets.length} piece${targets.length === 1 ? '' : 's'} by +${RESTOCK_STEP}`)
      setConfirmBulk(false)
      load()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setBulkSaving(false)
    }
  }

  const chips = [{ id: 'all', name: 'All' }, ...cats]
  const totalProducts = rows ? rows.length : 0

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Inventory</h1>
          <p>Monitor stock levels and restock alerts</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setConfirmBulk(true)}>
            <IconRefresh size={16} /> Restock all low
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat stat-dark inv-stat">
          <div className="st-ico" style={{ color: '#4ade80' }}><IconBox size={20} /></div>
          <div className="st-value">{stats.units.toLocaleString('en-IN')}</div>
          <div className="st-label">Total units</div>
        </div>
        <div className="stat stat-dark inv-stat">
          <div className="st-ico" style={{ color: '#f59e0b' }}><IconAlert size={20} /></div>
          <div className="st-value">{stats.low}</div>
          <div className="st-label">Low stock pieces</div>
        </div>
        <div className="stat stat-dark inv-stat">
          <div className="st-ico" style={{ color: '#fb7185' }}><IconBoxX size={20} /></div>
          <div className="st-value">{stats.out}</div>
          <div className="st-label">Out of stock</div>
        </div>
        <div className="stat stat-dark inv-stat">
          <div className="st-ico" style={{ color: '#dfc06d' }}><IconRupee size={20} /></div>
          <div className="st-value">{inr(stats.value)}</div>
          <div className="st-label">Stock value</div>
        </div>
      </div>

      <div className="card filter-bar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 14 }}>
        <div className="search-box grow">
          <IconSearch size={18} />
          <input
            placeholder="Search by name, SKU or category…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="chips">
          {chips.map((c) => (
            <button
              key={c.id}
              className={`chip ${catFilter === c.id ? 'active' : ''}`}
              onClick={() => setCatFilter(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="chips">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.key}
              className={`chip ${statusFilter === s.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {!rows ? (
        <div className="spinner" />
      ) : (
        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--glass-text)' }}>Stock Levels</h3>
            <span style={{ fontSize: 12.5, color: 'var(--glass-text-muted)', letterSpacing: 0.3 }}>
              {filtered.length} of {totalProducts} piece{totalProducts === 1 ? '' : 's'}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty"><div className="em-ico">📦</div><p>No pieces match these filters</p></div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr 140px 60px 140px 100px 72px',
                  gap: 14, alignItems: 'center',
                  padding: '10px 2px',
                  fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
                  color: 'var(--glass-text-muted)',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div>SKU</div>
                  <div>Piece</div>
                  <div>Category</div>
                  <div style={{ textAlign: 'right' }}>Stock</div>
                  <div>Level</div>
                  <div>Status</div>
                  <div style={{ textAlign: 'right' }}>Restock</div>
                </div>

                {paged.map((p) => {
                  const level = levelFor(p.stock)
                  const pill = STATUS_PILL[level.bucket]
                  return (
                    <div key={p.id} style={{
                      display: 'grid',
                      gridTemplateColumns: '110px 1fr 140px 60px 140px 100px 72px',
                      gap: 14, alignItems: 'center',
                      padding: '14px 2px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <div className="mono-sku" style={{ color: 'var(--glass-text-soft)' }}>
                        {p.reference || p.id}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--glass-text)', textTransform: 'uppercase', letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </div>
                        {p.materials && (
                          <div style={{ fontSize: 11.5, color: 'var(--glass-text-muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.materials}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--glass-text-soft)' }}>
                        {catName(p.category)}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 15, fontWeight: 700, color: 'var(--glass-text)', fontVariantNumeric: 'tabular-nums' }}>
                        {p.stock ?? 0}
                      </div>
                      <div>
                        <div className="level-bar" style={{ width: '100%', background: 'rgba(255,255,255,0.08)' }}>
                          <span className={level.color} style={{ width: `${level.pct}%` }} />
                        </div>
                      </div>
                      <div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          border: `1px solid ${pill.border}`,
                          background: pill.bg,
                          color: pill.color,
                          padding: '3px 10px 3px 8px',
                          borderRadius: 999,
                          fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                          {pill.label}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => restockOne(p)}
                          title={`Add ${RESTOCK_STEP} units`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            border: '1px solid rgba(255,255,255,0.25)',
                            background: 'rgba(255,255,255,0.06)',
                            color: 'var(--glass-text)',
                            padding: '5px 10px', borderRadius: 8,
                            fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
                            cursor: busyId === p.id ? 'default' : 'pointer',
                            opacity: busyId === p.id ? 0.5 : 1,
                          }}
                        >
                          <IconPlus size={13} /> {RESTOCK_STEP}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ marginTop: 16 }}>
                <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
              </div>
            </>
          )}
        </div>
      )}

      {confirmBulk && (
        <ConfirmDialog
          title="Restock all low & out-of-stock pieces"
          message={`Add +${RESTOCK_STEP} units to every piece currently at or below ${LOW_THRESHOLD} in stock. Continue?`}
          confirmLabel={bulkSaving ? 'Restocking…' : 'Yes, restock'}
          cancelLabel="Cancel"
          tone="primary"
          onConfirm={restockAllLow}
          onClose={() => setConfirmBulk(false)}
          busy={bulkSaving}
        />
      )}
    </>
  )
}
