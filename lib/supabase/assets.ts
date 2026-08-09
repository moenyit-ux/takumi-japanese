import type { SupabaseClient } from '@supabase/supabase-js'

export const LEARNING_ASSET_BUCKET = 'learning-assets'
export const LEARNING_ASSET_PREFIX = `storage://${LEARNING_ASSET_BUCKET}/`

export function isLearningAsset(value: string | null | undefined) {
  return Boolean(value && value.startsWith(LEARNING_ASSET_PREFIX))
}

export function learningAssetPath(value: string) {
  return value.slice(LEARNING_ASSET_PREFIX.length)
}

export async function resolveLearningAsset(supabase: SupabaseClient, value: string | null | undefined) {
  if (!value) return null
  if (!isLearningAsset(value)) return value

  const path = learningAssetPath(value)
  const { data, error } = await supabase.storage.from(LEARNING_ASSET_BUCKET).createSignedUrl(path, 60 * 60)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
