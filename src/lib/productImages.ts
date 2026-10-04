import { requestProductImageUpload } from './api'
import { supabase } from './supabase'

export const productImageBucket = 'product-images'
export const maxProductImageBytes = 5 * 1024 * 1024

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
export function validateProductImage(file: File) {
  if (!allowedImageTypes.has(file.type)) throw new Error('Please choose a JPG, PNG, WebP or AVIF image.')
  if (file.size > maxProductImageBytes) throw new Error('Images must be 5 MB or smaller.')
}

export async function uploadProductImage(file: File) {
  if (!supabase) throw new Error('Image upload is not configured.')
  validateProductImage(file)

  const authorization = await requestProductImageUpload({ fileName: file.name, contentType: file.type, sizeBytes: file.size })
  if (!authorization.uploadUrl || !authorization.token || !authorization.path || !authorization.publicUrl) {
    throw new Error('The image upload authorization response was incomplete.')
  }

  const { error } = await supabase.storage.from(productImageBucket).uploadToSignedUrl(authorization.path, authorization.token, file, {
    cacheControl: '31536000',
    contentType: file.type,
  })
  if (error) throw new Error(`Image upload failed: ${error.message || 'The image could not be uploaded.'}`)

  return authorization.publicUrl
}
