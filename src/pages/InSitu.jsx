import { useEffect, useState } from 'react'
import { inSitu as api, products as prodApi } from '../api/client'
import { uploadImage, isImageSrc } from '../lib/image'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { IconMapPin, IconPlus, IconPencil, IconTrash } from '../components/icons'

const PAGE = 8

const EMPTY = {
  id: '',
  productRef: '',
  productLabel: '',
  categoryLabel: '',
  image: '',
  order: 0,
  active: true,
}

export default function InSitu() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [productOptions, setProductOptions] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [page, setPage] = useState(1)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))

  useEffect(() => {
    load()
    prodApi.list()
      .then((ps) => setProductOptions(ps.map((p) => ({
        ref: p.reference || p.id,
        name: p.name,
        category: p.category,
      }))))
      .catch(() => {})
  }, [])

  function openNew() { setForm(EMPTY); setEditing({}) }

  function openEdit(f) {
    setForm({
      id: f.id || '',
      productRef: f.productRef || '',
      productLabel: f.productLabel || '',
      categoryLabel: f.categoryLabel || '',
      image: f.image || '',
      order: Number(f.order) || 0,
      active: f.active !== false,
    })
    setEditing(f)
  }

  function onPickProduct(ref) {
    const match = productOptions.find((p) => p.ref === ref)
    setForm((f) => ({
      ...f,
      productRef: ref,
      productLabel: match?.name || f.productLabel,
      categoryLabel: match && !f.categoryLabel
        ? `In the Room · ${match.category ? match.category.charAt(0).toUpperCase() + match.category.slice(1) : ''}`
        : f.categoryLabel,
    }))
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
    if (!form.productLabel.trim()) return toast.bad('Pick a product or enter a label')
    if (!form.image) return toast.bad('Add an in-situ room photo')
    setSaving(true)
    try {
      const payload = {
        productRef: form.productRef.trim(),
        productLabel: form.productLabel.trim(),
        categoryLabel: form.categoryLabel.trim(),
        image: form.image,
        order: Number(form.order) || 0,
        active: !!form.active,
      }
      if (editing.id) {
        await api.update(editing.id, payload)
        toast.ok('Feature updated')
      } else {
        await api.create({ ...payload, id: form.id.trim() || undefined })
        toast.ok('Feature added')
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
      toast.ok('Feature deleted')
      setConfirm(null)
      load()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(f) {
    try {
      await api.update(f.id, { active: f.active === false })
      load()
    } catch (e) {
      toast.bad(e.message)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>In-Situ Features</h1>
          <p>"See the piece in the room" pairings for the Home page</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}><IconPlus size={18} /> New Feature</button>
        </div>
      </div>

      {!rows ? <div className="spinner" /> : rows.length === 0 ? (
        <div className="card"><div className="empty"><div className="em-ico">🖼️</div><p>No in-situ features yet</p></div></div>
      ) : (
        <>
          <div className="prod-grid">
            {rows.slice((page - 1) * PAGE, page * PAGE).map((f) => (
              <div className="cat-card" key={f.id}>
                <div
                  className="cat-banner"
                  style={{
                    background: isImageSrc(f.image)
                      ? `url(${f.image}) center/cover`
                      : 'linear-gradient(135deg,#616373,#36363e)',
                    opacity: f.active ? 1 : 0.55,
                  }}
                >
                  {!isImageSrc(f.image) && <IconMapPin size={32} />}
                </div>
                <div className="cat-body">
                  <div className="cat-head">
                    <h3>{f.productLabel || <span style={{ color: 'var(--glass-text-muted)' }}>Unnamed piece</span>}</h3>
                    <div className="cell-actions">
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(f)}><IconPencil size={15} /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setConfirm(f)}><IconTrash size={15} /></button>
                    </div>
                  </div>
                  {f.categoryLabel && (
                    <div style={{ fontSize: 12, color: 'var(--glass-text-muted)', marginTop: 6, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                      {f.categoryLabel}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--glass-text-muted)' }}>
                    <span>Order {f.order || 0}{f.productRef ? ` · ${f.productRef}` : ''}</span>
                    <button
                      type="button"
                      onClick={() => toggleActive(f)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        border: `1px solid ${f.active ? 'rgba(74, 222, 128, 0.35)' : 'rgba(251, 113, 133, 0.35)'}`,
                        background: f.active ? 'rgba(74, 222, 128, 0.12)' : 'rgba(251, 113, 133, 0.12)',
                        color: f.active ? '#4ade80' : '#fb7185',
                        padding: '3px 10px 3px 8px',
                        borderRadius: 999,
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: 0.4,
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                      {f.active ? 'Active' : 'Inactive'}
                    </button>
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
          title={editing.id ? 'Edit Feature' : 'New Feature'}
          subtitle={editing.id ? editing.id : 'Pair a piece with its in-situ room photo'}
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
              <label>Linked piece</label>
              <select
                value={form.productRef}
                onChange={(e) => onPickProduct(e.target.value)}
              >
                <option value="">— pick a piece (or leave empty for a custom label) —</option>
                {productOptions.map((p) => (
                  <option key={p.ref} value={p.ref}>{p.ref} — {p.name}</option>
                ))}
              </select>
              <span className="img-hint">Picking a piece auto-fills the label and category below.</span>
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Piece label *</label>
              <input
                value={form.productLabel}
                onChange={(e) => setForm((f) => ({ ...f, productLabel: e.target.value }))}
                placeholder="e.g. Vase — Onde"
              />
              <span className="img-hint">Shown as the big caption under the room photo.</span>
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Category label</label>
              <input
                value={form.categoryLabel}
                onChange={(e) => setForm((f) => ({ ...f, categoryLabel: e.target.value }))}
                placeholder="e.g. In the Room · Vases"
              />
              <span className="img-hint">Small eyebrow above the piece label on the storefront.</span>
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>In-situ photo *</label>
              {isImageSrc(form.image) && (
                <div style={{ marginBottom: 8 }}>
                  <img
                    src={form.image}
                    alt=""
                    style={{ maxWidth: 320, height: 'auto', borderRadius: 6, border: '1px solid #e5e5ea' }}
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
              <span className="img-hint">The room photo paired with the piece. Landscape or portrait both work.</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="field">
                <label>Display order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                  placeholder="0"
                />
                <span className="img-hint">Lower numbers appear first.</span>
              </div>
              <div className="field">
                <label>Status</label>
                <select
                  value={form.active ? '1' : '0'}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === '1' }))}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
                <span className="img-hint">Inactive features are hidden on the storefront.</span>
              </div>
            </div>

            {!editing.id && (
              <div className="field full">
                <label>Slug id (optional)</label>
                <input
                  value={form.id}
                  onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                  placeholder="Auto-derived if left blank"
                />
                <span className="img-hint">Cannot be changed after creation.</span>
              </div>
            )}
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete feature"
          message={`Delete "${confirm.productLabel || confirm.id}"? Storefront removes it on next page load.`}
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}
    </>
  )
}
