// Shim over the backend + localStorage stores.
//
// WIRED TO BACKEND: products, auth, categories, editTags, journal,
//   banners, inSitu, materials, craftPrinciples, ownershipPillars,
//   houseContent, orders.
// STILL LOCAL (localStorage): enquiries, customers, payments,
//   user settings. These remain until the next backend pass.
//
// Each resource shares the shape {list, get, create, update, remove, bulk}
// so admin pages are agnostic to whether the resource is backed by the
// API or by localStorage.

import {
  enquiriesStore, customersStore, paymentsStore,
  updateUser as updateLocalUser,
} from '../lib/store'

import { productsHttp } from './products.js'
import { ordersHttp } from './orders.js'
import { houseContentHttp } from './houseContent.js'
import { slugResource } from './_resource.js'
import { http, getToken, setToken, clearToken, TOKEN_KEY } from './http.js'

// -------- Token helpers (same names Login/AuthContext already use) --------

export { getToken, setToken, clearToken, TOKEN_KEY }

// -------- Auth (backend) --------

export const auth = {
  login: async (email, password) => {
    const { token, user } = await http('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    })
    setToken(token)
    return { token, user }
  },
  me: async () => {
    const { user } = await http('/api/auth/me')
    return user
  },
  updateMe: async (patch) => {
    // Profile edits that the backend owns go up over HTTP.
    try {
      const { user } = await http('/api/auth/me', { method: 'PATCH', body: patch })
      return user
    } catch {
      // Fall back to local persistence for fields the backend doesn't model yet
      // (e.g. UI preferences, avatar). Admin page keeps working either way.
      return updateLocalUser(patch)
    }
  },
}

// -------- Products (backend) --------

export const products = productsHttp

// -------- Content resources (backend, slug-id) --------

export const categories       = slugResource('/api/categories')
export const editTags         = slugResource('/api/edit-tags')
export const journal          = slugResource('/api/journal')
export const banners          = slugResource('/api/banners')
export const inSitu           = slugResource('/api/in-situ')
export const materials        = slugResource('/api/materials')
export const craftPrinciples  = slugResource('/api/craft-principles')
export const ownershipPillars = slugResource('/api/ownership-pillars')
export const luxeExclusive    = slugResource('/api/luxe-exclusive')

// -------- Orders (backend) --------

export const orders = ordersHttp

// -------- House content (backend, singleton) --------

export const houseContent = houseContentHttp

// -------- Still local — awaiting backend endpoints --------

export const customers        = customersStore
export const payments         = paymentsStore

// The Enquiry page was written against a Mongo-style API that returns
// `_id`. Mirror `id` onto `_id` on the way out so that page keeps
// working without changes.
const withMongoId = (row) => (row ? { ...row, _id: row._id || row.id } : row)
export const enquiries = {
  list: async () => (await enquiriesStore.list()).map(withMongoId),
  get: async (id) => withMongoId(await enquiriesStore.get(id)),
  create: async (d) => withMongoId(await enquiriesStore.create(d)),
  update: async (id, d) => withMongoId(await enquiriesStore.update(id, d)),
  remove: (id) => enquiriesStore.remove(id),
}

// Legacy aliases kept so pages that still import the old names during
// the rebrand transition (occasions, stories, colorways...) do not break.
// They're intentionally minimal — the admin pages themselves are being
// renamed in this pass, so these aliases will be removed when callers are.
export const occasions = editTags
export const stories   = journal
export const colorways = {
  list: async () => [],
}
