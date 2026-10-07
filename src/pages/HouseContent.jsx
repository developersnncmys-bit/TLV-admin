import { useEffect, useState } from 'react'
import {
  houseContent as hcApi,
  materials as matApi,
  craftPrinciples as cpApi,
  ownershipPillars as opApi,
} from '../api/client'
import { uploadImage, isImageSrc } from '../lib/image'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { IconBuilding, IconLayers, IconBook, IconShield, IconPlus, IconPencil, IconTrash } from '../components/icons'

const NAV = [
  { k: 'materials', label: 'Materials', Icon: IconBuilding },
  { k: 'craft',     label: 'Craft',     Icon: IconLayers },
  { k: 'story',     label: 'Story',     Icon: IconBook },
  { k: 'ownership', label: 'Ownership', Icon: IconShield },
]

const EMPTY_HOUSE = {
  materialsHeadline: '',
  materialsLead: '',
  craftHeadline: '',
  craftLead: '',
  craftImage: '',
  craftImageAttribution: '',
  storyPullQuote: '',
  storyBody: '',
}

const EMPTY_MATERIAL  = { id: '', name: '', description: '', image: '', order: 0 }
const EMPTY_PRINCIPLE = { id: '', title: '', body: '', order: 0 }
const EMPTY_PILLAR    = { id: '', title: '', body: '', ctaLabel: '', ctaHref: '', order: 0 }

export default function HouseContent() {
  const toast = useToast()
  const [tab, setTab] = useState('materials')
  const [house, setHouse] = useState(EMPTY_HOUSE)
  const [materials, setMaterials] = useState([])
  const [principles, setPrinciples] = useState([])
  const [pillars, setPillars] = useState([])
  const [uploadingCraft, setUploadingCraft] = useState(false)

  // Material modal state
  const [matForm, setMatForm] = useState(EMPTY_MATERIAL)
  const [matEditing, setMatEditing] = useState(null)
  const [matSaving, setMatSaving] = useState(false)
  const [matUploading, setMatUploading] = useState(false)
  const [matConfirm, setMatConfirm] = useState(null)

  // Principle modal state
  const [prForm, setPrForm] = useState(EMPTY_PRINCIPLE)
  const [prEditing, setPrEditing] = useState(null)
  const [prSaving, setPrSaving] = useState(false)
  const [prConfirm, setPrConfirm] = useState(null)

  // Pillar modal state
  const [opForm, setOpForm] = useState(EMPTY_PILLAR)
  const [opEditing, setOpEditing] = useState(null)
  const [opSaving, setOpSaving] = useState(false)
  const [opConfirm, setOpConfirm] = useState(null)

  async function loadAll() {
    try {
      const [h, m, p, o] = await Promise.all([hcApi.get(), matApi.list(), cpApi.list(), opApi.list()])
      setHouse({ ...EMPTY_HOUSE, ...h })
      setMaterials((m || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0)))
      setPrinciples((p || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0)))
      setPillars((o || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0)))
    } catch (e) {
      toast.bad(e.message || 'Could not load house content')
    }
  }

  useEffect(() => { loadAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveHeader() {
    try {
      await hcApi.update(house)
      toast.ok('House content saved')
    } catch (e) {
      toast.bad(e.message || 'Could not save')
    }
  }

  async function onCraftImageFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCraft(true)
    try {
      const url = await uploadImage(file)
      setHouse((h) => ({ ...h, craftImage: url }))
      toast.ok('Image added')
    } catch (err) {
      toast.bad(err.message || 'Upload failed')
    } finally {
      setUploadingCraft(false)
      e.target.value = ''
    }
  }

  // -------- Material modal handlers --------
  function openNewMaterial() { setMatForm(EMPTY_MATERIAL); setMatEditing({}) }
  function openEditMaterial(m) {
    setMatForm({
      id: m.id || '',
      name: m.name || '',
      description: m.description || '',
      image: m.image || '',
      order: Number(m.order) || 0,
    })
    setMatEditing(m)
  }

  async function onMatFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setMatUploading(true)
    try {
      const url = await uploadImage(file)
      setMatForm((f) => ({ ...f, image: url }))
      toast.ok('Image added')
    } catch (err) {
      toast.bad(err.message || 'Upload failed')
    } finally {
      setMatUploading(false)
      e.target.value = ''
    }
  }

  async function saveMaterial(e) {
    e.preventDefault()
    if (!matForm.name.trim()) return toast.bad('Material name is required')
    setMatSaving(true)
    try {
      const payload = {
        name: matForm.name.trim(),
        description: matForm.description.trim(),
        image: matForm.image,
        order: Number(matForm.order) || 0,
      }
      if (matEditing.id) {
        await matApi.update(matEditing.id, payload)
        toast.ok('Material updated')
      } else {
        await matApi.create({ ...payload, id: matForm.id.trim() || undefined })
        toast.ok('Material added')
      }
      setMatEditing(null)
      loadAll()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setMatSaving(false)
    }
  }

  async function doDeleteMaterial() {
    setMatSaving(true)
    try {
      await matApi.remove(matConfirm.id)
      toast.ok('Material deleted')
      setMatConfirm(null)
      loadAll()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setMatSaving(false)
    }
  }

  // -------- Principle modal handlers --------
  function openNewPrinciple() { setPrForm(EMPTY_PRINCIPLE); setPrEditing({}) }
  function openEditPrinciple(p) {
    setPrForm({
      id: p.id || '',
      title: p.title || '',
      body: p.body || '',
      order: Number(p.order) || 0,
    })
    setPrEditing(p)
  }

  async function savePrinciple(e) {
    e.preventDefault()
    if (!prForm.title.trim()) return toast.bad('Principle title is required')
    setPrSaving(true)
    try {
      const payload = {
        title: prForm.title.trim(),
        body: prForm.body.trim(),
        order: Number(prForm.order) || 0,
      }
      if (prEditing.id) {
        await cpApi.update(prEditing.id, payload)
        toast.ok('Principle updated')
      } else {
        await cpApi.create({ ...payload, id: prForm.id.trim() || undefined })
        toast.ok('Principle added')
      }
      setPrEditing(null)
      loadAll()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setPrSaving(false)
    }
  }

  async function doDeletePrinciple() {
    setPrSaving(true)
    try {
      await cpApi.remove(prConfirm.id)
      toast.ok('Principle deleted')
      setPrConfirm(null)
      loadAll()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setPrSaving(false)
    }
  }

  // -------- Ownership pillar handlers --------
  function openNewPillar() { setOpForm(EMPTY_PILLAR); setOpEditing({}) }
  function openEditPillar(p) {
    setOpForm({
      id: p.id || '',
      title: p.title || '',
      body: p.body || '',
      ctaLabel: p.ctaLabel || '',
      ctaHref: p.ctaHref || '',
      order: Number(p.order) || 0,
    })
    setOpEditing(p)
  }

  async function savePillar(e) {
    e.preventDefault()
    if (!opForm.title.trim()) return toast.bad('Pillar title is required')
    setOpSaving(true)
    try {
      const payload = {
        title: opForm.title.trim(),
        body: opForm.body.trim(),
        ctaLabel: opForm.ctaLabel.trim(),
        ctaHref: opForm.ctaHref.trim(),
        order: Number(opForm.order) || 0,
      }
      if (opEditing.id) {
        await opApi.update(opEditing.id, payload)
        toast.ok('Pillar updated')
      } else {
        await opApi.create({ ...payload, id: opForm.id.trim() || undefined })
        toast.ok('Pillar added')
      }
      setOpEditing(null)
      loadAll()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setOpSaving(false)
    }
  }

  async function doDeletePillar() {
    setOpSaving(true)
    try {
      await opApi.remove(opConfirm.id)
      toast.ok('Pillar deleted')
      setOpConfirm(null)
      loadAll()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setOpSaving(false)
    }
  }

  // -------- Render --------
  const headerSaveable = tab === 'materials' || tab === 'craft' || tab === 'story'
  const headerShowSave = headerSaveable && tab !== 'ownership'

  return (
    <>
      <div className="page-head">
        <div>
          <h1>The House</h1>
          <p>Materials, craft principles and the brand story block</p>
        </div>
        <div className="page-actions">
          {headerShowSave && (
            <button className="btn btn-primary" onClick={saveHeader}>Save Changes</button>
          )}
          {tab === 'ownership' && (
            <button className="btn btn-primary" onClick={openNewPillar}><IconPlus size={16} /> New pillar</button>
          )}
        </div>
      </div>

      <div className="settings-wrap">
        <div className="card settings-nav">
          {NAV.map((n) => (
            <button key={n.k} className={`set-nav-item ${tab === n.k ? 'active' : ''}`} onClick={() => setTab(n.k)}>
              <n.Icon size={18} /> {n.label}
            </button>
          ))}
        </div>

        <div className="card card-pad settings-panel">
          {tab === 'materials' && (
            <>
              <h3 className="panel-title">Materials Section</h3>
              <div className="form-grid">
                <div className="field full">
                  <label>Headline</label>
                  <input
                    value={house.materialsHeadline}
                    onChange={(e) => setHouse((h) => ({ ...h, materialsHeadline: e.target.value }))}
                    placeholder="Materials"
                  />
                </div>
                <div className="field full">
                  <label>Lead paragraph</label>
                  <textarea
                    value={house.materialsLead}
                    onChange={(e) => setHouse((h) => ({ ...h, materialsLead: e.target.value }))}
                    rows={3}
                    placeholder="Five families of matter…"
                  />
                </div>
              </div>

              <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <h3 className="panel-title" style={{ margin: 0 }}>Material cards</h3>
                <button className="btn btn-primary" onClick={openNewMaterial}><IconPlus size={16} /> New material</button>
              </div>
              <p className="img-hint" style={{ marginTop: 4, marginBottom: 16 }}>
                Cards shown in the storefront MATERIALS grid, in display order.
              </p>

              {materials.length === 0 ? (
                <div className="empty"><div className="em-ico">🪨</div><p>No materials yet</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {materials.map((m) => (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: 12, borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                    }}>
                      <div style={{
                        width: 54, height: 54, borderRadius: 8, flexShrink: 0,
                        background: isImageSrc(m.image)
                          ? `url(${m.image}) center/cover`
                          : 'linear-gradient(135deg,#616373,#36363e)',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--glass-text)' }}>
                          {m.name} <span style={{ fontSize: 11, color: 'var(--glass-text-muted)', fontWeight: 500 }}>· order {m.order || 0}</span>
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--glass-text-soft)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.description}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="icon-btn" title="Edit" onClick={() => openEditMaterial(m)}><IconPencil size={15} /></button>
                        <button className="icon-btn danger" title="Delete" onClick={() => setMatConfirm(m)}><IconTrash size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'craft' && (
            <>
              <h3 className="panel-title">Craft Section</h3>
              <div className="form-grid">
                <div className="field full">
                  <label>Headline</label>
                  <input
                    value={house.craftHeadline}
                    onChange={(e) => setHouse((h) => ({ ...h, craftHeadline: e.target.value }))}
                    placeholder="Craft"
                  />
                </div>
                <div className="field full">
                  <label>Lead paragraph</label>
                  <textarea
                    value={house.craftLead}
                    onChange={(e) => setHouse((h) => ({ ...h, craftLead: e.target.value }))}
                    rows={2}
                    placeholder="Each piece is made by a hand we know…"
                  />
                </div>
                <div className="field full">
                  <label>Side image</label>
                  {isImageSrc(house.craftImage) && (
                    <div style={{ marginBottom: 8 }}>
                      <img
                        src={house.craftImage}
                        alt=""
                        style={{ maxWidth: 220, height: 'auto', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={onCraftImageFile} disabled={uploadingCraft} />
                  {uploadingCraft && <span className="img-hint">Processing…</span>}
                  {house.craftImage && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ marginTop: 6, fontSize: 12 }}
                      onClick={() => setHouse((h) => ({ ...h, craftImage: '' }))}
                    >
                      Remove image
                    </button>
                  )}
                  <span className="img-hint">Full-height image shown beside the numbered principles.</span>
                </div>
                <div className="field full">
                  <label>Image attribution</label>
                  <input
                    value={house.craftImageAttribution}
                    onChange={(e) => setHouse((h) => ({ ...h, craftImageAttribution: e.target.value }))}
                    placeholder="e.g. LUME ALBA · BRASS, HAND-TURNED"
                  />
                  <span className="img-hint">Small caption below the side image.</span>
                </div>
              </div>

              <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <h3 className="panel-title" style={{ margin: 0 }}>Craft principles</h3>
                <button className="btn btn-primary" onClick={openNewPrinciple}><IconPlus size={16} /> New principle</button>
              </div>
              <p className="img-hint" style={{ marginTop: 4, marginBottom: 16 }}>
                Numbered automatically on the storefront by display order.
              </p>

              {principles.length === 0 ? (
                <div className="empty"><div className="em-ico">✦</div><p>No principles yet</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {principles.map((p, i) => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      padding: 14, borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                    }}>
                      <div style={{
                        width: 36, flexShrink: 0, fontSize: 13, fontWeight: 700,
                        color: 'var(--glass-text-muted)', letterSpacing: 0.5,
                      }}>
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--glass-text)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                          {p.title} <span style={{ fontSize: 11, color: 'var(--glass-text-muted)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>· order {p.order || 0}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--glass-text-soft)', marginTop: 5, lineHeight: 1.5 }}>
                          {p.body}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="icon-btn" title="Edit" onClick={() => openEditPrinciple(p)}><IconPencil size={15} /></button>
                        <button className="icon-btn danger" title="Delete" onClick={() => setPrConfirm(p)}><IconTrash size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'ownership' && (
            <>
              <h3 className="panel-title">Ownership Pillars</h3>
              <p className="img-hint" style={{ marginTop: -8, marginBottom: 18 }}>
                The "OWNERSHIP ACCORDING TO THE HOUSE" band shown at the bottom of every product detail page.
                Three pillars display best; add or remove to match your copy.
              </p>

              {pillars.length === 0 ? (
                <div className="empty"><div className="em-ico">🛡</div><p>No pillars yet</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pillars.map((p) => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      padding: 14, borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--glass-text)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                          {p.title} <span style={{ fontSize: 11, color: 'var(--glass-text-muted)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>· order {p.order || 0}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--glass-text-soft)', marginTop: 5, lineHeight: 1.5 }}>
                          {p.body}
                        </div>
                        {(p.ctaLabel || p.ctaHref) && (
                          <div style={{ fontSize: 11.5, color: 'var(--glass-text-muted)', marginTop: 6, letterSpacing: 0.3 }}>
                            CTA: <span style={{ color: 'var(--glass-text-soft)' }}>{p.ctaLabel || '—'}</span>
                            {p.ctaHref ? <span> → {p.ctaHref}</span> : null}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="icon-btn" title="Edit" onClick={() => openEditPillar(p)}><IconPencil size={15} /></button>
                        <button className="icon-btn danger" title="Delete" onClick={() => setOpConfirm(p)}><IconTrash size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'story' && (
            <>
              <h3 className="panel-title">Brand Story</h3>
              <p className="img-hint" style={{ marginTop: -8, marginBottom: 18 }}>
                The "THE LUXE VERSION" story block that appears below the Craft section on The House page.
              </p>
              <div className="form-grid">
                <div className="field full">
                  <label>Pull quote</label>
                  <textarea
                    value={house.storyPullQuote}
                    onChange={(e) => setHouse((h) => ({ ...h, storyPullQuote: e.target.value }))}
                    rows={2}
                    placeholder="We started with one chandelier and a small studio…"
                  />
                  <span className="img-hint">Large italicised quote shown under the wordmark.</span>
                </div>
                <div className="field full">
                  <label>Body copy</label>
                  <textarea
                    value={house.storyBody}
                    onChange={(e) => setHouse((h) => ({ ...h, storyBody: e.target.value }))}
                    rows={12}
                    placeholder="The Luxe Version began the way most quiet things do…"
                  />
                  <span className="img-hint">Separate paragraphs with blank lines.</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {matEditing && (
        <Modal
          title={matEditing.id ? 'Edit Material' : 'New Material'}
          subtitle={matEditing.id ? matEditing.id : 'A card in the MATERIALS grid'}
          onClose={() => setMatEditing(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setMatEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveMaterial} disabled={matSaving || matUploading}>
                {matSaving ? 'Saving…' : matEditing.id ? 'Save changes' : 'Create'}
              </button>
            </>
          }
        >
          <form onSubmit={saveMaterial}>
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Name *</label>
              <input
                value={matForm.name}
                onChange={(e) => setMatForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Stone"
                autoFocus
              />
            </div>
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Description</label>
              <textarea
                value={matForm.description}
                onChange={(e) => setMatForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="e.g. Travertine, marble, alabaster — cool to the hand, warm in the eye."
              />
            </div>
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Image</label>
              {isImageSrc(matForm.image) && (
                <div style={{ marginBottom: 8 }}>
                  <img
                    src={matForm.image}
                    alt=""
                    style={{ maxWidth: 220, height: 'auto', borderRadius: 6, border: '1px solid #e5e5ea' }}
                  />
                </div>
              )}
              <input type="file" accept="image/*" onChange={onMatFile} disabled={matUploading} />
              {matUploading && <span className="img-hint">Processing…</span>}
              {matForm.image && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ marginTop: 6, fontSize: 12 }}
                  onClick={() => setMatForm((f) => ({ ...f, image: '' }))}
                >
                  Remove image
                </button>
              )}
            </div>
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Display order</label>
              <input
                type="number"
                value={matForm.order}
                onChange={(e) => setMatForm((f) => ({ ...f, order: e.target.value }))}
                placeholder="0"
              />
              <span className="img-hint">Lower numbers appear first.</span>
            </div>
            {!matEditing.id && (
              <div className="field full">
                <label>Slug id (optional)</label>
                <input
                  value={matForm.id}
                  onChange={(e) => setMatForm((f) => ({ ...f, id: e.target.value }))}
                  placeholder="Auto-derived if left blank"
                />
                <span className="img-hint">Cannot be changed after creation.</span>
              </div>
            )}
          </form>
        </Modal>
      )}

      {matConfirm && (
        <ConfirmDialog
          title="Delete material"
          message={`Delete "${matConfirm.name}"? Removed from the MATERIALS grid on next page load.`}
          onConfirm={doDeleteMaterial}
          onClose={() => setMatConfirm(null)}
          busy={matSaving}
        />
      )}

      {prEditing && (
        <Modal
          title={prEditing.id ? 'Edit Principle' : 'New Principle'}
          subtitle={prEditing.id ? prEditing.id : 'A numbered item in the CRAFT list'}
          onClose={() => setPrEditing(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setPrEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={savePrinciple} disabled={prSaving}>
                {prSaving ? 'Saving…' : prEditing.id ? 'Save changes' : 'Create'}
              </button>
            </>
          }
        >
          <form onSubmit={savePrinciple}>
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Title *</label>
              <input
                value={prForm.title}
                onChange={(e) => setPrForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Small workshops"
                autoFocus
              />
            </div>
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Body</label>
              <textarea
                value={prForm.body}
                onChange={(e) => setPrForm((f) => ({ ...f, body: e.target.value }))}
                rows={4}
                placeholder="We work only with makers small enough that the founder is still at the bench…"
              />
            </div>
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Display order</label>
              <input
                type="number"
                value={prForm.order}
                onChange={(e) => setPrForm((f) => ({ ...f, order: e.target.value }))}
                placeholder="0"
              />
              <span className="img-hint">Determines the number on the storefront (01, 02, 03…).</span>
            </div>
            {!prEditing.id && (
              <div className="field full">
                <label>Slug id (optional)</label>
                <input
                  value={prForm.id}
                  onChange={(e) => setPrForm((f) => ({ ...f, id: e.target.value }))}
                  placeholder="Auto-derived if left blank"
                />
                <span className="img-hint">Cannot be changed after creation.</span>
              </div>
            )}
          </form>
        </Modal>
      )}

      {prConfirm && (
        <ConfirmDialog
          title="Delete principle"
          message={`Delete "${prConfirm.title}"? Removed from the CRAFT list on next page load.`}
          onConfirm={doDeletePrinciple}
          onClose={() => setPrConfirm(null)}
          busy={prSaving}
        />
      )}

      {opEditing && (
        <Modal
          title={opEditing.id ? 'Edit Pillar' : 'New Pillar'}
          subtitle={opEditing.id ? opEditing.id : 'A column in the OWNERSHIP band on product pages'}
          onClose={() => setOpEditing(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setOpEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={savePillar} disabled={opSaving}>
                {opSaving ? 'Saving…' : opEditing.id ? 'Save changes' : 'Create'}
              </button>
            </>
          }
        >
          <form onSubmit={savePillar}>
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Title *</label>
              <input
                value={opForm.title}
                onChange={(e) => setOpForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Provenance"
                autoFocus
              />
            </div>
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Body</label>
              <textarea
                value={opForm.body}
                onChange={(e) => setOpForm((f) => ({ ...f, body: e.target.value }))}
                rows={4}
                placeholder="Every piece is signed, dated and accompanied by a hand-numbered certificate…"
              />
            </div>
            <div className="form-grid" style={{ marginBottom: 14 }}>
              <div className="field">
                <label>CTA label</label>
                <input
                  value={opForm.ctaLabel}
                  onChange={(e) => setOpForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                  placeholder="Learn more"
                />
              </div>
              <div className="field">
                <label>CTA link</label>
                <input
                  value={opForm.ctaHref}
                  onChange={(e) => setOpForm((f) => ({ ...f, ctaHref: e.target.value }))}
                  placeholder="/the-house#provenance"
                />
              </div>
            </div>
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Display order</label>
              <input
                type="number"
                value={opForm.order}
                onChange={(e) => setOpForm((f) => ({ ...f, order: e.target.value }))}
                placeholder="0"
              />
              <span className="img-hint">Lower numbers appear first.</span>
            </div>
            {!opEditing.id && (
              <div className="field full">
                <label>Slug id (optional)</label>
                <input
                  value={opForm.id}
                  onChange={(e) => setOpForm((f) => ({ ...f, id: e.target.value }))}
                  placeholder="Auto-derived if left blank"
                />
                <span className="img-hint">Cannot be changed after creation.</span>
              </div>
            )}
          </form>
        </Modal>
      )}

      {opConfirm && (
        <ConfirmDialog
          title="Delete pillar"
          message={`Delete "${opConfirm.title}"? Removed from the OWNERSHIP band on next page load.`}
          onConfirm={doDeletePillar}
          onClose={() => setOpConfirm(null)}
          busy={opSaving}
        />
      )}
    </>
  )
}
