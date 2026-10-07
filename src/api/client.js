// Shim over src/lib/store.js. The admin used to call an HTTP API; now
// every resource is backed by localStorage. Keeping this file so page
// imports (`import { products } from '../api/client'`) still work.
//
// New code should prefer importing from '../lib/store' directly.

import {
  productsStore, categoriesStore, editTagsStore, journalStore,
  bannersStore, enquiriesStore, ordersStore, customersStore, paymentsStore,
  inSituStore, materialsStore, craftPrinciplesStore, ownershipPillarsStore,
  getHouseContent, updateHouseContent,
  login as doLogin, getUser, updateUser,
} from '../lib/store'

const TOKEN_KEY = 'luxe_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export const auth = {
  login: async (email, password) => doLogin(email, password),
  me: async () => getUser(),
  updateMe: async (patch) => updateUser(patch),
}

export const products         = productsStore
export const categories       = categoriesStore
export const editTags         = editTagsStore
export const journal          = journalStore
export const banners          = bannersStore
export const orders           = ordersStore
export const customers        = customersStore
export const payments         = paymentsStore
export const inSitu           = inSituStore
export const materials        = materialsStore
export const craftPrinciples  = craftPrinciplesStore
export const ownershipPillars = ownershipPillarsStore

export const houseContent = {
  get: async () => getHouseContent(),
  update: async (patch) => updateHouseContent(patch),
}

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
export const occasions = editTagsStore
export const stories   = journalStore
export const colorways = {
  list: async () => [],
}
