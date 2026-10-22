// Posts a file to the TLV backend's Cloudinary-backed upload endpoint
// and returns the resulting secure URL. Requires an admin token.

import { API_BASE, getToken, ApiError } from './http.js'

export async function uploadImageToBackend(file, { folder } = {}) {
  return uploadFileToBackend(file, { folder, kind: 'image' })
}

export async function uploadVideoToBackend(file, { folder } = {}) {
  return uploadFileToBackend(file, { folder, kind: 'video' })
}

// Shared transport. `kind` picks both the multipart field name AND the
// backend route — the two must agree with the multer config on the server.
async function uploadFileToBackend(file, { folder, kind }) {
  const field = kind // 'image' or 'video' — matches multer.single(field)
  const route = kind === 'video' ? '/api/uploads/video' : '/api/uploads/image'
  const fallbackName = kind === 'video' ? 'video' : 'image'

  const form = new FormData()
  form.append(field, file, file.name || fallbackName)
  if (folder) form.append('folder', folder)

  const token = getToken()
  const res = await fetch(`${API_BASE}${route}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })

  let data = null
  try { data = await res.json() } catch { /* non-JSON — ignore */ }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Upload failed (${res.status})`
    throw new ApiError(res.status, msg, data)
  }

  if (!data?.url) throw new ApiError(500, 'Upload succeeded but no URL returned', data)
  return data
}
