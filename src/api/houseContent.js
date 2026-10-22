// Singleton — not a list resource. The admin page calls
//   houseContent.get()        → the one doc
//   houseContent.update(patch) → merged doc
// Backend upserts on PATCH so we never have to seed the row first.

import { http } from './http.js'

async function get() {
  return await http('/api/house-content', { auth: false })
}

async function update(patch) {
  const { _id, createdAt, updatedAt, ...body } = patch || {}
  return await http('/api/house-content', { method: 'PATCH', body })
}

export const houseContentHttp = { get, update }
