import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

type Body = { blockId?: string }

function json(data: unknown, status = 200) {
  const response = NextResponse.json(data, { status })
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

async function readBody(request: Request): Promise<Body> {
  try {
    return await request.json() as Body
  } catch {
    return {}
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ error: 'not_authenticated' }, 401)

  const body = await readBody(request)
  if (!body.blockId) return json({ error: 'block_id_required' }, 400)

  const { data: block } = await supabase
    .from('content_blocks')
    .select('id')
    .eq('id', body.blockId)
    .maybeSingle()

  if (!block) return json({ error: 'content_not_available' }, 403)

  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('content_block_id', body.blockId)
    .maybeSingle()

  if (existing) return json({ ok: true, bookmarked: true })

  const { error } = await supabase.from('bookmarks').insert({
    user_id: user.id,
    question_id: null,
    content_block_id: body.blockId,
    source: 'manual',
    category: 'review',
  })

  if (error && error.code !== '23505') return json({ error: 'bookmark_save_failed' }, 400)
  return json({ ok: true, bookmarked: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ error: 'not_authenticated' }, 401)

  const body = await readBody(request)
  if (!body.blockId) return json({ error: 'block_id_required' }, 400)

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', user.id)
    .eq('content_block_id', body.blockId)

  if (error) return json({ error: 'bookmark_delete_failed' }, 400)
  return json({ ok: true, bookmarked: false })
}
