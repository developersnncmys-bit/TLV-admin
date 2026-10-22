// Generic HTTP-backed resource with the same shape the admin pages
// expect: {list, get, create, update, remove, bulk}. Backend endpoints
// here return {items,total} for list and a plain row for get/create/update.

import { http } from './http.js'

const stripMeta = (payload = {}) => {
  // Admin forms may spread an existing row into the create/update body;
  // these keys are owned by the backend and would be rejected.
  const { _id, createdAt, updatedAt, ...rest } = payload
  return rest
}

// Slug-id resources (categories, edit-tags, journal, …): id is a string
// slug, mounted at `path`.
export function slugResource(path) {
  async function list() {
    const data = await http(path)
    return data?.items || []
  }
  async function get(id) {
    return await http(`${path}/${encodeURIComponent(id)}`)
  }
  async function create(payload) {
    return await http(path, { method: 'POST', body: stripMeta(payload) })
  }
  async function update(id, patch) {
    const { id: _ignored, ...rest } = stripMeta(patch)
    return await http(`${path}/${encodeURIComponent(id)}`, { method: 'PATCH', body: rest })
  }
  async function remove(id) {
    await http(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return { id }
  }
  async function bulk(rows) {
    const out = []
    for (const row of rows || []) out.push(await create(row))
    return out
  }
  return { list, get, create, update, remove, bulk }
}
