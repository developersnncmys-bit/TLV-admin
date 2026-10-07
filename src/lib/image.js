// Image helpers for the standalone (API-less) admin.
//
// Uploads are read client-side into a base64 data URL and stored
// directly on the row. No remote upload, no backend. Images persist
// in localStorage like any other field. Large galleries will bloat
// storage, so uploads are size-capped and optionally downscaled.

export const isImageSrc = (v) =>
  typeof v === 'string' && (v.startsWith('data:image') || v.startsWith('http') || v.startsWith('/'))

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB per image after encoding

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

// Downscale an image via <canvas>. Keeps aspect ratio, caps the
// longest edge at `maxEdge` px, re-encodes as JPEG at the given
// quality. Returns a data: URL.
async function downscale(dataUrl, maxEdge = 1600, quality = 0.82) {
  const img = await new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Image decode failed'))
    el.src = dataUrl
  })
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
  if (scale >= 1) return dataUrl
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}

export async function uploadImage(file) {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('Please pick an image file')
  }
  const raw = await readAsDataURL(file)
  const shrunk = await downscale(raw).catch(() => raw)
  if (shrunk.length > MAX_BYTES * 1.4) {
    throw new Error('Image is too large after compression — try a smaller file')
  }
  return shrunk
}
