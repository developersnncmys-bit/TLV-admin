// Products resource — real HTTP calls to the TLV backend. Keeps the
// same {list, get, create, update, remove, bulk} shape the admin pages
// were already using so Products.jsx needs no changes.
//
// Image shape adapter: the admin's Products form stores images as
// Array<{url: string}>; the backend persists them as string[]. We flatten
// on write and re-wrap on read so neither side has to compromise.

import { http } from './http.js'

const toUrlObjects = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((s) => (typeof s === 'string' ? s : s?.url))
    .filter((s) => typeof s === 'string' && s.length > 0)
    .map((url) => ({ url }))

const toUrlStrings = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((e) => (typeof e === 'string' ? e : e?.url))
    .filter((s) => typeof s === 'string' && s.length > 0)

// Row that comes back from backend → shape the admin pages expect.
// Backend already returns `id` (toJSON aliases _id → id), so we only
// need to re-wrap images.
const fromBackend = (row) => {
  if (!row) return row
  return { ...row, images: toUrlObjects(row.images) }
}

// Payload from the admin form → shape the backend's Zod validator accepts.
// Also auto-generates a reference if the form left it blank, so the
// admin's "add piece" UX stays the same.
const toBackend = (payload, existingList = []) => {
  const out = { ...payload }
  out.images = toUrlStrings(payload.images)
  if (typeof out.image !== 'string') out.image = out.images[0] || ''
  if (!out.reference || !String(out.reference).trim()) {
    out.reference = nextReference(existingList)
  }
  // Backend doesn't recognize these admin-only form fields; strip them.
  delete out.id
  delete out._id
  delete out.createdAt
  delete out.updatedAt
  return out
}

function nextReference(items) {
  const nums = (items || [])
    .map((r) => String(r.reference || r.id || ''))
    .map((v) => {
      const m = v.match(/^LV-?(\d+)$/i)
      return m ? Number(m[1]) : 0
    })
  const max = nums.length ? Math.max(...nums) : 0
  return `LV-${String(max + 1).padStart(6, '0')}`
}

async function list() {
  // Admin's token has the admin role, so the backend returns drafts
  // and archived too (optionalAuth logic in product.controller.js).
  const data = await http('/api/products?limit=200')
  return (data?.items || []).map(fromBackend)
}

async function get(id) {
  const row = await http(`/api/products/${encodeURIComponent(id)}`)
  return fromBackend(row)
}

async function create(payload) {
  const existing = await list().catch(() => [])
  const body = toBackend(payload, existing)
  const row = await http('/api/products', { method: 'POST', body })
  return fromBackend(row)
}

async function update(id, patch) {
  const body = toBackend(patch)
  const row = await http(`/api/products/${encodeURIComponent(id)}`, { method: 'PATCH', body })
  return fromBackend(row)
}

async function remove(id) {
  await http(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
  return { id }
}

// Not used by any current page, but part of the resource contract the
// old localStorage store exposed. Simple sequential PATCH is fine for
// the small sets the admin edits in bulk (stock adjustments etc.).
async function bulk(patches) {
  const out = []
  for (const { id, ...rest } of patches || []) {
    out.push(await update(id, rest))
  }
  return out
}

export const productsHttp = { list, get, create, update, remove, bulk }
