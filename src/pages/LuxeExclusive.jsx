import { useEffect, useState } from 'react'
import { luxeExclusive as api } from '../api/client'
import { uploadImage, isImageSrc } from '../lib/image'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { IconPlus, IconPencil, IconTrash } from '../components/icons'

const PAGE = 6

const EMPTY = {
  id: '',
  name: '',
  number: '',
  discipline: '',
  tagline: '',
  intro: '',
  body: '',
  material: '',
  dimensions: '',
  leadTime: '',
  edition: '',
  price: 0,
  image: '',
  order: 0,
}

export default function LuxeExclusive() {
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
      number: s.number || '',
      discipline: s.discipline || '',
      tagline: s.tagline || '',
      intro: s.intro || '',
      body: s.body || '',
      material: s.material || '',
      dimensions: s.dimensions || '',
      leadTime: s.leadTime || '',
      edition: s.edition || '',
      price: Number(s.price) || 0,
      image: s.image || '',
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
      setForm((f) => ({ ...f, image: url }))
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
    if (!form.name.trim()) return toast.bad('Piece name is required')

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        number: form.number.trim(),
        discipline: form.discipline.trim(),
        tagline: form.tagline.trim(),
        intro: form.intro.trim(),
        body: form.body.trim(),
        material: form.material.trim(),
        dimensions: form.dimensions.trim(),
        leadTime: form.leadTime.trim(),
        edition: form.edition.trim(),
        price: Number(form.price) || 0,
        image: form.image,
        order: Number(form.order) || 0,
      }
      if (editing.id) {
        await api.update(editing.id, payload)
        toast.ok('Piece updated')
      } else {
        await api.create({ ...payload, id: form.id.trim() || undefined })
        toast.ok('Piece added')
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
      toast.ok('Piece deleted')
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
          <h1>Luxe Exclusive</h1>
          <p>Made-to-order pieces on the /exclusive page — the first entry renders as the Featured Piece hero.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}><IconPlus size={18} /> New Piece</button>
        </div>
      </div>

      {!rows ? <div className="spinner" /> : rows.length === 0 ? (
        <div className="card"><div className="empty"><div className="em-ico">✦</div><p>No exclusive pieces yet</p></div></div>
      ) : (
        <>
          <div className="prod-grid">
            {rows.slice((page - 1) * PAGE, page * PAGE).map((s) => (
              <div className="cat-card" key={s.id}>
                <div
                  className="cat-banner"
                  style={{
                    background: isImageSrc(s.image)
                      ? `url(${s.image}) center/cover`
                      : 'linear-gradient(135deg,#616373,#36363e)',
                  }}
                >
                  {!isImageSrc(s.image) && <span style={{ color: '#fff', fontSize: 40 }}>✦</span>}
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
                    {s.number ? `${s.number} · ` : ''}{s.discipline || 'Luxe Exclusive'}
                  </div>
                  {s.tagline && (
                    <div style={{ fontSize: 12, color: 'var(--glass-text-soft)', marginTop: 8, lineHeight: 1.4, fontStyle: 'italic' }}>
                      "{s.tagline.length > 110 ? s.tagline.slice(0, 110) + '…' : s.tagline}"
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--glass-text-muted)' }}>
                      Order {s.order || 0}
                    </div>
                    {Number(s.price) > 0 && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--glass-text-soft)' }}>
                        ₹ {Number(s.price).toLocaleString('en-IN')}
                      </div>
                    )}
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
          title={editing.id ? 'Edit Luxe Exclusive Piece' : 'New Luxe Exclusive Piece'}
          subtitle={editing.id ? editing.id : 'Add a made-to-order piece to /exclusive'}
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
              <label>Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Monolithe"
                autoFocus
              />
            </div>

            {!editing.id && (
              <div className="field full" style={{ marginBottom: 14 }}>
                <label>Slug (optional)</label>
                <input
                  value={form.id}
                  onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                  placeholder="Auto-derived from name if left blank"
                />
                <span className="img-hint">Used internally. Cannot be changed after creation.</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="field">
                <label>Chapter number</label>
                <input
                  value={form.number}
                  onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                  placeholder="I, II, III…"
                />
              </div>
              <div className="field">
                <label>Discipline</label>
                <input
                  value={form.discipline}
                  onChange={(e) => setForm((f) => ({ ...f, discipline: e.target.value }))}
                  placeholder="e.g. Mantel sculpture"
                />
              </div>
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Tagline (italic line under the name)</label>
              <input
                value={form.tagline}
                onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                placeholder="e.g. The Art of Ascent."
              />
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Intro</label>
              <input
                value={form.intro}
                onChange={(e) => setForm((f) => ({ ...f, intro: e.target.value }))}
                placeholder="One sentence shown in the alternating side-by-side layout."
              />
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Body</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Longer description — one or two paragraphs."
                rows={5}
              />
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Hero image</label>
              {isImageSrc(form.image) && (
                <div style={{ marginBottom: 8 }}>
                  <img
                    src={form.image}
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
              {form.image && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ marginTop: 6, fontSize: 12 }}
                  onClick={() => setForm((f) => ({ ...f, image: '' }))}
                >
                  Remove image
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="field">
                <label>Material</label>
                <input
                  value={form.material}
                  onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
                  placeholder="e.g. Burnished bronze, hand-patinated"
                />
              </div>
              <div className="field">
                <label>Dimensions</label>
                <input
                  value={form.dimensions}
                  onChange={(e) => setForm((f) => ({ ...f, dimensions: e.target.value }))}
                  placeholder="H 1420 · W 320 · D 280 mm"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="field">
                <label>Lead time</label>
                <input
                  value={form.leadTime}
                  onChange={(e) => setForm((f) => ({ ...f, leadTime: e.target.value }))}
                  placeholder="14 – 18 weeks"
                />
              </div>
              <div className="field">
                <label>Edition</label>
                <input
                  value={form.edition}
                  onChange={(e) => setForm((f) => ({ ...f, edition: e.target.value }))}
                  placeholder="Made to order · signed"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field">
                <label>Price (INR)</label>
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0"
                />
                <span className="img-hint">Shown next to the Add-to-Bag CTA on the featured hero.</span>
              </div>
              <div className="field">
                <label>Display order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                  placeholder="0"
                />
                <span className="img-hint">Lower numbers appear first. The lowest-order piece becomes the Featured Piece.</span>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete piece"
          message={`Delete "${confirm.name}"? This removes it from the Luxe Exclusive page.`}
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}
    </>
  )
}
