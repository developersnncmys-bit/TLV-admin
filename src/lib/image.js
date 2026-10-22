// Image helpers for the admin panel.
//
// Uploads go to the TLV backend (POST /api/uploads/image), which stores
// them in Cloudinary and returns a secure URL. The URL is what's saved
// on the row — not a data URL. We still downscale on the client first so
// we don't ship a 20 MB phone photo to the server untouched.

import { uploadImageToBackend } from '../api/uploads.js'

export const isImageSrc = (v) =>
  typeof v === 'string' && (v.startsWith('data:image') || v.startsWith('http') || v.startsWith('/'))

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // mirrors the backend's multer cap

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

// Downscale via <canvas>: keep aspect ratio, cap the longest edge at
// `maxEdge`, re-encode as JPEG. Returns a Blob, or null if no scaling
// was needed (caller should upload the original File in that case).
async function downscaleToBlob(file, maxEdge = 1800, quality = 0.85) {
  const dataUrl = await readAsDataURL(file)
  const img = await new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Image decode failed'))
    el.src = dataUrl
  })

  if (Math.max(img.width, img.height) <= maxEdge) return null

  const scale = maxEdge / Math.max(img.width, img.height)
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  return await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality),
  )
}

// Uploads `file` to Cloudinary via the backend and returns the secure URL.
// `folder` is an optional subfolder appended to the backend's CLOUDINARY_UPLOAD_FOLDER.
export async function uploadImage(file, { folder } = {}) {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('Please pick an image file')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Image is too large — pick one under 10 MB')
  }

  let toSend = file
  try {
    const shrunk = await downscaleToBlob(file)
    if (shrunk) {
      // Preserve the original filename stem so Cloudinary's public_id is readable.
      const stem = (file.name || 'image').replace(/\.[^.]+$/, '')
      toSend = new File([shrunk], `${stem}.jpg`, { type: 'image/jpeg' })
    }
  } catch {
    // Downscale is best-effort — fall through and upload the original.
  }

  const { url } = await uploadImageToBackend(toSend, { folder })
  return url
}
