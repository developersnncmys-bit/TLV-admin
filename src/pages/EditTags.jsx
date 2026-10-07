import { useEffect, useState } from 'react'
import { editTags as api, products as prodApi } from '../api/client'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { IconCalendar, IconPlus, IconPencil, IconTrash } from '../components/icons'

const PAGE = 6

const COLORS = [
  { key: 'rose',   label: 'Rose',   grad: 'linear-gradient(135deg,#e66e8c,#a21c45)' },
  { key: 'gold',   label: 'Gold',   grad: 'linear-gradient(135deg,#dfc06d,#ab7a24)' },
  { key: 'maroon', label: 'Maroon', grad: 'linear-gradient(135deg,#c12a55,#6e1936)' },
  { key: 'ink',    label: 'Ink',    grad: 'linear-gradient(135deg,#616373,#36363e)' },
]
const CYCLE = ['ink', 'gold', 'maroon', 'rose']
const gradOf = (c, i) =>
  COLORS.find((x) => x.key === c.color)?.grad ||
  COLORS.find((x) => x.key === CYCLE[i % CYCLE.length]).grad

const EMPTY = { name: '', color: 'ink', tagline: '', order: '' }

export default function EditTags() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [stats, setStats] = useState({})
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [page, setPage] = useState(1)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))
  useEffect(() => {
    load()
    prodApi.list().then((ps) => {
      const s = {}
      ps.forEach((p) => {
        const key = p.editTag
        if (!key) return
        s[key] = s[key] || { products: 0 }
        s[key].products += 1
      })
      setStats(s)
    }).catch(() => {})
  }, [])

  function openNew() { setForm(EMPTY); setEditing({}) }
  function openEdit(c) {
    setForm({
      name: c.name || '',
      color: c.color || 'ink',
      tagline: c.tagline || '',
      order: c.order != null ? String(c.order) : '',
    })
    setEditing(c)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.bad('Tag name is required')
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        color: form.color,
        tagline: form.tagline.trim(),
        order: Number(form.order) || 0,
      }
      if (editing.id) { await api.update(editing.id, payload); toast.ok('Edit tag updated') }
      else { await api.create(payload); toast.ok('Edit tag added') }
      setEditing(null); load()
    } catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  async function doDelete() {
    setSaving(true)
    try { await api.remove(confirm.id); toast.ok('Edit tag deleted'); setConfirm(null); load() }
    catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>The Edit</h1>
          <p>Curated groups — Statement, New, Limited, Designer</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}><IconPlus size={18} /> New Edit Tag</button>
        </div>
      </div>

      {!rows ? <div className="spinner" /> : rows.length === 0 ? (
        <div className="card"><div className="empty"><div className="em-ico">✨</div><p>No edit tags yet</p></div></div>
      ) : (
        <>
          <div className="prod-grid">
            {rows.slice((page - 1) * PAGE, page * PAGE).map((c, i) => {
              const st = stats[c.id] || { products: 0 }
              return (
                <div className="cat-card" key={c.id}>
                  <div className="cat-banner" style={{ background: gradOf(c, i) }}>
                    <IconCalendar size={38} />
                  </div>
                  <div className="cat-body">
                    <div className="cat-head">
                      <h3>{c.name}</h3>
                      <div className="cell-actions">
                        <button className="icon-btn" title="Edit" onClick={() => openEdit(c)}><IconPencil size={15} /></button>
                        <button className="icon-btn danger" title="Delete" onClick={() => setConfirm(c)}><IconTrash size={15} /></button>
                      </div>
                    </div>
                    <div className="cat-stats">
                      <div>
                        <div className="cat-num">{st.products}</div>
                        <div className="cat-lbl">Pieces</div>
                      </div>
                      <div>
                        <div className="cat-num maroon">{c.order || 0}</div>
                        <div className="cat-lbl">Order</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <Pagination page={page} pageSize={PAGE} total={rows.length} onChange={setPage} />
        </>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit Tag' : 'New Edit Tag'}
          subtitle={editing.id ? editing.id : 'Group pieces for The Edit page'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Create'}
              </button>
            </>
          }
        >
          <form onSubmit={save}>
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Tag name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Statement Pieces"
                disabled={!!editing.id}
                autoFocus
              />
              {editing.id && <span className="img-hint">Id is fixed once created.</span>}
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Tagline</label>
              <textarea
                value={form.tagline}
                onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                placeholder="e.g. The pieces that command a room — a chandelier, a mirror, a sculpted form scaled to be seen."
                rows={2}
              />
              <span className="img-hint">Italic caption under this edit section on The Edit page.</span>
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Display order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                placeholder="0"
              />
              <span className="img-hint">Lower numbers appear first on The Edit page.</span>
            </div>

            <div className="field full">
              <label>Accent colour</label>
              <div className="color-grid">
                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c.key}
                    className={`color-swatch ${form.color === c.key ? 'active' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, color: c.key }))}
                  >
                    <span className="cs-chip" style={{ background: c.grad }} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete edit tag"
          message={`Delete "${confirm.name}"? Pieces keep their tag field but the group is removed.`}
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}
    </>
  )
}
