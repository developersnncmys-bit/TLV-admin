// Fetch wrapper for the TLV backend. Reads VITE_API_URL at build time
// (Vite inlines import.meta.env values), falls back to localhost:4000
// so dev with the default backend "just works" even without an .env.
//
// Attaches Authorization: Bearer <token> whenever a token is present
// in localStorage under TOKEN_KEY. The admin reads/writes the token
// through the auth helpers below.

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const TOKEN_KEY = 'luxe_token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message)
    this.status = status
    this.body = body
  }
}

export async function http(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  let data = null
  try { data = await res.json() } catch { /* non-JSON body — ignore */ }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`
    throw new ApiError(res.status, msg, data)
  }
  return data
}
