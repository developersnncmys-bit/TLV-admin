// Local-only data layer for The Luxe Version admin panel.
//
// Each resource lives under its own localStorage key and is seeded
// from src/data/seed.js the first time the admin boots. The exported
// `resource(name, seed)` factory returns {list, get, create, update,
// remove, bulk} — matching the shape pages used to call on the old
// HTTP api so the pages themselves barely change.

import {
  CATEGORIES, EDIT_TAGS, PRODUCTS, JOURNAL, BANNERS, ENQUIRIES, ORDERS, CUSTOMERS, PAYMENTS,
  IN_SITU, MATERIALS, CRAFT_PRINCIPLES, OWNERSHIP_PILLARS,
  DEFAULT_USER, DEFAULT_SETTINGS, DEFAULT_HOUSE_CONTENT,
} from '../data/seed'

const PREFIX = 'luxe:'

function read(name) {
  const raw = localStorage.getItem(PREFIX + name)
  if (raw == null) return null
  try { return JSON.parse(raw) } catch { return null }
}

function write(name, value) {
  localStorage.setItem(PREFIX + name, JSON.stringify(value))
}

function ensure(name, seed) {
  const existing = read(name)
  if (existing != null) return existing
  const value = typeof seed === 'function' ? seed() : seed
  write(name, value)
  return value
}

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

function nextId(items, prefix) {
  const nums = items
    .map((r) => String(r.id || ''))
    .map((id) => {
      const m = id.match(new RegExp(`^${prefix}-?(\\d+)$`, 'i'))
      return m ? Number(m[1]) : 0
    })
  const max = nums.length ? Math.max(...nums) : 0
  return `${prefix}-${String(max + 1).padStart(4, '0')}`
}

// Resource factory. `idStrategy` controls how new rows get an id:
//   - 'slug'  → derived from name (categories, edit-tags, journal, banners)
//   - 'auto'  → prefix + running number (products, enquiries)
//   - 'given' → caller provides; falls back to 'auto'
function resource(name, seed, { idPrefix = '', idStrategy = 'auto' } = {}) {
  ensure(name, seed)

  const all = () => read(name) || []
  const save = (items) => { write(name, items); return items }

  const makeId = (payload, items) => {
    if (payload.id) return String(payload.id).trim()
    if (idStrategy === 'slug') {
      const base = slugify(payload.name || payload.title) || idPrefix.toLowerCase()
      let id = base
      let i = 2
      while (items.some((r) => r.id === id)) id = `${base}-${i++}`
      return id
    }
    return nextId(items, idPrefix || name.slice(0, 3).toUpperCase())
  }

  return {
    list: async () => all(),
    get: async (id) => all().find((r) => r.id === id) || null,
    create: async (payload) => {
      const items = all()
      const row = { ...payload, id: makeId(payload, items), createdAt: new Date().toISOString() }
      save([row, ...items])
      return row
    },
    update: async (id, patch) => {
      const items = all()
      const i = items.findIndex((r) => r.id === id)
      if (i === -1) throw new Error('Not found')
      const row = { ...items[i], ...patch, id, updatedAt: new Date().toISOString() }
      items[i] = row
      save(items)
      return row
    },
    remove: async (id) => {
      save(all().filter((r) => r.id !== id))
      return { ok: true }
    },
    bulk: async (rows) => {
      let items = all()
      const added = rows.map((p) => {
        const row = { ...p, id: makeId(p, items), createdAt: new Date().toISOString() }
        items = [row, ...items]
        return row
      })
      save(items)
      return added
    },
  }
}

export const productsStore         = resource('products',        PRODUCTS,         { idPrefix: 'LV', idStrategy: 'auto' })
export const categoriesStore       = resource('categories',      CATEGORIES,       { idStrategy: 'slug' })
export const editTagsStore         = resource('editTags',        EDIT_TAGS,        { idStrategy: 'slug' })
export const journalStore          = resource('journal',         JOURNAL,          { idStrategy: 'slug' })
export const bannersStore          = resource('banners',         BANNERS,          { idStrategy: 'slug' })
export const enquiriesStore        = resource('enquiries',       ENQUIRIES,        { idPrefix: 'ENQ', idStrategy: 'auto' })
export const ordersStore           = resource('orders',          ORDERS,           { idPrefix: 'LVO', idStrategy: 'auto' })
export const customersStore        = resource('customers',       CUSTOMERS,        { idPrefix: 'LVC', idStrategy: 'auto' })
export const paymentsStore         = resource('payments',        PAYMENTS,         { idPrefix: 'LVP', idStrategy: 'auto' })
export const inSituStore           = resource('inSitu',          IN_SITU,          { idStrategy: 'slug' })
export const materialsStore        = resource('materials',       MATERIALS,        { idStrategy: 'slug' })
export const craftPrinciplesStore  = resource('craftPrinciples', CRAFT_PRINCIPLES, { idStrategy: 'slug' })
export const ownershipPillarsStore = resource('ownershipPillars', OWNERSHIP_PILLARS, { idStrategy: 'slug' })

// ---- Auth / user / settings -------------------------------------------------

const USER_KEY = PREFIX + 'user'
const SESSION_KEY = PREFIX + 'session'
const SETTINGS_KEY = PREFIX + 'settings'

// Hardcoded admin credentials. Stored in-source — any changes here
// take effect on next page load since the user never came from an API.
const CREDENTIALS = {
  email: 'admin@theluxeversion.com',
  password: 'Luxe@2026',
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (raw) {
    try { return JSON.parse(raw) } catch {}
  }
  const seeded = { ...DEFAULT_USER }
  localStorage.setItem(USER_KEY, JSON.stringify(seeded))
  return seeded
}

export function updateUser(patch) {
  const current = getUser()
  const next = { ...current, ...patch }
  localStorage.setItem(USER_KEY, JSON.stringify(next))
  return next
}

export function login(email, password) {
  if (email !== CREDENTIALS.email || password !== CREDENTIALS.password) {
    throw new Error('Invalid email or password')
  }
  const user = getUser()
  localStorage.setItem(SESSION_KEY, '1')
  return { token: 'luxe-session', user }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export function hasSession() {
  return localStorage.getItem(SESSION_KEY) === '1'
}

export function getSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (raw) {
    try { return JSON.parse(raw) } catch {}
  }
  const seeded = { ...DEFAULT_SETTINGS }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(seeded))
  return seeded
}

export function updateSettings(patch) {
  const current = getSettings()
  const next = { ...current, ...patch }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
  return next
}

// ---- House content singleton -----------------------------------------------
// Section headers for Materials and Craft, plus the brand story block.
// A single JSON blob rather than a resource list since there's only one.

const HOUSE_CONTENT_KEY = PREFIX + 'houseContent'

export function getHouseContent() {
  const raw = localStorage.getItem(HOUSE_CONTENT_KEY)
  if (raw) {
    try { return { ...DEFAULT_HOUSE_CONTENT, ...JSON.parse(raw) } } catch {}
  }
  const seeded = { ...DEFAULT_HOUSE_CONTENT }
  localStorage.setItem(HOUSE_CONTENT_KEY, JSON.stringify(seeded))
  return seeded
}

export function updateHouseContent(patch) {
  const current = getHouseContent()
  const next = { ...current, ...patch }
  localStorage.setItem(HOUSE_CONTENT_KEY, JSON.stringify(next))
  return next
}

// ---- Utility: wipe & reseed everything --------------------------------------

export function resetAllData() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k))
}
