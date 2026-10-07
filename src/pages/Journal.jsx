import { useEffect, useState } from 'react'
import { journal as api } from '../api/client'
import { uploadImage, isImageSrc } from '../lib/image'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { IconPlus, IconPencil, IconTrash } from '../components/icons'

const PAGE = 6

const CATEGORIES = ['Guide', 'Studio', 'Interior', 'Craft', 'Object', 'Conversation']

const EMPTY = {
  id: '',
  name: '',
  category: 'Guide',
  region: '',
  author: 'The Luxe Version',
  hero: '',
  pull_quote: '',
  body: '',
  order: 0,
}

export default function Journal() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [page, setPage] = useState(1)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))
  useEffect(() => { load() }, [])

  function openNew() { setForm(EMPTY); setEditing({}) }

  function openEdit(s) {
    setForm({
      id: s.id || '',
      name: s.name || '',
      category: s.category || 'Guide',
      region: s.region || '',
      author: s.author || 'The Luxe Version',
      hero: s.hero || '',
      pull_quote: s.pull_quote || '',
      body: s.body || '',
      order: Number(s.order) || 0,
    })
    setEditing(s)
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setForm((f) => ({ ...f, hero: url }))
      toast.ok('Image added')
    } catch (err) {
      toast.bad(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function save(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.bad('Entry title is required')

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        region: form.region.trim(),
        author: form.author.trim(),
        hero: form.hero,
        pull_quote: form.pull_quote.trim(),
        body: form.body.trim(),
        order: Number(form.order) || 0,
      }
      if (editing.id) {
        await api.update(editing.id, payload)
        toast.ok('Journal entry updated')
      } else {
        await api.create({ ...payload, id: form.id.trim() || undefined })
        toast.ok('Journal entry added')
      }
      setEditing(null)
      load()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function doDelete() {
    setSaving(true)
    try {
      await api.remove(confirm.id)
      toast.ok('Journal entry deleted')
      setConfirm(null)
      load()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>The Studio — Journal</h1>
          <p>Essays, guides and portraits — quiet notes on the pieces</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}><IconPlus size={18} /> New Entry</button>
        </div>
      </div>

      {!rows ? <div className="spinner" /> : rows.length === 0 ? (
        <div className="card"><div className="empty"><div className="em-ico">📖</div><p>No journal entries yet</p></div></div>
      ) : (
        <>
          <div className="prod-grid">
            {rows.slice((page - 1) * PAGE, page * PAGE).map((s) => (
              <div className="cat-card" key={s.id}>
                <div
                  className="cat-banner"
                  style={{
                    background: isImageSrc(s.hero)
                      ? `url(${s.hero}) center/cover`
                      : 'linear-gradient(135deg,#616373,#36363e)',
                  }}
                >
                  {!isImageSrc(s.hero) && <span style={{ color: '#fff', fontSize: 40 }}>📖</span>}
                </div>
                <div className="cat-body">
                  <div className="cat-head">
                    <h3>{s.name}</h3>
                    <div className="cell-actions">
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(s)}><IconPencil size={15} /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setConfirm(s)}><IconTrash size={15} /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--glass-text-muted)', marginTop: 4 }}>
                    {s.category}{s.region ? ` · ${s.region}` : ''}
                  </div>
                  {s.pull_quote && (
                    <div style={{ fontSize: 12, color: 'var(--glass-text-soft)', marginTop: 8, lineHeight: 1.4, fontStyle: 'italic' }}>
                      "{s.pull_quote.length > 110 ? s.pull_quote.slice(0, 110) + '…' : s.pull_quote}"
                    </div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--glass-text-muted)' }}>
                    Order {s.order || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE} total={rows.length} onChange={setPage} />
        </>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit Journal Entry' : 'New Journal Entry'}
          subtitle={editing.id ? editing.id : 'Add an essay, guide or studio note'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || uploading}>
                {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Create'}
              </button>
            </>
          }
        >
          <form onSubmit={save}>
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Title *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. At the Ceramic Studio"
                autoFocus
              />
            </div>

            {!editing.id && (
              <div className="field full" style={{ marginBottom: 14 }}>
                <label>Slug (optional)</label>
                <input
                  value={form.id}
                  onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                  placeholder="Auto-derived from title if left blank"
                />
                <span className="img-hint">Used in URLs. Cannot be changed after creation.</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="field">
                <label>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Author</label>
                <input
                  value={form.author}
                  onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                  placeholder="The Luxe Version"
                />
              </div>
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Region / location</label>
              <input
                value={form.region}
                onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                placeholder="e.g. Jaipur"
              />
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Hero image</label>
              {isImageSrc(form.hero) && (
                <div style={{ marginBottom: 8 }}>
                  <img
                    src={form.hero}
                    alt=""
                    style={{ maxWidth: 220, height: 'auto', borderRadius: 6, border: '1px solid #e5e5ea' }}
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={onFile}
                disabled={uploading}
              />
              {uploading && <span className="img-hint">Processing…</span>}
              {form.hero && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ marginTop: 6, fontSize: 12 }}
                  onClick={() => setForm((f) => ({ ...f, hero: '' }))}
                >
                  Remove image
                </button>
              )}
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Pull quote</label>
              <input
                value={form.pull_quote}
                onChange={(e) => setForm((f) => ({ ...f, pull_quote: e.target.value }))}
                placeholder="One memorable line pulled from the piece."
              />
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Body</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Full essay or guide. Markdown is fine."
                rows={8}
              />
            </div>

            <div className="field full">
              <label>Display order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                placeholder="0"
              />
              <span className="img-hint">Lower numbers appear first on The Studio page.</span>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete entry"
          message={`Delete "${confirm.name}"? This removes it from The Studio.`}
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}
    </>
  )
}
