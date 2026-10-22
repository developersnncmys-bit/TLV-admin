// Video upload helper for the admin panel.
//
// Mirrors lib/image.js, but no client-side transcoding — browsers can't
// re-encode video reliably, and the backend hands straight to Cloudinary.
// Validate the MIME type + size on the client to fail fast, then upload.

import { uploadVideoToBackend } from '../api/uploads.js'

export const isVideoSrc = (v) =>
  typeof v === 'string' && (v.startsWith('http') || v.startsWith('/'))

// Mirrors the backend's multer cap (routes/upload.routes.js → videoUpload).
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024

export async function uploadVideo(file, { folder } = {}) {
  if (!file || !file.type?.startsWith('video/')) {
    throw new Error('Please pick a video file (mp4, webm, mov)')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Video is too large — pick one under 100 MB')
  }

  const { url } = await uploadVideoToBackend(file, { folder })
  return url
}
