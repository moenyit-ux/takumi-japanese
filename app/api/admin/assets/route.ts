import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { LEARNING_ASSET_BUCKET, LEARNING_ASSET_PREFIX } from '../../../../lib/supabase/assets'

const MAX_BYTES = 20 * 1024 * 1024
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'content_admin' && profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'admin_required' }, { status: 403 })
  }

  const form = await request.formData()
  const sessionId = String(form.get('sessionId') || '')
  const file = form.get('file')

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    return NextResponse.json({ error: 'invalid_session' }, { status: 400 })
  }
  if (!(file instanceof File)) return NextResponse.json({ error: 'file_required' }, { status: 400 })
  if (!MIME_TO_EXT[file.type]) return NextResponse.json({ error: 'unsupported_file_type' }, { status: 400 })
  if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: 'file_too_large' }, { status: 400 })

  const { data: session } = await supabase.from('learning_sessions').select('id').eq('id', sessionId).maybeSingle()
  if (!session) return NextResponse.json({ error: 'session_not_found' }, { status: 404 })

  const ext = MIME_TO_EXT[file.type]
  const path = `sessions/${sessionId}/${crypto.randomUUID()}.${ext}`
  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from(LEARNING_ASSET_BUCKET)
    .upload(path, bytes, { contentType: file.type, cacheControl: '3600', upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message || 'upload_failed' }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    asset: `${LEARNING_ASSET_PREFIX}${path}`,
    originalName: file.name,
    contentType: file.type,
    size: file.size,
  })
}
