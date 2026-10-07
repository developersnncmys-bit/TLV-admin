import { useEffect, useState } from 'react'
import { banners as api, categories as catsApi } from '../api/client'
import { uploadImage, isImageSrc } from '../lib/image'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { IconPlus, IconPencil, IconTrash } from '../components/icons'

const PAGE = 8

const EMPTY = {
  id: '',
  type: 'hero',
  page: 'home',
  weave: '',
  eyebrow: '',
  title: '',
  subtitle: '',
  body: '',
  attribution: '',
  image: '',
  mediaType: 'image',
  videoUrl: '',
  ctaLabel: '',
  ctaHref: '',
  ctaLabel2: '',
  ctaHref2: '',
  order: 0,
  active: true,
}

const TYPE_LABEL = {
  hero: 'Page hero',
  weave: 'Category tile',
  parallax: 'Feature banner',
  editorial: 'Editorial block',
  cta_band: 'CTA band',
}

const TYPE_BADGE_BG = {
  weave: '#0e4d5c',
  parallax: '#5c3d0e',
  editorial: '#2a2a3a',
  cta_band: '#4a2a4a',
}

const PAGE_OPTIONS = [
  { value: 'home',       label: 'Home' },
  { value: 'collection', label: 'The Collection' },
  { value: 'edit',       label: 'The Edit' },
  { value: 'house',      label: 'The House' },
  { value: 'studio',     label: 'The Studio' },
  { value: 'product',    label: 'Product detail (all pieces)' },
]

export default function Banners() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [categoryOptions, setCategoryOptions] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [page, setPage] = useState(1)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))
  useEffect(() => {
    load()
    catsApi.list()
      .then((cs) => setCategoryOptions(cs.map((c) => c.name).filter(Boolean)))
      .catch(() => {})
  }, [])

  function openNew() { setForm(EMPTY); setEditing({}) }

  function openEdit(b) {
    const legacyEyebrow = b.type === 'parallax' ? (b.weave || '') : ''
    setForm({
      id: b.id || '',
      type: b.type || 'hero',
      page: b.page || 'home',
      weave: b.type === 'weave' ? (b.weave || '') : '',
      eyebrow: b.eyebrow || legacyEyebrow,
      title: b.title || '',
      subtitle: b.subtitle || '',
      body: b.body || '',
      attribution: b.attribution || '',
      image: b.image || '',
      mediaType: b.mediaType || 'image',
      videoUrl: b.videoUrl || '',
      ctaLabel: b.ctaLabel || '',
      ctaHref: b.ctaHref || '',
      ctaLabel2: b.ctaLabel2 || '',
      ctaHref2: b.ctaHref2 || '',
      order: Number(b.order) || 0,
      active: b.active !== false,
    })
    setEditing(b)
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
    const t = form.type
    const canMedia = t === 'hero' || t === 'parallax' || t === 'editorial'
    const isVideo = canMedia && form.mediaType === 'video'
    if (t === 'weave') {
      if (!form.weave.trim()) return toast.bad('Pick a category for this tile')
      if (!form.image) return toast.bad('Add an image for the tile')
    } else if (t === 'parallax') {
      if (isVideo ? !form.videoUrl.trim() : !form.image) {
        return toast.bad(isVideo ? 'Add a video URL for the feature banner' : 'Add an image for the feature banner')
      }
    } else if (t === 'editorial') {
      if (!form.title.trim() && !form.body.trim() && !form.eyebrow.trim()) {
        return toast.bad('Add an eyebrow, headline or body copy')
      }
    } else if (t === 'cta_band') {
      if (!form.title.trim() && !form.body.trim()) {
        return toast.bad('Add a headline or body copy')
      }
      if (!form.ctaLabel.trim()) return toast.bad('Add at least one CTA label')
    } else if (!form.image && !form.videoUrl.trim() && !form.title.trim()) {
      return toast.bad('Add an image, a video or a title')
    }
    setSaving(true)
    try {
      const hasEyebrow = t === 'parallax' || t === 'editorial' || t === 'cta_band'
      const hasBody = t === 'editorial' || t === 'cta_band'
      const hasSubtitle = t === 'hero' || t === 'parallax'
      const hasAttribution = t === 'hero'
      const hasCta = t === 'hero' || t === 'parallax' || t === 'cta_band'
      const hasImage = t !== 'cta_band'
      const payload = {
        type: t,
        page: form.page || 'home',
        weave: t === 'weave' ? form.weave.trim() : '',
        eyebrow: hasEyebrow ? form.eyebrow.trim() : '',
        title: t !== 'weave' ? form.title.trim() : '',
        subtitle: hasSubtitle ? form.subtitle.trim() : '',
        body: hasBody ? form.body.trim() : '',
        attribution: hasAttribution ? form.attribution.trim() : '',
        image: hasImage ? form.image : '',
        mediaType: canMedia ? (form.mediaType || 'image') : 'image',
        videoUrl: canMedia ? form.videoUrl.trim() : '',
        ctaLabel: hasCta ? form.ctaLabel.trim() : '',
        ctaHref: hasCta ? form.ctaHref.trim() : '',
        ctaLabel2: hasCta ? form.ctaLabel2.trim() : '',
        ctaHref2: hasCta ? form.ctaHref2.trim() : '',
        order: Number(form.order) || 0,
        active: !!form.active,
      }
      if (editing.id) {
        await api.update(editing.id, payload)
        toast.ok('Banner updated')
      } else {
        await api.create({ ...payload, id: form.id.trim() || undefined })
        toast.ok('Banner added')
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
      toast.ok('Banner deleted')
      setConfirm(null)
      load()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(b) {
    try {
      await api.update(b.id, { active: !b.active })
      load()
    } catch (e) {
      toast.bad(e.message)
    }
  }

  const isWeave = form.type === 'weave'
  const isParallax = form.type === 'parallax'
  const isEditorial = form.type === 'editorial'
  const isCtaBand = form.type === 'cta_band'
  const isHero = form.type === 'hero'
  const hasPage = isHero || isEditorial || isCtaBand
  const hasEyebrow = isParallax || isEditorial || isCtaBand
  const hasImage = !isCtaBand
  const canMedia = isHero || isParallax || isEditorial
  const hasTitle = !isWeave
  const hasSubtitle = isHero || isParallax
  const hasBody = isEditorial || isCtaBand
  const hasAttribution = isHero
  const hasCta = isHero || isParallax || isCtaBand

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Banners</h1>
          <p>Page heroes, category tiles, feature banners, editorial blocks and CTA bands</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}><IconPlus size={18} /> New Banner</button>
        </div>
      </div>

      {!rows ? <div className="spinner" /> : rows.length === 0 ? (
        <div className="card"><div className="empty"><div className="em-ico">🖼️</div><p>No banners yet — the storefront falls back to its defaults.</p></div></div>
      ) : (
        <>
          <div className="prod-grid">
            {rows.slice((page - 1) * PAGE, page * PAGE).map((b) => (
              <div className="cat-card" key={b.id}>
                <div
                  className="cat-banner"
                  style={{
                    background: isImageSrc(b.image)
                      ? `url(${b.image}) center/cover`
                      : 'linear-gradient(135deg,#616373,#36363e)',
                    opacity: b.active ? 1 : 0.55,
                    position: 'relative',
                  }}
                >
                  {!isImageSrc(b.image) && <span style={{ color: '#fff', fontSize: 40 }}>🖼️</span>}
                  <span style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: TYPE_BADGE_BG[b.type] || '#36363e',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    {TYPE_LABEL[b.type] || TYPE_LABEL.hero}
                  </span>
                </div>
                <div className="cat-body">
                  <div className="cat-head">
                    <h3>
                      {b.type === 'weave'
                        ? (b.weave || <span style={{ color: 'var(--glass-text-muted)' }}>No category</span>)
                        : (b.title || b.eyebrow || b.weave || <span style={{ color: 'var(--glass-text-muted)' }}>Untitled banner</span>)}
                    </h3>
                    <div className="cell-actions">
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(b)}><IconPencil size={15} /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setConfirm(b)}><IconTrash size={15} /></button>
                    </div>
                  </div>
                  {b.type !== 'weave' && (b.subtitle || b.body) && (
                    <div style={{ fontSize: 12, color: 'var(--glass-text-soft)', marginTop: 6, lineHeight: 1.4 }}>
                      {(() => {
                        const txt = b.subtitle || b.body || ''
                        return txt.length > 100 ? txt.slice(0, 100) + '…' : txt
                      })()}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--glass-text-muted)' }}>
                    <span>Order {b.order || 0}</span>
                    <button
                      type="button"
                      onClick={() => toggleActive(b)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        border: `1px solid ${b.active ? 'rgba(74, 222, 128, 0.35)' : 'rgba(251, 113, 133, 0.35)'}`,
                        background: b.active ? 'rgba(74, 222, 128, 0.12)' : 'rgba(251, 113, 133, 0.12)',
                        color: b.active ? '#4ade80' : '#fb7185',
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
                      {b.active ? 'Active' : 'Inactive'}
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
          title={editing.id ? 'Edit Banner' : 'New Banner'}
          subtitle={editing.id ? editing.id : 'Hero slide, category tile or feature banner'}
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
              <label>Banner type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="hero">Page hero</option>
                <option value="weave">Category tile</option>
                <option value="parallax">Feature banner</option>
                <option value="editorial">Editorial block</option>
                <option value="cta_band">CTA band</option>
              </select>
              <span className="img-hint">
                {isWeave
                  ? 'Overrides the tile image for one category on the storefront.'
                  : isParallax
                  ? 'Full-width parallax section mid-page on the storefront.'
                  : isEditorial
                  ? 'Editorial copy block — eyebrow, headline and body text. Image optional.'
                  : isCtaBand
                  ? 'Call-to-action band — eyebrow, headline, body and one or two buttons.'
                  : 'Top-of-page hero slide — pick which page it drives below.'}
              </span>
            </div>

            {hasPage && (
              <div className="field full" style={{ marginBottom: 14 }}>
                <label>Page *</label>
                <select
                  value={form.page}
                  onChange={(e) => setForm((f) => ({ ...f, page: e.target.value }))}
                >
                  {PAGE_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <span className="img-hint">
                  {isHero
                    ? 'Hero slides are page-scoped. Each page shows the active hero with the lowest display order.'
                    : 'Which page this block renders on.'}
                </span>
              </div>
            )}

            {isWeave && (
              <div className="field full" style={{ marginBottom: 14 }}>
                <label>Category *</label>
                <select
                  value={form.weave}
                  onChange={(e) => setForm((f) => ({ ...f, weave: e.target.value }))}
                >
                  <option value="">Select a category…</option>
                  {categoryOptions.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
                <span className="img-hint">Options come from Categories. Add a category first if the one you want isn't listed.</span>
              </div>
            )}

            {hasEyebrow && (
              <div className="field full" style={{ marginBottom: 14 }}>
                <label>Eyebrow</label>
                <input
                  value={form.eyebrow}
                  onChange={(e) => setForm((f) => ({ ...f, eyebrow: e.target.value }))}
                  placeholder={isParallax ? 'Featured Edit' : isCtaBand ? 'The Studio' : 'An introduction'}
                />
                <span className="img-hint">Small all-caps label shown above the headline.</span>
              </div>
            )}

            {canMedia && (
              <div className="field full" style={{ marginBottom: 14 }}>
                <label>Media type</label>
                <select
                  value={form.mediaType}
                  onChange={(e) => setForm((f) => ({ ...f, mediaType: e.target.value }))}
                >
                  <option value="image">Image</option>
                  <option value="video">Video (with image fallback)</option>
                </select>
                <span className="img-hint">
                  {form.mediaType === 'video'
                    ? 'Video plays as the banner. Upload a poster image below as a fallback.'
                    : 'Static image banner.'}
                </span>
              </div>
            )}

            {canMedia && form.mediaType === 'video' && (
              <div className="field full" style={{ marginBottom: 14 }}>
                <label>Video URL *</label>
                <input
                  value={form.videoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                  placeholder="https://… .mp4 or hosted video URL"
                />
                <span className="img-hint">MP4 or hosted video (Vimeo, Cloudinary, etc.). Autoplayed muted on the storefront.</span>
              </div>
            )}

            {hasImage && (
              <div className="field full" style={{ marginBottom: 14 }}>
                <label>
                  {isWeave
                    ? 'Tile image *'
                    : form.mediaType === 'video'
                    ? 'Poster image (fallback)'
                    : isEditorial
                    ? 'Image (optional)'
                    : 'Banner image *'}
                </label>
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
                <span className="img-hint">
                  {isWeave
                    ? 'Square crops (1:1) fit the category rail best.'
                    : isParallax
                    ? 'Landscape crops (~16:9) work best.'
                    : isEditorial
                    ? 'Optional lead image for the editorial block.'
                    : 'Landscape crops (~16:9) fit the hero best.'}
                </span>
              </div>
            )}

            {hasTitle && (
              <div className="field full" style={{ marginBottom: 14 }}>
                <label>{isEditorial || isCtaBand ? 'Headline' : 'Title (headline)'}{isCtaBand ? ' *' : ''}</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={isParallax
                    ? 'The Sculpted Room'
                    : isEditorial
                    ? 'The collection is made of few things'
                    : isCtaBand
                    ? 'See the pieces at the studio'
                    : 'The New Collection'}
                  autoFocus
                />
              </div>
            )}

            {hasSubtitle && (
              <div className="field full" style={{ marginBottom: 14 }}>
                <label>Subtitle (supporting copy)</label>
                <textarea
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  placeholder={isParallax
                    ? 'A styled environment where every object earns its place.'
                    : 'Showpieces & light, redefined. Pieces designed to stay.'}
                  rows={2}
                />
              </div>
            )}

            {hasBody && (
              <div className="field full" style={{ marginBottom: 14 }}>
                <label>Body copy{isCtaBand ? '' : ' *'}</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder={isCtaBand
                    ? 'Every piece can be viewed in person by appointment. A room of considered objects, unhurried.'
                    : 'Every piece here is made to be lived with — not styled around. A chandelier, a lamp, a sculpture, a mirror.'}
                  rows={4}
                />
                <span className="img-hint">Longer-form editorial text shown on the storefront.</span>
              </div>
            )}

            {hasAttribution && (
              <div className="field full" style={{ marginBottom: 14 }}>
                <label>Attribution</label>
                <input
                  value={form.attribution}
                  onChange={(e) => setForm((f) => ({ ...f, attribution: e.target.value }))}
                  placeholder="e.g. OBJET · SILLON — CAST BRONZE"
                />
                <span className="img-hint">Optional small caption shown below the hero image (used on The House page).</span>
              </div>
            )}

            {hasCta && (
              <>
                <div className="form-grid" style={{ marginBottom: 14 }}>
                  <div className="field">
                    <label>Primary CTA label{isCtaBand ? ' *' : ''}</label>
                    <input
                      value={form.ctaLabel}
                      onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                      placeholder={isCtaBand ? 'Book an appointment' : 'Discover the collection'}
                    />
                  </div>
                  <div className="field">
                    <label>Primary CTA link</label>
                    <input
                      value={form.ctaHref}
                      onChange={(e) => setForm((f) => ({ ...f, ctaHref: e.target.value }))}
                      placeholder={isCtaBand ? '/book' : '/collections'}
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ marginBottom: 14 }}>
                  <div className="field">
                    <label>Secondary CTA label</label>
                    <input
                      value={form.ctaLabel2}
                      onChange={(e) => setForm((f) => ({ ...f, ctaLabel2: e.target.value }))}
                      placeholder="Book an appointment"
                    />
                  </div>
                  <div className="field">
                    <label>Secondary CTA link</label>
                    <input
                      value={form.ctaHref2}
                      onChange={(e) => setForm((f) => ({ ...f, ctaHref2: e.target.value }))}
                      placeholder="/book"
                    />
                  </div>
                </div>
                <span className="img-hint" style={{ display: 'block', marginTop: -6, marginBottom: 14 }}>
                  Leave the secondary CTA blank for a single-button band.
                </span>
              </>
            )}

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
                <span className="img-hint">Inactive banners are hidden on the storefront.</span>
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
          title="Delete banner"
          message={`Delete banner "${confirm.title || confirm.weave || confirm.id}"? Storefront removes it on next page load.`}
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}
    </>
  )
}
