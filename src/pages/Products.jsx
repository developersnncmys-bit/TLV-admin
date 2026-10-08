import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { products as api, categories as catApi, editTags as tagApi } from '../api/client'
import { inr, productStatusClass, productStatusLabel } from '../lib/format'
import { isImageSrc, uploadImage } from '../lib/image'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { IconPlus, IconSearch, IconPencil, IconTrash, IconUpload } from '../components/icons'

const EMPTY_WHY_HIGHLIGHT = { title: '', body: '' }
const EMPTY = {
  name: '', category: '', editTag: '', description: '',
  price: '', mrp: '', stock: '', status: 'active',
  reference: '', materials: '',
  materialTags: [],
  dimensions: { main: '', base: '', weight: '' },
  bespoke: false,
  image: '', images: [],
  moreDetails: '',
  materialImage: '', materialDetail: '',
  craftImage: '', craftDetail: '',
  whyHeadline: '',
  whyHighlights: [ { ...EMPTY_WHY_HIGHLIGHT }, { ...EMPTY_WHY_HIGHLIGHT }, { ...EMPTY_WHY_HIGHLIGHT } ],
  pullQuote: '', featureImage: '',
}

const MATERIAL_TAG_OPTIONS = [
  'Bronze', 'Brass', 'Metal', 'Wood', 'Stone', 'Marble',
  'Ceramic', 'Porcelain', 'Stoneware', 'Glass',
]

const PAGE = 6

export default function Products() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [cats, setCats] = useState([])
  const [tags, setTags] = useState([])
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const [page, setPage] = useState(1)
  const [searchParams, setSearchParams] = useSearchParams()

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))
  useEffect(() => {
    load()
    catApi.list().then(setCats).catch(() => {})
    tagApi.list().then(setTags).catch(() => {})
  }, [])
  useEffect(() => { setPage(1) }, [q, catFilter])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setForm(EMPTY)
      setEditing({})
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const filtered = useMemo(() => {
    if (!rows) return []
    return rows.filter((p) => {
      if (catFilter !== 'all' && p.category !== catFilter) return false
      if (q && !`${p.name} ${p.reference} ${p.id} ${p.materials}`.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [rows, q, catFilter])
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE)

  async function onFile(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const results = await Promise.allSettled(files.map((file) => uploadImage(file)))
    const urls = []
    const failures = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') urls.push(r.value)
      else failures.push({ name: files[i]?.name || 'image', reason: r.reason?.message || 'upload failed' })
    })
    if (urls.length) {
      setForm((f) => {
        const entries = urls.map((url) => ({ url }))
        const images = [...(f.images || []), ...entries].slice(0, 8)
        return { ...f, images, image: images[0]?.url || '' }
      })
      toast.ok(`Added ${urls.length} image${urls.length === 1 ? '' : 's'}`)
    }
    failures.forEach((f) => toast.bad(`${f.name}: ${f.reason}`))
    e.target.value = ''
  }

  function removeImage(i) {
    setForm((f) => {
      const images = (f.images || []).filter((_, idx) => idx !== i)
      return { ...f, images, image: images[0]?.url || '' }
    })
  }

  function makePrimary(i) {
    setForm((f) => {
      const src = f.images || []
      if (i <= 0 || i >= src.length) return f
      const images = [src[i], ...src.filter((_, idx) => idx !== i)]
      return { ...f, images, image: images[0]?.url || '' }
    })
  }

  function openNew() { setForm(EMPTY); setEditing({}) }
  function openEdit(p) {
    const raw = Array.isArray(p.images) ? p.images.filter(Boolean) : []
    let images = raw.map((entry) =>
      typeof entry === 'string' ? { url: entry } : { url: entry.url || '' },
    )
    if (!images.length && p.image) images = [{ url: p.image }]
    const existingHighlights = Array.isArray(p.whyHighlights) ? p.whyHighlights : []
    const whyHighlights = [0, 1, 2].map((i) => ({
      title: existingHighlights[i]?.title || '',
      body: existingHighlights[i]?.body || '',
    }))
    setForm({
      ...EMPTY,
      ...p,
      price: p.price ?? '',
      mrp: p.mrp ?? '',
      stock: p.stock ?? '',
      materialTags: Array.isArray(p.materialTags) ? p.materialTags : [],
      dimensions: {
        main: p.dimensions?.main || '',
        base: p.dimensions?.base || '',
        weight: p.dimensions?.weight || '',
      },
      bespoke: !!p.bespoke,
      images,
      image: images[0]?.url || p.image || '',
      moreDetails: p.moreDetails || '',
      materialImage: p.materialImage || '',
      materialDetail: p.materialDetail || '',
      craftImage: p.craftImage || '',
      craftDetail: p.craftDetail || '',
      whyHeadline: p.whyHeadline || '',
      whyHighlights,
      pullQuote: p.pullQuote || '',
      featureImage: p.featureImage || '',
    })
    setEditing(p)
  }

  function onSaveClick(e) {
    if (e && e.preventDefault) e.preventDefault()
    if (!form.name.trim()) return toast.bad('Piece name is required')
    if (editing && editing.id) setConfirmSave(true)
    else doSave()
  }

  async function doSave() {
    setSaving(true)
    try {
      const images = (form.images || [])
        .map((e) => ({ url: (e?.url || '').trim() }))
        .filter((e) => e.url)
      const whyHighlights = (form.whyHighlights || [])
        .map((h) => ({ title: (h?.title || '').trim(), body: (h?.body || '').trim() }))
        .filter((h) => h.title || h.body)
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        mrp: Number(form.mrp) || 0,
        stock: Number(form.stock) || 0,
        materialTags: Array.isArray(form.materialTags) ? form.materialTags : [],
        moreDetails: (form.moreDetails || '').trim(),
        materialDetail: (form.materialDetail || '').trim(),
        craftDetail: (form.craftDetail || '').trim(),
        whyHeadline: (form.whyHeadline || '').trim(),
        whyHighlights,
        pullQuote: (form.pullQuote || '').trim(),
        images,
        image: images[0]?.url || '',
      }
      if (editing.id) { await api.update(editing.id, payload); toast.ok('Piece updated') }
      else { await api.create(payload); toast.ok('Piece added') }
      setEditing(null); setConfirmSave(false); load()
    } catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  async function doDelete() {
    setSaving(true)
    try { await api.remove(confirm.id); toast.ok('Piece deleted'); setConfirm(null); load() }
    catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setDim = (k) => (e) => setForm((f) => ({ ...f, dimensions: { ...f.dimensions, [k]: e.target.value } }))
  const setWhy = (i, k) => (e) => setForm((f) => {
    const list = (f.whyHighlights || []).map((h) => ({ ...h }))
    while (list.length < 3) list.push({ title: '', body: '' })
    list[i] = { ...list[i], [k]: e.target.value }
    return { ...f, whyHighlights: list }
  })
  const toggleMaterialTag = (tag) => setForm((f) => {
    const current = Array.isArray(f.materialTags) ? f.materialTags : []
    const lower = tag.toLowerCase()
    const has = current.map((x) => x.toLowerCase()).includes(lower)
    return { ...f, materialTags: has ? current.filter((x) => x.toLowerCase() !== lower) : [...current, lower] }
  })
  const onSingleImageField = (field) => async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await uploadImage(file)
      setForm((f) => ({ ...f, [field]: url }))
      toast.ok('Image added')
    } catch (err) {
      toast.bad(err.message || 'Upload failed')
    } finally {
      e.target.value = ''
    }
  }
  const chips = [{ id: 'all', name: 'All' }, ...cats]

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Pieces</h1>
          <p>{rows ? `${rows.length} pieces in the collection` : 'Loading…'}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}><IconPlus size={18} /> Add Piece</button>
        </div>
      </div>

      <div className="card filter-bar">
        <div className="search-box grow">
          <IconSearch size={18} />
          <input placeholder="Search by name, reference…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="chips">
          {chips.map((c) => (
            <button key={c.id} className={`chip ${catFilter === c.id ? 'active' : ''}`} onClick={() => setCatFilter(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {!rows ? <div className="spinner" /> : filtered.length === 0 ? (
        <div className="card"><div className="empty"><div className="em-ico">🏺</div><p>No pieces found</p></div></div>
      ) : (
        <>
          <div className="prod-grid">
            {paged.map((p) => (
              <div className="prod-card" key={p.id}>
                <div className="pc-media">
                  <span className="pc-sku">{p.reference || p.id}</span>
                  <span className={`badge ${productStatusClass[p.status] || 'grey'} pc-status`}>{productStatusLabel[p.status] || p.status}</span>
                  {isImageSrc(p.image)
                    ? <img className="pc-img" src={p.image} alt={p.name} />
                    : <div className="pc-emoji">🏺</div>}
                </div>
                <div className="pc-body">
                  <div className="pc-title">
                    <h3>{p.name}</h3>
                  </div>
                  <div className="pc-meta">
                    {[cats.find((c) => c.id === p.category)?.name, tags.find((t) => t.id === p.editTag)?.name].filter(Boolean).join(' · ')}
                  </div>
                  <p className="pc-desc">{p.description}</p>
                  <div className="pc-price">
                    <div>
                      <span className="pc-now">{inr(p.price)}</span>
                      {p.mrp > p.price && <span className="pc-mrp">{inr(p.mrp)}</span>}
                    </div>
                    <div className="pc-stock">
                      <div className={p.stock === 0 ? 'red' : p.stock <= 2 ? 'amber' : 'green'}>{p.stock} in stock</div>
                      {p.bespoke && <div className="pc-sold">Bespoke</div>}
                    </div>
                  </div>
                  <div className="pc-actions">
                    <button className="btn btn-outline pc-edit" onClick={() => openEdit(p)}><IconPencil size={15} /> Edit</button>
                    <button className="icon-btn danger" title="Delete" onClick={() => setConfirm(p)}><IconTrash size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} />
        </>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit Piece' : 'Add Piece'}
          subtitle={editing.id ? editing.id : 'Add a new object to the collection'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={onSaveClick} disabled={saving}>{saving ? 'Saving…' : editing.id ? 'Save changes' : 'Add Piece'}</button>
            </>
          }
        >
          <form onSubmit={onSaveClick}>
            <div className="field full">
              <label>Images</label>
              <div className="img-gallery">
                {(form.images || []).map((entry, i) => (
                  <div className={`img-tile ${i === 0 ? 'primary' : ''}`} key={i}>
                    <div className="img-tile-media">
                      {isImageSrc(entry.url)
                        ? <img src={entry.url} alt={`image ${i + 1}`} />
                        : <span className="img-tile-fallback">🏺</span>}
                      {i === 0 && <span className="img-tile-badge">Primary</span>}
                      <div className="img-tile-actions">
                        {i !== 0 && (
                          <button type="button" className="img-tile-btn" onClick={() => makePrimary(i)}>Set primary</button>
                        )}
                        <button type="button" className="img-tile-btn danger" onClick={() => removeImage(i)}>
                          <IconTrash size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <label className="img-add">
                  <IconUpload size={18} />
                  <span>Add images</span>
                  <input
                    className="img-file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={onFile}
                  />
                </label>
              </div>
              <span className="img-hint">PNG / JPG / WEBP · auto-resized · first image is the primary (up to 8 total).</span>
            </div>

            <div className="field full">
              <label>Piece name</label>
              <input value={form.name} onChange={set('name')} placeholder="e.g. Sculpture — L'Inconnu" autoFocus />
            </div>

            <div className="field full">
              <label>Description</label>
              <textarea value={form.description} onChange={set('description')} placeholder="One or two sentences shown on the product card." />
            </div>

            <div className="form-grid form-grid-3">
              <div className="field">
                <label>Selling price (₹)</label>
                <input type="number" value={form.price} onChange={set('price')} placeholder="168000" />
              </div>
              <div className="field">
                <label>MRP (₹)</label>
                <input type="number" value={form.mrp} onChange={set('mrp')} placeholder="198000" />
              </div>
              <div className="field">
                <label>Stock</label>
                <input type="number" value={form.stock} onChange={set('stock')} placeholder="2" />
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Category</label>
                <select value={form.category} onChange={set('category')}>
                  <option value="">Select…</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Edit tag</label>
                <select value={form.editTag} onChange={set('editTag')}>
                  <option value="">— none —</option>
                  {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Reference #</label>
                <input value={form.reference} onChange={set('reference')} placeholder="e.g. LV-398764" />
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={set('status')}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="out_of_stock">Out of stock</option>
                </select>
              </div>
            </div>

            <h4 className="form-section">Materials & Dimensions</h4>
            <div className="field full">
              <label>Materials</label>
              <textarea value={form.materials} onChange={set('materials')} rows={2}
                placeholder="e.g. Sculpted textured metal with layered detailing, mounted on black marble base." />
              <span className="img-hint">Short subtitle shown under the title on the product page.</span>
            </div>

            <div className="field full">
              <label>Material tags</label>
              <div className="material-chips">
                {MATERIAL_TAG_OPTIONS.map((tag) => {
                  const selected = (form.materialTags || []).map((x) => x.toLowerCase()).includes(tag.toLowerCase())
                  return (
                    <button
                      type="button"
                      key={tag}
                      className={`material-chip ${selected ? 'active' : ''}`}
                      onClick={() => toggleMaterialTag(tag)}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
              <span className="img-hint">Drives the Material filter on category pages. Pick all that apply.</span>
            </div>

            <div className="form-grid form-grid-3">
              <div className="field">
                <label>Main dimensions</label>
                <input value={form.dimensions.main} onChange={setDim('main')} placeholder="e.g. 45 × 20 × 47 cm" />
              </div>
              <div className="field">
                <label>Base dimensions</label>
                <input value={form.dimensions.base} onChange={setDim('base')} placeholder="e.g. 32 × 16 × 3 cm" />
              </div>
              <div className="field">
                <label>Weight</label>
                <input value={form.dimensions.weight} onChange={setDim('weight')} placeholder="e.g. 13.8 kg / 30.4 lb" />
              </div>
            </div>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={!!form.bespoke}
                onChange={(e) => setForm((f) => ({ ...f, bespoke: e.target.checked }))}
              />
              <span className="toggle-row-body">
                <span className="toggle-row-title">Available for bespoke commission</span>
                <span className="toggle-row-hint">Shows a "Bespoke available" tag on the storefront.</span>
              </span>
            </label>

            <h4 className="form-section">Product detail page</h4>

            <div className="field full">
              <label>More details (narrative)</label>
              <textarea value={form.moreDetails} onChange={set('moreDetails')} rows={3}
                placeholder="Longer narrative shown in the MORE DETAILS accordion on the product page." />
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Material block image</label>
                {isImageSrc(form.materialImage) && (
                  <div style={{ marginBottom: 8 }}>
                    <img src={form.materialImage} alt="" style={{ maxWidth: 200, height: 'auto', borderRadius: 6, border: '1px solid #e5e5ea' }} />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={onSingleImageField('materialImage')} />
                {form.materialImage && (
                  <button type="button" className="btn btn-outline" style={{ marginTop: 6, fontSize: 12 }}
                    onClick={() => setForm((f) => ({ ...f, materialImage: '' }))}>Remove image</button>
                )}
              </div>
              <div className="field">
                <label>Craft block image</label>
                {isImageSrc(form.craftImage) && (
                  <div style={{ marginBottom: 8 }}>
                    <img src={form.craftImage} alt="" style={{ maxWidth: 200, height: 'auto', borderRadius: 6, border: '1px solid #e5e5ea' }} />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={onSingleImageField('craftImage')} />
                {form.craftImage && (
                  <button type="button" className="btn btn-outline" style={{ marginTop: 6, fontSize: 12 }}
                    onClick={() => setForm((f) => ({ ...f, craftImage: '' }))}>Remove image</button>
                )}
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Material detail text</label>
                <textarea value={form.materialDetail} onChange={set('materialDetail')} rows={3}
                  placeholder="Leave blank to auto-compose from Materials + Dimensions + Weight." />
              </div>
              <div className="field">
                <label>Craft detail text</label>
                <textarea value={form.craftDetail} onChange={set('craftDetail')} rows={3}
                  placeholder="Short note on how the piece is made." />
              </div>
            </div>

            <div className="field full">
              <label>Why this piece — headline</label>
              <input value={form.whyHeadline} onChange={set('whyHeadline')}
                placeholder="e.g. A study in strength and stillness" />
              <span className="img-hint">Headline above the 3 numbered highlights.</span>
            </div>

            <div className="form-grid form-grid-3">
              {[0, 1, 2].map((i) => (
                <div className="field" key={i}>
                  <label>Highlight {String(i + 1).padStart(2, '0')} — title</label>
                  <input
                    value={form.whyHighlights?.[i]?.title || ''}
                    onChange={setWhy(i, 'title')}
                    placeholder={['Time-worn character', 'Equestrian form', 'Quietly monumental'][i]}
                  />
                  <label style={{ marginTop: 10 }}>Body</label>
                  <textarea
                    rows={4}
                    value={form.whyHighlights?.[i]?.body || ''}
                    onChange={setWhy(i, 'body')}
                    placeholder="Short description for this highlight."
                  />
                </div>
              ))}
            </div>

            <div className="field full">
              <label>Pull quote</label>
              <input value={form.pullQuote} onChange={set('pullQuote')}
                placeholder='e.g. A study in strength, form and time.' />
              <span className="img-hint">Italic quote shown beside a feature image on the product page.</span>
            </div>

            <div className="field full">
              <label>Feature image (pull quote)</label>
              {isImageSrc(form.featureImage) && (
                <div style={{ marginBottom: 8 }}>
                  <img src={form.featureImage} alt="" style={{ maxWidth: 220, height: 'auto', borderRadius: 6, border: '1px solid #e5e5ea' }} />
                </div>
              )}
              <input type="file" accept="image/*" onChange={onSingleImageField('featureImage')} />
              {form.featureImage && (
                <button type="button" className="btn btn-outline" style={{ marginTop: 6, fontSize: 12 }}
                  onClick={() => setForm((f) => ({ ...f, featureImage: '' }))}>Remove image</button>
              )}
              <span className="img-hint">Falls back to the main product image if left blank.</span>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete piece"
          message={`Delete "${confirm.name}" (${confirm.reference || confirm.id})? This cannot be undone.`}
          confirmLabel="Yes, delete"
          cancelLabel="No, cancel"
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}

      {confirmSave && (
        <ConfirmDialog
          title="Update piece"
          message="Save changes to this piece?"
          confirmLabel={saving ? 'Updating…' : 'Yes, update'}
          cancelLabel="No, cancel"
          tone="primary"
          onConfirm={doSave}
          onClose={() => setConfirmSave(false)}
          busy={saving}
        />
      )}
    </>
  )
}
