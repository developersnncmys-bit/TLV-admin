// Orders — adapter between the backend's nested order shape and the
// flat shape the Orders.jsx page was authored against.
//
// Backend row (abridged):
//   { id, ref, user, items:[{handle,reference,name,qty,unitPrice,lineTotal}],
//     contact:{email,firstName,lastName,phone},
//     shipping:{line1,line2,city,state,postal,country},
//     delivery:{method,cost}, payment:{method,status,fee,reference},
//     extras, subtotal, total, gst, currency, status, notes, createdAt }
//
// Admin page expects:
//   { id, ref, customer:{name,email,phone,city}, items:[{productId,name,reference,qty,price}],
//     itemsCount, amount, currency, payment: '<status>', status, shippingAddress: '<string>',
//     notes, createdAt }

import { http } from './http.js'

const fmtAddress = (s) => {
  if (!s) return ''
  const parts = [s.line1, s.line2, s.city, s.state, s.postal, s.country].filter(Boolean)
  return parts.join(', ')
}

const fromBackend = (row) => {
  if (!row) return row
  const items = (row.items || []).map((it) => ({
    productId: it.reference || it.handle || '',
    name: it.name,
    reference: it.reference || '',
    qty: it.qty,
    price: it.unitPrice,
  }))
  return {
    id: row.id,
    ref: row.ref,
    customer: {
      name: [row.contact?.firstName, row.contact?.lastName].filter(Boolean).join(' ').trim(),
      email: row.contact?.email || '',
      phone: row.contact?.phone || '',
      city: row.shipping?.city || '',
    },
    items,
    itemsCount: items.reduce((a, i) => a + (i.qty || 0), 0),
    amount: row.total ?? row.subtotal ?? 0,
    currency: row.currency || 'INR',
    payment: row.payment?.status || 'pending',
    status: row.status || 'placed',
    shippingAddress: fmtAddress(row.shipping),
    notes: row.notes || '',
    createdAt: row.createdAt,
  }
}

// Minimum payload for the admin "quick add order" flow — single product,
// customer name + city, amount override. Everything else falls back to
// safe defaults. The storefront flow is the one that captures the full
// contact + shipping details; this is for logging a studio-floor sale.
const toBackend = (form, productsIndex) => {
  const product = productsIndex.get(form.productId) || null
  const handle = product?.handle || form.productId
  const unitPrice = Number(form.amount) / (Number(form.qty) || 1)
  return {
    items: [
      {
        handle,
        qty: Number(form.qty) || 1,
        unitPrice,
        lineTotal: Number(form.amount),
      },
    ],
    contact: {
      email: form.customer?.email || 'studio@theluxeversion.com',
      firstName: (form.customer?.name || 'Studio sale').split(' ')[0] || 'Studio',
      lastName: (form.customer?.name || '').split(' ').slice(1).join(' '),
      phone: form.customer?.phone || '',
    },
    shipping: {
      line1: form.shippingAddress || '—',
      city: form.customer?.city || '',
      state: '',
      postal: '',
      country: 'India',
    },
    payment: { method: 'other' },
    notes: form.notes || '',
  }
}

async function list() {
  const data = await http('/api/orders?limit=200')
  return (data?.items || []).map(fromBackend)
}

async function get(id) {
  return fromBackend(await http(`/api/orders/${encodeURIComponent(id)}`))
}

async function create(form) {
  // Pull product catalog so we can resolve productId → handle. Caller
  // may have already loaded products; we do a fresh fetch to be safe.
  const prodData = await http('/api/products?limit=200')
  const index = new Map((prodData?.items || []).map((p) => [p.reference || p.id, p]))
  const body = toBackend(form, index)
  return fromBackend(await http('/api/orders', { method: 'POST', body }))
}

async function update(id, patch) {
  // The admin's inline edits are typically to `status`, `payment` (string)
  // or `notes`. Translate payment-as-string back to {payment:{status}}.
  const body = {}
  if (patch.status) body.status = patch.status
  if (typeof patch.payment === 'string') body.payment = { status: patch.payment }
  if (patch.notes !== undefined) body.notes = patch.notes
  return fromBackend(await http(`/api/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body }))
}

async function remove(id) {
  await http(`/api/orders/${encodeURIComponent(id)}`, { method: 'DELETE' })
  return { id }
}

async function bulk(rows) {
  const out = []
  for (const row of rows || []) out.push(await create(row))
  return out
}

export const ordersHttp = { list, get, create, update, remove, bulk }
